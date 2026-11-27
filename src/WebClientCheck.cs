using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller;
using Microsoft.Extensions.Logging;

namespace Siphonophore.Stolon;

/// <summary>
/// Checks a web client shell page against the installed web client at startup. It warns about any class the page uses that the web client
/// lacks, and about a web client that changed since the plugin last saw it, the cue to run the parity check.
/// </summary>
/// <remarks>
/// The shell's markup is a copy of the web client's, styled by the web client's own stylesheets. An update that renames a class leaves that
/// part unstyled, and nothing else would say so.
/// </remarks>
public static partial class WebClientCheck
{
    /// <summary>
    /// The web client's classes the shell template and Stolon's markup builders use, so each plugin's check covers them too.
    /// A test keeps this list the same as the classes the builders write.
    /// </summary>
    internal static readonly string[] ShellClasses =
    [
        "backdropContainer", "backdropImage", "backgroundContainer", "skinHeader", "padded-left", "padded-right", "paper-icon-button-light", "raised",
        "block", "btnOption", "btnUserRating", "button-delete", "button-flat", "button-flat-mini", "button-link", "button-submit", "card", "card-hoverable",
        "card-withuserdata", "cardBox", "cardBox-bottompadded", "cardImageContainer", "cardImageIcon", "cardIndicators", "cardOverlayButton",
        "cardOverlayButton-br", "cardOverlayButton-hover", "cardOverlayButtonIcon", "cardOverlayButtonIcon-hover", "cardOverlayContainer",
        "cardOverlayFab-primary", "cardPadder", "cardPadder-overflowPortrait", "cardPadder-portrait", "cardScalable", "cardText", "cardText-first",
        "cardText-secondary", "cardTextCentered", "checkboxContainer", "checkboxContainer-withDescription", "checkboxFieldDescription",
        "checkboxIcon", "checkboxIcon-checked", "checkboxIcon-unchecked", "checkboxLabel", "checkboxList", "checkboxList-paperList",
        "checkboxListContainer", "checkboxListLabel", "checkboxOutline", "coveredImage", "defaultCardBackground1", "defaultCardBackground2",
        "defaultCardBackground3", "defaultCardBackground4", "defaultCardBackground5", "detailButton", "detailButton-content", "detailButton-icon",
        "detailsGroupItem", "dialog", "dialog-fixedSize", "dialog-fullscreen-lowres", "dialog-small", "emby-button", "emby-checkbox",
        "emby-checkbox-label", "emby-scrollbuttons", "emby-scrollbuttons-button", "emby-scroller", "emby-scroller-container", "emby-select",
        "emby-select-withcolor", "emby-textarea", "fieldDescription", "flex", "focuscontainer", "focuscontainer-x", "formDialog",
        "formDialogContent", "formDialogFooter", "formDialogFooter-clear", "formDialogFooter-flex", "formDialogFooterItem",
        "formDialogFooterItem-autosize", "formDialogHeader", "formDialogHeader-clear", "fullInnerCardFooter", "hiddenScrollX", "indicator",
        "indicatorIcon", "innerCardFooter", "innerCardFooterClear", "inputContainer", "itemAction", "itemName", "itemProgressBar",
        "itemProgressBarForeground", "itemsContainer", "material-icons", "mdl-spinner__circle", "mdl-spinner__circle-clipper",
        "mdl-spinner__circleLeft", "mdl-spinner__circleRight", "mdl-spinner__layer", "mdl-spinner__left", "mdl-spinner__right",
        "mediaInfoAttribute", "mediaInfoContent", "mediaInfoCriticRating", "mediaInfoCriticRatingFresh", "mediaInfoCriticRatingRotten",
        "mediaInfoItem", "mediaInfoLabel", "mediaInfoOfficialRating", "mediaInfoSource", "mediaInfoStream", "mediaInfoStreamType", "mediaInfoText",
        "more", "overflowPortraitCard", "padded-bottom-focusscale", "padded-top-focusscale", "paperList", "playedIndicator", "portraitCard",
        "ratingbutton-icon-withrating", "ratingbutton-withrating", "scrollSlider", "scrollX", "searchSuggestions", "searchSuggestionsList",
        "secondaryText", "sectionTitle", "sectionTitle-cards", "sectionTitleContainer", "sectionTitleContainer-cards", "sectionTitleTextButton",
        "selectArrow", "selectArrowContainer", "selectContainer", "selectLabel", "starIcon", "starRatingContainer", "textActionButton",
        "textareaLabel", "textareaLabelUnfocused", "toast", "toastContainer", "toastHide", "toastVisible", "verticalSection", "vertical-wrap"
    ];

