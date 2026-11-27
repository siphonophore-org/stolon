using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Siphonophore.Stolon;

/// <summary>
/// A screen of the web client status page.
/// </summary>
public enum StatusPageScreen
{
    /// <summary>The web client's loading spinner, alone in the middle of the page, or over the message when there is one.</summary>
    Loading,

    /// <summary>Sign in required, with a Sign in button that opens the web client.</summary>
    SignIn,

    /// <summary>A signed in viewer the page does not admit, with a button home.</summary>
    Unauthorized,

    /// <summary>An address or an item that does not exist, with a button home.</summary>
    NotFound
}

/// <summary>
/// Renders the standalone, Jellyfin themed status page from the <c>status</c> template.
/// It is a centered card with a logo, a heading, a message, an optional spinner, and an optional action button.
/// </summary>
/// <remarks>
/// A plugin controller uses it for pages such as "page not found", "sign in required", or a loading state.
/// The markup of <see cref="Render"/> is self contained, so it needs none of the dashboard assets. <see cref="ServeWebClient(ControllerBase, string, StatusPageScreen, string?, string?, string?)"/>
/// draws the same screens in the web client's own look instead.
/// </remarks>
public static class StatusPage
{
    private const string BackToJellyfin = "Back to Jellyfin";

    /// <summary>
    /// Renders the status page HTML.
    /// </summary>
    /// <remarks>The heading, message, title, and button values are HTML encoded. The <paramref name="content"/> value is not.</remarks>
    /// <param name="heading">The card heading.</param>
    /// <param name="message">The card body message.</param>
    /// <param name="title">The document title, or <c>null</c> to use the heading.</param>
    /// <param name="buttonText">The action button text. It defaults to "Back to Jellyfin" in the language of <see cref="StolonTranslations.CurrentLanguage"/>, and <c>null</c> or empty means no button.</param>
    /// <param name="buttonHref">The action button link. It defaults to "../web/", and <c>null</c> or empty means no button.</param>
    /// <param name="showSpinner">Whether to show a loading spinner. <c>false</c> by default.</param>
    /// <param name="content">
    /// Raw HTML placed in the card below the message, such as a form or a page the plugin's script fills in.
    /// It is not encoded, so pass only markup the plugin owns. It may use <c>stolon-status-error</c> for a red error line,
    /// <c>stolon-btn stolon-btn-secondary</c> for a quieter link button, and <c>stolon-btn-stack</c> to stack buttons full width.
    /// </param>
    /// <returns>A complete HTML document.</returns>
    public static string Render(
        string heading,
        string message,
        string? title = null,
        string? buttonText = BackToJellyfin,
        string? buttonHref = "../web/",
        bool showSpinner = false,
        string? content = null)
    {
        var spinner = showSpinner
            ? "<div class=\"stolon-spinner\" role=\"status\" aria-label=\"" + WebUtility.HtmlEncode(StolonTranslations.Text("Stolon.Loading", "Loading")) + "\"></div>"
            : string.Empty;

        if (buttonText == BackToJellyfin)
        {
            buttonText = StolonTranslations.Text("Stolon.BackToJellyfin", BackToJellyfin);
        }

        var button = string.IsNullOrEmpty(buttonText) || string.IsNullOrEmpty(buttonHref)
            ? string.Empty
            : "<a class=\"stolon-btn\" href=\"" + WebUtility.HtmlEncode(buttonHref) + "\">" + WebUtility.HtmlEncode(buttonText) + "</a>";

        return TemplateLoader.Fill("status", new Dictionary<string, string>(System.StringComparer.Ordinal)
        {
            ["TITLE"] = WebUtility.HtmlEncode(title ?? heading),
            ["HEADING"] = WebUtility.HtmlEncode(heading),
            ["MESSAGE"] = WebUtility.HtmlEncode(message),
            ["SPINNER"] = spinner,
            ["BUTTON"] = button,
            ["CONTENT"] = content ?? string.Empty
        });
    }

