using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Authentication;
using System.Text;
using System.Threading.Tasks;
using Jellyfin.Data;
using Jellyfin.Database.Implementations.Enums;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Siphonophore.Stolon;

/// <summary>
/// Who may open a hosted page. The page script checks it in the browser, and the plugin's API enforces it.
/// </summary>
public enum HostedPageAccess
{
    /// <summary>Anyone with the link, signed in or not, such as an invite page.</summary>
    Anyone,

    /// <summary>Any signed in user. The page's API calls carry <c>[Authorize]</c>.</summary>
    User,

    /// <summary>Administrators only. The page's API calls carry <c>[Authorize(Policy = HostedPage.AdministratorPolicy)]</c>.</summary>
    Administrator,

    /// <summary>
    /// The signed in users the plugin names in <see cref="HostedPage.AllowedUsers"/>, and every administrator. The page's API calls carry
    /// <c>[Authorize]</c> and check <see cref="HostedPage.AllowsAsync"/>.
    /// </summary>
    SelectedUsers
}

/// <summary>
/// The frame a hosted page is drawn in.
/// </summary>
public enum HostedPageFrame
{
    /// <summary>The user page frame from the <c>page</c> template, Stolon's own look, which needs no signed in viewer.</summary>
    UserPage,

    /// <summary>
    /// The web client shell from the <c>webclient</c> template, which loads the installed web client's stylesheets and fonts and draws its
    /// app bar, user menu, and drawer, so the page looks like Jellyfin itself.
    /// </summary>
    WebClient
}

/// <summary>
/// A page a plugin serves at a root path of the server, such as <c>/invites/{code}</c>, in the user page frame from the <c>page</c> template,
/// or in the web client shell from the <c>webclient</c> template. It is declared once, with the plugin's prefix, who may open it, and its
/// content, and a controller action serves it.
/// </summary>
/// <remarks>
/// The page links the plugin's shared Stolon CSS and JS, the web client's favicon and icon font, and a base address
/// relative to the request path, so every link works under a base path or a reverse proxy.
/// </remarks>
public sealed class HostedPage
{
    /// <summary>
    /// The name of Jellyfin's policy for administrators, for an <c>[Authorize]</c> attribute on an administrator page's API calls.
    /// </summary>
    public const string AdministratorPolicy = "RequiresElevation";

    private readonly HostedPageContent _content;

    /// <summary>
    /// Initializes a new instance of the <see cref="HostedPage"/> class.
    /// </summary>
    /// <param name="prefix">The plugin's prefix for its shared pages, the same one it passes to <c>GetSharedPages</c>.</param>
    /// <param name="access">Who may open the page.</param>
    /// <param name="content">What the page serves inside its frame.</param>
    public HostedPage(string prefix, HostedPageAccess access, HostedPageContent content)
    {
        ArgumentException.ThrowIfNullOrEmpty(prefix);
        ArgumentNullException.ThrowIfNull(content);
        Prefix = prefix;
        Access = access;
        _content = content;
    }

    /// <summary>Gets the plugin's prefix for its shared pages, the same one it passes to <c>GetSharedPages</c>.</summary>
    public string Prefix { get; }

    /// <summary>Gets who may open the page.</summary>
    public HostedPageAccess Access { get; }

    /// <summary>Gets the document title. The server's name is used when it is <c>null</c>.</summary>
    public string? Title { get; init; }

    /// <summary>Gets the plugin's mark, a short name shown in the header beside the server's name, or <c>null</c> for none.</summary>
    public string? Mark { get; init; }

    /// <summary>Gets the Material icon shown before the mark, such as <c>vpn_key</c>, or <c>null</c> for none.</summary>
    public string? MarkIcon { get; init; }

    /// <summary>
    /// Gets the address of the plugin's translations, relative to the server root, such as <c>MyPlugin/Translations</c>, or <c>null</c> for US English.
    /// The page script loads them before it builds anything, so Stolon's default text follows the viewer's language.
    /// </summary>
    public string? Translations { get; init; }