    /// <summary>
    /// Runs the check in the background and logs what it finds: a warning for each class the web client lacks, a warning when the
    /// web client changed since the last start, and a warning when its details page template lacks a part, so Stolon's copy stands in.
    /// A plugin calls it once from its startup service, and it never throws.
    /// </summary>
    /// <param name="paths">The server's paths, for the web client's folder and the plugin configuration folder.</param>
    /// <param name="logger">The plugin's logger.</param>
    /// <param name="pageName">The page's name for the log, such as <c>request page</c>, and for the file that keeps the build last seen.</param>
    /// <param name="markup">The plugin's own markup and scripts for the page, whose <c>class="..."</c> attributes are checked as <see cref="ClassesToCheck"/> reads them, or <c>null</c>.</param>
    /// <param name="classes">The web client's classes the plugin builds from parts, which reading its markup cannot see, or <c>null</c>. They are always checked.</param>
    /// <param name="checkDetailsTemplate">Whether the page uses the details page template.</param>
    /// <param name="cancellationToken">Stops the check.</param>
    /// <returns>A task that completes once the check is done.</returns>
    public static Task RunAsync(
        IServerApplicationPaths paths,
        ILogger logger,
        string pageName,
        string? markup = null,
        IEnumerable<string>? classes = null,
        bool checkDetailsTemplate = false,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(paths);
        ArgumentNullException.ThrowIfNull(logger);
        ArgumentException.ThrowIfNullOrEmpty(pageName);
        var list = classes?.ToList();
        return Task.Run(() => Run(paths, logger, pageName, markup, list, checkDetailsTemplate, cancellationToken), cancellationToken);
    }

