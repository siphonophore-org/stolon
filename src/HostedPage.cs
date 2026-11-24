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
/// A page a plugin serves at a root path of the server, such as <c>/invites/{code}</c>, in the user page frame from the <c>page</c> template.
/// It is declared once, with the plugin's prefix, who may open it, and its content, and a controller action serves it.
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
        var html = Render(context.Request.Path, host?.FriendlyName, StolonTranslations.RequestLanguage(context.Request), assets.FaviconHref, assets.IconFace, values);
        return new ContentResult { Content = html, ContentType = "text/html; charset=utf-8", StatusCode = StatusCodes.Status200OK };
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
    /// <returns>The document.</returns>
    internal string Render(PathString path, string? serverName, string language, string? faviconHref, string iconFace, IReadOnlyDictionary<string, string>? values)
    {
        var encoded = new Dictionary<string, string>(StringComparer.Ordinal);
        if (values is not null)
        {
            foreach (var pair in values)
            {
                encoded[pair.Key] = WebUtility.HtmlEncode(pair.Value);
            }
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
            ["TITLE"] = WebUtility.HtmlEncode(Title ?? server),
            ["FAVICON"] = faviconHref is null ? string.Empty : "<link rel=\"icon\" href=\"web/" + WebUtility.HtmlEncode(faviconHref) + "\" />",
            ["ICONS"] = iconFace.Length == 0 ? string.Empty : "<style>" + iconFace.Replace("</", "<\\/", StringComparison.Ordinal) + "</style>",
            ["STYLESHEET"] = WebUtility.HtmlEncode(SharedPage("css")),
            ["SCRIPT"] = StringUtilities.EscapeJsString(SharedPage("js")),
            ["SERVER"] = WebUtility.HtmlEncode(server),
            ["MARK"] = mark,
            ["COLUMN"] = Wide ? " stolon-wide" : string.Empty,
            ["OPTIONS"] = string.IsNullOrEmpty(Translations) ? string.Empty : "{ translations: '" + StringUtilities.EscapeJsString(Translations) + "' }",
            ["CONTENT"] = TemplateLoader.FillText(_content.Html, encoded)
        });
    }

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