    /// <summary>Gets a value indicating whether the page uses the wide column, for content set side by side such as a QR code beside its steps.</summary>
    public bool Wide { get; init; }

    /// <summary>
    /// Gets the frame the page is drawn in. <see cref="HostedPageFrame.UserPage"/> is the default. <see cref="HostedPageFrame.WebClient"/>
    /// suits a page for signed in viewers, since its bar shows their libraries and user menu. In the shell the mark and its icon name
    /// the page's own entry among the libraries.
    /// </summary>
    public HostedPageFrame Frame { get; init; }

    /// <summary>
    /// Gets a value indicating whether a web client shell page carries the web client's details page template, for
    /// <c>adoptDetailsTemplate</c>. It is the installed web client's own when it has every part, and Stolon's copy otherwise.
    /// </summary>
    public bool DetailsTemplate { get; init; }

    /// <summary>
    /// Gets the address of the page's web app manifest, relative to the server root, such as <c>myplugin/manifest.webmanifest</c>, or
    /// <c>null</c> for none. A web client shell page links it, so a browser offers to install the page as an app.
    /// </summary>
    public string? Manifest { get; init; }

    /// <summary>
    /// Gets the users a <see cref="HostedPageAccess.SelectedUsers"/> page admits, read again on every check so a change to the plugin's
    /// settings applies at once, such as <c>() =&gt; Plugin.Instance.Configuration.InviteManagers</c>. Administrators are always admitted.
    /// With no list, the page admits administrators only.
    /// </summary>
    public Func<IEnumerable<Guid>>? AllowedUsers { get; init; }

    /// <summary>
    /// Gets the address of the plugin's access check, relative to the server root, such as <c>MyPlugin/Invites/Access</c>, or <c>null</c> for none.
    /// The action answers with <see cref="CheckAccessAsync"/>. On a <see cref="HostedPageAccess.SelectedUsers"/> page the script asks it after
    /// sign in, and shows a viewer who is not on the list a message in place of the content.
    /// </summary>
    public string? AccessCheck { get; init; }

    /// <summary>
    /// Says whether a user may open the page and use its API. Anyone admits everyone, User any signed in user, Administrator administrators,
    /// and SelectedUsers administrators and the users in <see cref="AllowedUsers"/>.
    /// </summary>
    /// <param name="userId">The user, or <see cref="Guid.Empty"/> for a caller who is not signed in or signed in with an API key.</param>
    /// <param name="isAdministrator">Whether the user is an administrator.</param>
    /// <returns><c>true</c> when the user is admitted.</returns>
    public bool Allows(Guid userId, bool isAdministrator)
    {
        if (Access == HostedPageAccess.Anyone)
        {
            return true;
        }

        if (userId == Guid.Empty)
        {
            return false;
        }

        return Access switch
        {
            HostedPageAccess.User => true,
            HostedPageAccess.Administrator => isAdministrator,
            _ => isAdministrator || Listed(userId)
        };
    }

    /// <summary>
    /// Says whether the caller of a controller action may use the page's API, from Jellyfin's own reading of the request's token.
    /// An API key names no user, so it is admitted only on an Anyone page.
    /// </summary>
    /// <param name="controller">The controller whose request is checked.</param>
    /// <param name="authorization">Jellyfin's authorization context.</param>
    /// <returns><c>true</c> when the caller is admitted.</returns>
    public async Task<bool> AllowsAsync(ControllerBase controller, IAuthorizationContext authorization)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentNullException.ThrowIfNull(authorization);
        if (Access == HostedPageAccess.Anyone)
        {
            return true;
        }

        AuthorizationInfo info;
        try
        {
            info = await authorization.GetAuthorizationInfo(controller.Request).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is AuthenticationException or SecurityException)
        {
            return false;
        }

        if (info.IsApiKey || info.User is null)
        {
            return false;
        }