    /// <summary>
    /// Serves one of the web client status screens in the web client shell, signed out as the web client's login page until the page
    /// script finds the viewer's sign-in in this browser, and then in the signed in shell with their libraries and user menu.
    /// </summary>
    /// <remarks>
    /// The texts come from the translations in the request's language. The screen sits in the shell's gate, so a plugin's script that
    /// imports the bundle can replace it with <c>showScreen</c>, such as with <c>createNotFound()</c> once it knows.
    /// </remarks>
    /// <param name="controller">The controller whose request is answered.</param>
    /// <param name="prefix">The plugin's prefix for its shared pages, the same one it passes to <c>GetSharedPages</c>.</param>
    /// <param name="screen">The screen.</param>
    /// <param name="message">The sentence under the heading, encoded here, or <c>null</c> for the screen's own.</param>
    /// <param name="content">
    /// Raw HTML placed after the screen's button, such as a script that checks the viewer. It is not encoded, so pass only markup the plugin owns.
    /// </param>
    /// <param name="title">The document title, such as the name of the page that is loading, or <c>null</c> for the screen's heading.</param>
    /// <returns>The page, with status code 200 for loading, 401 for sign in, 403 for unauthorized, and 404 for not found.</returns>
    public static ContentResult ServeWebClient(ControllerBase controller, string prefix, StatusPageScreen screen, string? message = null, string? content = null, string? title = null)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentException.ThrowIfNullOrEmpty(prefix);
        var language = StolonTranslations.RequestLanguage(controller.Request);
        var gate = WebClientScreen(screen, language, message, content);
        var page = new HostedPage(prefix, HostedPageAccess.Anyone, HostedPageContent.Empty) { Title = string.IsNullOrEmpty(title) ? ScreenTitle(screen, language) : title };
        return page.Status(controller, gate, ScreenStatus(screen));
    }

    /// <summary>
    /// Serves a status screen of the plugin's own in the web client shell, as <see cref="ServeWebClient(ControllerBase, string, StatusPageScreen, string?, string?, string?)"/>
    /// serves the standard ones.
    /// </summary>
    /// <remarks>The heading, message, and button values are HTML encoded. The <paramref name="content"/> value is not.</remarks>
    /// <param name="controller">The controller whose request is answered.</param>
    /// <param name="prefix">The plugin's prefix for its shared pages, the same one it passes to <c>GetSharedPages</c>.</param>
    /// <param name="heading">The screen's heading, also the document title.</param>
    /// <param name="message">The sentence under the heading, or empty for none.</param>
    /// <param name="buttonText">The button's text. It defaults to "Back to Jellyfin" in the request's language, and <c>null</c> or empty means no button.</param>
    /// <param name="buttonHref">The button's link, relative to the server root. It defaults to <c>web/</c>, and <c>null</c> or empty means no button.</param>
    /// <param name="showSpinner">Whether to show the web client's loading spinner under the sentence. <c>false</c> by default.</param>
    /// <param name="content">Raw HTML placed after the button. It is not encoded, so pass only markup the plugin owns.</param>
    /// <param name="statusCode">The status code. 200 by default.</param>
    /// <returns>The page.</returns>
    public static ContentResult ServeWebClient(
        ControllerBase controller,
        string prefix,
        string heading,
        string message,
        string? buttonText = BackToJellyfin,
        string? buttonHref = "web/",
        bool showSpinner = false,
        string? content = null,
        int statusCode = StatusCodes.Status200OK)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentException.ThrowIfNullOrEmpty(prefix);
        ArgumentNullException.ThrowIfNull(heading);
        var language = StolonTranslations.RequestLanguage(controller.Request);
        if (buttonText == BackToJellyfin)
        {
            buttonText = Say("Stolon.BackToJellyfin", BackToJellyfin, language);
        }

        var gate = WebClientScreen(heading, message, buttonText, buttonHref, showSpinner ? Say("Stolon.Loading", "Loading", language) : null, content, "stolon-status-screen", "region");
        var page = new HostedPage(prefix, HostedPageAccess.Anyone, HostedPageContent.Empty) { Title = heading };
        return page.Status(controller, gate, statusCode);
    }

    /// <summary>
    /// Writes the markup of a standard web client status screen.
    /// </summary>
    /// <param name="screen">The screen.</param>
    /// <param name="language">The language of its texts.</param>
    /// <param name="message">The sentence, or <c>null</c> for the screen's own.</param>
    /// <param name="content">Raw HTML after the button, or <c>null</c>.</param>
    /// <returns>The screen's markup.</returns>
    internal static string WebClientScreen(StatusPageScreen screen, string? language, string? message, string? content)
    {
        var home = Say("Home", "Home", language);
        return screen switch
        {
            StatusPageScreen.SignIn => WebClientScreen(
                ScreenTitle(screen, language), message ?? Say("Stolon.SignInToOpen", "Sign in to Jellyfin to open this page.", language),
                Say("ButtonSignIn", "Sign in", language), "web/", null, content, "stolon-sign-in-required", "region"),
            StatusPageScreen.Unauthorized => WebClientScreen(
                ScreenTitle(screen, language), message ?? Say("MessageUnauthorizedUser", "You are not authorized to access the server at this time. Please contact your server administrator for more information.", language),
                home, "web/", null, content, "stolon-unauthorized", "alert"),
            StatusPageScreen.NotFound => WebClientScreen(
                ScreenTitle(screen, language), message ?? Say("PageNotFound", "This is not the page you are looking for.", language),
                home, "web/", null, content, "stolon-not-found", "alert"),
            _ when message is null => "<div class=\"docspinner mdl-spinner mdlSpinnerActive\" role=\"status\" aria-label=\"" + WebUtility.HtmlEncode(ScreenTitle(screen, language)) + "\">" + SpinnerLayers + "</div>"
                + (content ?? string.Empty),
            _ => "<section class=\"stolon-screen stolon-screen-web stolon-status-loading\" role=\"status\" aria-label=\"" + WebUtility.HtmlEncode(ScreenTitle(screen, language)) + "\">"
                + "<div class=\"mdl-spinner mdlSpinnerActive stolon-screen-spinner\" aria-hidden=\"true\">" + SpinnerLayers + "</div>"
                + "<p class=\"stolon-screen-text secondaryText\">" + WebUtility.HtmlEncode(message) + "</p>" + (content ?? string.Empty) + "</section>"
        };
    }

    // A screen as the page script's screens draw one in the web client frame: the web client's logo element, a heading, a sentence,
    // then the spinner, a full width button, and the plugin's content. The texts are encoded here.
    private static string WebClientScreen(string heading, string? message, string? buttonText, string? buttonHref, string? spinnerLabel, string? content, string kind, string role)
    {
        var html = new StringBuilder()
            .Append("<section class=\"stolon-screen stolon-screen-web ").Append(kind).Append("\" role=\"").Append(role).Append("\" aria-label=\"").Append(WebUtility.HtmlEncode(heading)).Append("\">")
            .Append("<div class=\"pageTitle pageTitleWithLogo pageTitleWithDefaultLogo stolon-screen-logo\" aria-hidden=\"true\"></div>")
            .Append("<h1 class=\"stolon-screen-title sectionTitle\">").Append(WebUtility.HtmlEncode(heading)).Append("</h1>");
        if (!string.IsNullOrEmpty(message))
        {
            html.Append("<p class=\"stolon-screen-text secondaryText\">").Append(WebUtility.HtmlEncode(message)).Append("</p>");
        }

        html.Append("<div class=\"stolon-screen-body\">");
        if (spinnerLabel is not null)
        {
            html.Append("<div class=\"mdl-spinner mdlSpinnerActive stolon-screen-spinner\" role=\"status\" aria-label=\"").Append(WebUtility.HtmlEncode(spinnerLabel)).Append("\">").Append(SpinnerLayers).Append("</div>");
        }

        if (!string.IsNullOrEmpty(buttonText) && !string.IsNullOrEmpty(buttonHref))
        {
            html.Append("<a class=\"raised block emby-button button-submit stolon-screen-button\" href=\"").Append(WebUtility.HtmlEncode(buttonHref)).Append("\">")
                .Append(WebUtility.HtmlEncode(buttonText)).Append("</a>");
        }

        return html.Append(content ?? string.Empty).Append("</div></section>").ToString();
    }

    // The inside of the web client's loading spinner (src/components/loading/loading.ts, 12.4), four layers of two arcs, as WEB_SPINNER.
    private static readonly string SpinnerLayers = string.Concat(Enumerable.Range(1, 4).Select(n =>
        "<div class=\"mdl-spinner__layer mdl-spinner__layer-" + n + "\"><div class=\"mdl-spinner__circle-clipper mdl-spinner__left\"><div class=\"mdl-spinner__circle mdl-spinner__circleLeft\"></div></div>"
        + "<div class=\"mdl-spinner__circle-clipper mdl-spinner__right\"><div class=\"mdl-spinner__circle mdl-spinner__circleRight\"></div></div></div>"));

    private static string ScreenTitle(StatusPageScreen screen, string? language) => screen switch
    {
        StatusPageScreen.SignIn => Say("HeaderPleaseSignIn", "Please sign in", language),
        StatusPageScreen.Unauthorized => Say("Stolon.UnauthorizedTitle", "You cannot open this page", language),
        StatusPageScreen.NotFound => Say("HeaderPageNotFound", "Page not found", language),
        _ => Say("Stolon.Loading", "Loading", language)
    };

    private static int ScreenStatus(StatusPageScreen screen) => screen switch
    {
        StatusPageScreen.SignIn => StatusCodes.Status401Unauthorized,
        StatusPageScreen.Unauthorized => StatusCodes.Status403Forbidden,
        StatusPageScreen.NotFound => StatusCodes.Status404NotFound,
        _ => StatusCodes.Status200OK
    };

    // A string in a language, or its English when the translations lack it.
    private static string Say(string key, string english, string? language) =>
        StolonTranslations.For(language).TryGetValue(key, out var text) ? text : english;
}