    /// <summary>
    /// Lists the classes the <c>class="..."</c> attributes of some markup name. A class joined to an expression inside a script string, such
    /// as <c>'card ' + shape</c>, is left out, since it is only part of a name.
    /// </summary>
    /// <param name="markup">The markup, which may hold scripts.</param>
    /// <returns>The classes, each once, sorted.</returns>
    public static IReadOnlyList<string> ClassesIn(string markup)
    {
        ArgumentNullException.ThrowIfNull(markup);
        var used = new SortedSet<string>(StringComparer.Ordinal);
        var names = ClassAttribute().Matches(markup)
            .SelectMany(attribute => SplitJoined(attribute.Groups[1].Value))
            .SelectMany(part => part.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Where(name => ClassName().IsMatch(name));
        used.UnionWith(names);

        return used.ToList();
    }

    /// <summary>
    /// Lists the classes of some markup to check against the web client: those <see cref="ClassesIn"/> finds, less the page's own.
    /// A page's own class is one its own <c>&lt;style&gt;</c> blocks style, or one its scripts only look up, such as with <c>querySelector('.myplugin-row')</c>.
    /// </summary>
    /// <remarks>
    /// A class Stolon's shell list or <paramref name="webClientClasses"/> names is always kept, so a web client class the page restyles is still checked.
    /// Name any other web client class the page restyles or looks up in <paramref name="webClientClasses"/>.
    /// </remarks>
    /// <param name="markup">The markup, which may hold styles and scripts.</param>
    /// <param name="webClientClasses">Classes the plugin knows are the web client's, or <c>null</c>.</param>
    /// <returns>The classes, each once, sorted.</returns>
    public static IReadOnlyList<string> ClassesToCheck(string markup, IEnumerable<string>? webClientClasses = null)
    {
        ArgumentNullException.ThrowIfNull(markup);
        var known = new HashSet<string>(ShellClasses, StringComparer.Ordinal);
        known.UnionWith(webClientClasses ?? []);
        var own = new HashSet<string>(StringComparer.Ordinal);
        foreach (Match style in StyleBlock().Matches(markup))
        {
            own.UnionWith(CssClass().Matches(style.Groups[1].Value).Select(m => m.Groups[1].Value));
        }

        foreach (Match lookup in SelectorLookup().Matches(markup))
        {
            own.UnionWith(CssClass().Matches(lookup.Groups[2].Value).Select(m => m.Groups[1].Value));
        }

        return ClassesIn(markup).Where(c => known.Contains(c) || !own.Contains(c)).ToList();
    }

    /// <summary>
    /// Lists the classes the installed web client neither styles nor writes in its own scripts. Stolon's own classes and Material UI's,
    /// which it builds at runtime, are never missing.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <param name="classes">The classes to look for.</param>
    /// <returns>The missing classes, sorted, or empty when there is no web client to check against.</returns>
    public static IReadOnlyList<string> MissingClasses(string? webPath, IEnumerable<string> classes)
    {
        ArgumentNullException.ThrowIfNull(classes);
        if (string.IsNullOrEmpty(webPath) || !Directory.Exists(webPath))
        {
            return [];
        }

        var css = new StringBuilder();
        foreach (var file in Directory.EnumerateFiles(webPath, "*.css", SearchOption.AllDirectories))
        {
            css.Append(File.ReadAllText(file)).Append('\n');
        }

        var index = Path.Join(webPath, "index.html");
        if (File.Exists(index))
        {
            css.Append(WebClientAssets.IndexStyle(File.ReadAllText(index)));
        }

        var scripts = Directory.EnumerateFiles(webPath, "*.js", SearchOption.AllDirectories).Select(File.ReadAllText);
        return Missing(classes, css.ToString(), scripts);
    }

    /// <summary>
    /// Lists the classes neither the stylesheets nor the scripts know.
    /// </summary>
    /// <param name="classes">The classes to look for.</param>
    /// <param name="webCss">Every stylesheet of the web client.</param>
    /// <param name="webScripts">Its scripts, read one at a time and only while a class is still unaccounted for.</param>
    /// <returns>The missing classes, sorted.</returns>
    internal static IReadOnlyList<string> Missing(IEnumerable<string> classes, string webCss, IEnumerable<string> webScripts)
    {
        var known = new HashSet<string>(CssClass().Matches(webCss).Select(m => m.Groups[1].Value), StringComparer.Ordinal);
        var missing = classes
            .Distinct(StringComparer.Ordinal)
            .Where(c => !known.Contains(c) && !c.StartsWith("Mui", StringComparison.Ordinal) && !c.StartsWith("stolon-", StringComparison.Ordinal))
            .Order(StringComparer.Ordinal)
            .ToList();
        foreach (var script in webScripts)
        {
            if (missing.Count == 0)
            {
                break;
            }

            missing.RemoveAll(c => ContainsWord(script, c));
        }

        return missing;
    }

    /// <summary>
    /// Notes the web client build in a file and says whether it changed since the build noted last. The first time only notes it.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <param name="storePath">The file that keeps the build last seen.</param>
    /// <param name="logger">A logger for a store that cannot be read, or <c>null</c>.</param>
    /// <returns>The build before and now when it changed, or <c>null</c> when it did not, it is the first time, or there is no web client.</returns>
    internal static (string Was, string Now)? NoteBuild(string? webPath, string storePath, ILogger? logger)
    {
        if (string.IsNullOrEmpty(webPath))
        {
            return null;
        }

        var index = Path.Join(webPath, "index.html");
        if (!File.Exists(index))
        {
            return null;
        }

        var now = WebClientAssets.Fingerprint(File.ReadAllText(index));
        var store = new JsonFileStore<SeenBuild>(storePath, logger);
        var was = store.Load().Fingerprint;
        if (was == now)
        {
            return null;
        }

        store.Save(new SeenBuild { Fingerprint = now });
        return string.IsNullOrEmpty(was) ? null : (was, now);
    }

    private static void Run(IServerApplicationPaths paths, ILogger logger, string pageName, string? markup, List<string>? classes, bool checkDetailsTemplate, CancellationToken cancellationToken)
    {
        var name = FormatUtilities.SanitizeForLog(pageName);
        try
        {
            var web = paths.WebPath;
            if (string.IsNullOrEmpty(web) || !Directory.Exists(web))
            {
                logger.LogDebug("No web client to check the {Page} against", name);
                return;
            }

            var file = Path.Join(paths.PluginConfigurationsPath, "stolon-webclient-" + FileNameSanitizer.Sanitize(pageName.Replace(' ', '-')) + ".json");
            if (NoteBuild(web, file, logger) is { } changed)
            {
                logger.LogWarning(
                    "The web client changed from build {Was} to {Now} since the {Page} was last compared with it, so run the parity check",
                    changed.Was,
                    changed.Now,
                    name);
            }

            cancellationToken.ThrowIfCancellationRequested();
            var used = ShellClasses.Concat(markup is null ? [] : ClassesToCheck(markup, classes)).Concat(classes ?? []).ToList();
            var missing = MissingClasses(web, used);
            if (missing.Count > 0)
            {
                logger.LogWarning(
                    "The {Page} uses classes this web client lacks, so parts of it may look off until the plugin is updated: {Classes}",
                    name,
                    FormatUtilities.SanitizeForLog(string.Join(", ", missing), 4000));
            }

            logger.LogDebug("Checked {Count} classes of the {Page} against the web client", used.Distinct(StringComparer.Ordinal).Count(), name);
            if (checkDetailsTemplate)
            {
                var template = WebClientDetailsTemplate.Find(web);
                if (template is null)
                {
                    logger.LogWarning("The web client has no details page template, so the {Page} uses Stolon's copy", name);
                }
                else if (WebClientDetailsTemplate.Missing(template) is { Count: > 0 } parts)
                {
                    logger.LogWarning("The web client's details page template lacks {Parts}, so the {Page} uses Stolon's copy", string.Join(", ", parts), name);
                }
            }
        }
        catch (OperationCanceledException)
        {
            logger.LogDebug("The web client check of the {Page} was cancelled", name);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Could not read the web client to check the {Page} against it", name);
        }
    }

    // The parts of a class attribute's value that are whole names. In a script, 'card ' + shape + 'Card' joins names to expressions.
    private static IEnumerable<string> SplitJoined(string value)
    {
        var parts = value.Split('\'');
        for (var i = 0; i < parts.Length; i += 2)
        {
            var text = parts[i];
            if (i + 1 < parts.Length && text.Length > 0 && !char.IsWhiteSpace(text[^1]))
            {
                var cut = text.LastIndexOf(' ');
                text = cut < 0 ? string.Empty : text[..cut];
            }

            if (i > 0 && text.Length > 0 && !char.IsWhiteSpace(text[0]))
            {
                var cut = text.IndexOf(' ', StringComparison.Ordinal);
                text = cut < 0 ? string.Empty : text[cut..];
            }

            yield return text;
        }
    }

    // The name on its own, not inside a longer one, so itemAction does not count as itemActions.
    private static bool ContainsWord(string text, string name)
    {
        for (var at = text.IndexOf(name, StringComparison.Ordinal); at >= 0; at = text.IndexOf(name, at + 1, StringComparison.Ordinal))
        {
            var end = at + name.Length;
            if ((at == 0 || !IsNamePart(text[at - 1])) && (end == text.Length || !IsNamePart(text[end])))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsNamePart(char c) => char.IsLetterOrDigit(c) || c is '-' or '_';

    [GeneratedRegex(@"class=""([^""]*)""")]
    private static partial Regex ClassAttribute();

    [GeneratedRegex(@"^[A-Za-z_][\w-]*$")]
    private static partial Regex ClassName();

    [GeneratedRegex(@"\.(-?[A-Za-z_][\w-]*)")]
    private static partial Regex CssClass();

    [GeneratedRegex(@"<style[^>]*>([\s\S]*?)</style>", RegexOptions.IgnoreCase)]
    private static partial Regex StyleBlock();

    // The selector a script finds elements by, such as querySelectorAll('.row .name') or closest(".row").
    [GeneratedRegex(@"\b(?:querySelector|querySelectorAll|closest|matches)\(\s*(['""`])([^'""`]*)\1")]
    private static partial Regex SelectorLookup();

    /// <summary>The web client build a plugin last saw.</summary>
    internal sealed class SeenBuild
    {
        /// <summary>Gets or sets its fingerprint.</summary>
        public string Fingerprint { get; set; } = string.Empty;
    }
}