        return Allows(info.UserId, info.User.HasPermission(PermissionKind.IsAdministrator));
    }

    /// <summary>
    /// Answers the page's access check: 204 for a caller the page admits, and 403 for anyone else. The action carries <c>[Authorize]</c>,
    /// so a caller who is not signed in gets Jellyfin's own 401 first.
    /// </summary>
    /// <param name="controller">The controller whose request is checked.</param>
    /// <param name="authorization">Jellyfin's authorization context.</param>
    /// <returns>The answer.</returns>
    public async Task<IActionResult> CheckAccessAsync(ControllerBase controller, IAuthorizationContext authorization)
    {
        ArgumentNullException.ThrowIfNull(controller);
        return await AllowsAsync(controller, authorization).ConfigureAwait(false)
            ? controller.NoContent()
            : controller.StatusCode(StatusCodes.Status403Forbidden);
    }

    /// <summary>
    /// Serves the page from a controller action, with the hardening headers, in the language the request asks for.
    /// </summary>
    /// <remarks>
    /// The action carries <c>[AllowAnonymous]</c> for every access, since a browser opening a link sends no Jellyfin token.
    /// The page holds no private data, and its script checks the viewer before it shows the content.
    /// </remarks>
    /// <param name="controller">The controller whose request is answered.</param>
    /// <param name="values">Values for the content's <c>{{KEY}}</c> tokens. Each is HTML encoded, so pass text, never markup.</param>
    /// <returns>The page.</returns>
    public ContentResult Serve(ControllerBase controller, IReadOnlyDictionary<string, string>? values = null)
        => Answer(controller, values, notFound: false);

    /// <summary>
    /// Answers with the not found screen in the page's frame and status code 404, such as for an invite code or an item that does not
    /// exist. The page's content is left out, and the screen shows to every viewer without a sign in.
    /// </summary>
    /// <param name="controller">The controller whose request is answered.</param>
    /// <returns>The not found page.</returns>
    public ContentResult NotFound(ControllerBase controller) => Answer(controller, null, notFound: true);

    private ContentResult Answer(ControllerBase controller, IReadOnlyDictionary<string, string>? values, bool notFound)
    {
        ArgumentNullException.ThrowIfNull(controller);
        var context = controller.HttpContext;
        var services = context.RequestServices;
        var host = services?.GetService(typeof(IServerApplicationHost)) as IServerApplicationHost;
        var paths = services?.GetService(typeof(IServerApplicationPaths)) as IServerApplicationPaths;

        PublicPage.ApplyHardeningHeaders(context.Response);
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Content-Security-Policy"] = "frame-ancestors 'self'";

        var assets = WebClientAssets.For(paths?.WebPath);
        var language = StolonTranslations.RequestLanguage(context.Request);
        var html = Frame == HostedPageFrame.WebClient
            ? RenderShell(
                context.Request.Path,
                host?.FriendlyName,
                host?.SystemId,
                language,
                assets.FaviconHref,
                WebClientAssets.Shell(paths?.WebPath),
                DetailsTemplate && !notFound ? WebClientDetailsTemplate.Load(paths?.WebPath) : null,
                values,
                notFound)
            : Render(context.Request.Path, host?.FriendlyName, language, assets.FaviconHref, assets.IconFace, values, notFound);
        return new ContentResult { Content = html, ContentType = "text/html; charset=utf-8", StatusCode = notFound ? StatusCodes.Status404NotFound : StatusCodes.Status200OK };
    }

    /// <summary>
    /// Writes the server root as an address relative to a request path, such as <c>../</c> for <c>/invites/abc</c> and <c>./</c> for <c>/wireguard</c>.
    /// </summary>
    /// <param name="path">The request path, without the server's base path.</param>
    /// <returns>The relative address, ending in a slash.</returns>
    internal static string RootFor(PathString path)
    {
        var value = path.Value ?? string.Empty;
        var depth = value.Count(c => c == '/');

        if (depth <= 1)
        {
            return "./";
        }

        var root = new StringBuilder();
        for (var i = 1; i < depth; i++)
        {
            root.Append("../");
        }

        return root.ToString();
    }

    /// <summary>
    /// Renders the whole document.
    /// </summary>
    /// <param name="path">The request path, without the server's base path.</param>
    /// <param name="serverName">The server's name, or <c>null</c> when it is not known.</param>
    /// <param name="language">The page's language.</param>
    /// <param name="faviconHref">The web client's favicon, relative to the web folder, or <c>null</c>.</param>
    /// <param name="iconFace">The icon face CSS, or empty.</param>
    /// <param name="values">Values for the content's tokens, encoded here.</param>
    /// <param name="notFound">True to draw the not found screen in place of the content.</param>
    /// <returns>The document.</returns>
    internal string Render(PathString path, string? serverName, string language, string? faviconHref, string iconFace, IReadOnlyDictionary<string, string>? values, bool notFound = false)
    {
        if (Frame == HostedPageFrame.WebClient)
        {
            return RenderShell(path, serverName, null, language, faviconHref, WebClientAssets.Shell(null), null, values, notFound);
        }

        var server = string.IsNullOrWhiteSpace(serverName) ? "Jellyfin" : serverName;
        var mark = string.IsNullOrEmpty(Mark)
            ? string.Empty
            : "<span class=\"stolon-user-page-mark stolon-icon-text\">"
                + (string.IsNullOrEmpty(MarkIcon) ? string.Empty : "<span class=\"material-icons\" aria-hidden=\"true\">" + WebUtility.HtmlEncode(MarkIcon) + "</span>")
                + "<span>" + WebUtility.HtmlEncode(Mark) + "</span></span>";

        return TemplateLoader.Fill("page", new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["LANGUAGE"] = WebUtility.HtmlEncode(language),
            ["ROOT"] = RootFor(path),
            ["ACCESS"] = AccessName(Access),
            ["ACCESS_CHECK"] = WebUtility.HtmlEncode(AccessCheck ?? string.Empty),
            ["SCREEN"] = notFound ? "not-found" : string.Empty,
            ["TITLE"] = WebUtility.HtmlEncode(Title ?? server),
            ["FAVICON"] = faviconHref is null ? string.Empty : "<link rel=\"icon\" href=\"web/" + WebUtility.HtmlEncode(faviconHref) + "\" />",
            ["ICONS"] = iconFace.Length == 0 ? string.Empty : "<style>" + iconFace.Replace("</", "<\\/", StringComparison.Ordinal) + "</style>",
            ["STYLESHEET"] = WebUtility.HtmlEncode(SharedPage("css")),
            ["SCRIPT"] = StringUtilities.EscapeJsString(SharedPage("js")),
            ["SERVER"] = WebUtility.HtmlEncode(server),
            ["MARK"] = mark,
            ["COLUMN"] = Wide ? " stolon-wide" : string.Empty,
            ["OPTIONS"] = ScriptOptions(),
            ["CONTENT"] = notFound ? string.Empty : TemplateLoader.FillText(_content.Html, Encode(values))
        });
    }

    /// <summary>
    /// Renders the whole document in the web client shell.
    /// </summary>
    /// <param name="path">The request path, without the server's base path.</param>
    /// <param name="serverName">The server's name, or <c>null</c> when it is not known.</param>
    /// <param name="serverId">The server's id, whose stored sign-in and theme the page reads, or <c>null</c>.</param>
    /// <param name="language">The page's language.</param>
    /// <param name="faviconHref">The web client's favicon, relative to the web folder, or <c>null</c>.</param>
    /// <param name="shell">What the shell links from the web client.</param>
    /// <param name="details">The details page template, or <c>null</c> for none.</param>
    /// <param name="values">Values for the content's tokens, encoded here.</param>
    /// <returns>The document.</returns>
    internal string RenderShell(PathString path, string? serverName, string? serverId, string language, string? faviconHref, WebClientShellAssets shell, string? details, IReadOnlyDictionary<string, string>? values, bool notFound = false)
    {
        ArgumentNullException.ThrowIfNull(shell);
        var server = string.IsNullOrWhiteSpace(serverName) ? "Jellyfin" : serverName;
        var web = new StringBuilder();
        if (shell.IndexStyle.Length > 0)
        {
            web.Append("<style>").Append(shell.IndexStyle.Replace("</", "<\\/", StringComparison.Ordinal)).Append("</style>\n");
        }

        foreach (var href in shell.Stylesheets)
        {
            web.Append("<link rel=\"stylesheet\" href=\"web/").Append(WebUtility.HtmlEncode(href)).Append("\" />\n");
        }

        return TemplateLoader.Fill("webclient", new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["LANGUAGE"] = WebUtility.HtmlEncode(language),
            ["ROOT"] = RootFor(path),
            ["SERVER_ID"] = WebUtility.HtmlEncode(serverId ?? string.Empty),
            ["ACCESS"] = AccessName(Access),
            ["ACCESS_CHECK"] = WebUtility.HtmlEncode(AccessCheck ?? string.Empty),
            ["SCREEN"] = notFound ? "not-found" : string.Empty,
            ["TITLE"] = WebUtility.HtmlEncode(Title ?? server),
            ["FAVICON"] = faviconHref is null ? string.Empty : "<link rel=\"icon\" href=\"web/" + WebUtility.HtmlEncode(faviconHref) + "\" />",
            ["MANIFEST"] = string.IsNullOrEmpty(Manifest) ? string.Empty : "<link rel=\"manifest\" href=\"" + WebUtility.HtmlEncode(Manifest) + "\" />",
            ["WEB_CLIENT"] = web.ToString().TrimEnd(),
            ["FONTS"] = shell.Fonts.Length == 0 ? string.Empty : "<style>" + shell.Fonts.Replace("</", "<\\/", StringComparison.Ordinal) + "</style>",
            ["STYLESHEET"] = WebUtility.HtmlEncode(SharedPage("css")),
            ["SCRIPT"] = StringUtilities.EscapeJsString(SharedPage("js")),
            ["SERVER"] = WebUtility.HtmlEncode(server),
            ["LOGO"] = shell.LogoHref is null ? string.Empty : "<img src=\"web/" + WebUtility.HtmlEncode(shell.LogoHref) + "\" alt=\"\" />",
            ["MARK"] = WebUtility.HtmlEncode(Mark ?? string.Empty),
            ["MARK_ICON"] = WebUtility.HtmlEncode(MarkIcon ?? string.Empty),
            ["DETAILS"] = details is null ? string.Empty : "<template id=\"stolon-shell-details\">" + details + "</template>",
            ["OPTIONS"] = ScriptOptions(),
            ["CONTENT"] = notFound ? string.Empty : TemplateLoader.FillText(_content.Html, Encode(values))
        });
    }

    // Each value HTML encoded, for the content's tokens.
    private static Dictionary<string, string> Encode(IReadOnlyDictionary<string, string>? values)
    {
        var encoded = new Dictionary<string, string>(StringComparer.Ordinal);
        if (values is not null)
        {
            foreach (var pair in values)
            {
                encoded[pair.Key] = WebUtility.HtmlEncode(pair.Value);
            }
        }

        return encoded;
    }

    // The options the page script starts with.
    private string ScriptOptions() =>
        string.IsNullOrEmpty(Translations) ? string.Empty : "{ translations: '" + StringUtilities.EscapeJsString(Translations) + "' }";

    // The value the page script reads from data-stolon-access.
    private static string AccessName(HostedPageAccess access) => access switch
    {
        HostedPageAccess.User => "user",
        HostedPageAccess.Administrator => "administrator",
        HostedPageAccess.SelectedUsers => "selected",
        _ => "anyone"
    };

    // Whether the plugin's list names the user. A missing list names nobody, and one that fails to load fails the request, so it never admits.
    private bool Listed(Guid userId) => AllowedUsers?.Invoke()?.Contains(userId) ?? false;

    // The address of a shared Stolon page, relative to the base address.
    private string SharedPage(string extension) => "./web/configurationpage?name=" + Uri.EscapeDataString(Prefix + "_stolon." + extension);
}
