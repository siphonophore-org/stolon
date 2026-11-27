using System;
using System.IO;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>
/// Verifies the web client frames a page can take: the signed out frame, the web client status screens, and the content style for
/// author content in a frame.
/// </summary>
public sealed class WebClientFramesTests : IDisposable
{
    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-frames-" + Guid.NewGuid().ToString("N"));

    public WebClientFramesTests()
    {
        Directory.CreateDirectory(_dir);
        File.WriteAllText(Path.Join(_dir, "index.html"), "<html><head><link href=\"main.jellyfin.cd.css\" rel=\"stylesheet\"></head></html>");
        File.WriteAllText(Path.Join(_dir, "main.jellyfin.cd.css"), "@font-face{font-family:Material Icons;src:url(icons.woff2)}.raised{}");
        File.WriteAllText(Path.Join(_dir, "500.dd.css"), "@font-face{font-family:Noto Sans;src:url(noto.1.woff2)}html{font-family:Noto Sans,sans-serif}");
    }

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// The signed out frame takes the login page's classes on its body, its column, and its form, and keeps the gate hidden.
    /// True: a page anyone opens looks like the web client's login page.
    /// False: an invite page would show an empty app bar and a full width page.
    /// </summary>
    [Fact]
    public void SignedOut_TakesTheLoginPagesClasses()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status")) { Frame = HostedPageFrame.WebClientSignedOut };

        var html = page.RenderShell(new PathString("/invites/abc"), "Den", null, "en-us", null, WebClientShellAssets.None, null, null);

        Assert.Contains("class=\"stolon-shell stolon-shell-signed-out\"", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-shell-column standalonePage padded-left padded-right padded-bottom-page\"", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-shell-form readOnlyContent margin-auto-x\"", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-user-page-gate stolon-shell-gate\" hidden>", html, StringComparison.Ordinal);
        Assert.Contains("data-stolon-session=\"\"", html, StringComparison.Ordinal);
        Assert.Contains("stolon-status-page-card", html, StringComparison.Ordinal);
        Assert.DoesNotMatch("\\{\\{(FRAME|SESSION|COLUMN|FORM|GATE|GATE_HIDDEN)\\}\\}", html);
    }

    /// <summary>
    /// The signed in shell keeps its own classes, with none of the signed out frame's.
    /// True: an existing web client page keeps its look.
    /// False: a signed in page would sit in the login form's narrow column.
    /// </summary>
    [Fact]
    public void WebClient_KeepsTheSignedInShell()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.User, HostedPageContent.Template("status")) { Frame = HostedPageFrame.WebClient };

        var html = page.RenderShell(new PathString("/x"), "Den", null, "en-us", null, WebClientShellAssets.None, null, null);

        Assert.Contains("class=\"stolon-shell\"", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-shell-column\"", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-shell-form\"", html, StringComparison.Ordinal);
        Assert.DoesNotContain("stolon-shell-signed-out", html, StringComparison.Ordinal);
        Assert.DoesNotMatch("\\{\\{(FRAME|SESSION|COLUMN|FORM|GATE|GATE_HIDDEN)\\}\\}", html);
    }

    /// <summary>
    /// A status screen sits in the shown gate in place of the content, and the page follows a stored sign-in.
    /// True: the screen shows at once, signed out, and moves into the signed in shell for a signed in viewer.
    /// False: the screen would stay hidden, or the content would show beside it.
    /// </summary>
    [Fact]
    public void Status_PutsTheScreenInTheGate()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status"));

        var html = page.RenderShell(new PathString("/x"), "Den", null, "en-us", null, WebClientShellAssets.None, null, null, false, "<p id=\"screen\"></p>");

        Assert.Contains("class=\"stolon-user-page-gate stolon-shell-gate\"><p id=\"screen\"></p></div>", html, StringComparison.Ordinal);
        Assert.Contains("data-stolon-session=\"follow\"", html, StringComparison.Ordinal);
        Assert.Contains("stolon-shell-signed-out", html, StringComparison.Ordinal);
        Assert.DoesNotContain("stolon-status-page-card", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// Each standard screen uses the web client's classes, and the loading screen is the web client's spinner.
    /// True: the screens look like the web client's own login page and loading state.
    /// False: a status page would keep Stolon's standalone card look.
    /// </summary>
    [Theory]
    [InlineData(StatusPageScreen.SignIn, "stolon-sign-in-required", "Please sign in")]
    [InlineData(StatusPageScreen.Unauthorized, "stolon-unauthorized", "MessageUnauthorizedUser")]
    [InlineData(StatusPageScreen.NotFound, "stolon-not-found", "Page not found")]
    public void WebClientScreen_UsesTheWebClientsClasses(StatusPageScreen screen, string kind, string text)
    {
        var html = StatusPage.WebClientScreen(screen, null, null, null);

        Assert.Contains("stolon-screen stolon-screen-web " + kind, html, StringComparison.Ordinal);
        Assert.Contains("<h1 class=\"stolon-screen-title sectionTitle\">", html, StringComparison.Ordinal);
        Assert.Contains("class=\"raised block emby-button button-submit stolon-screen-button\" href=\"web/\"", html, StringComparison.Ordinal);
        if (text != "MessageUnauthorizedUser")
        {
            Assert.Contains(text, html, StringComparison.Ordinal);
        }
    }

    /// <summary>
    /// The loading screen is the web client's spinner alone, or a spinner over the message, and every value is encoded.
    /// True: a page loads as the web client does, and nothing the plugin passes becomes markup.
    /// False: the screen would show a heading the web client never shows, or a crafted message would run.
    /// </summary>
    [Fact]
    public void WebClientScreen_LoadingIsTheSpinnerAndEncodes()
    {
        var alone = StatusPage.WebClientScreen(StatusPageScreen.Loading, null, null, "<script id=\"x\"></script>");
        var message = StatusPage.WebClientScreen(StatusPageScreen.NotFound, null, "<b>gone</b>", null);
        var spinner = StatusPage.WebClientScreen(StatusPageScreen.Loading, null, "Almost there", null);

        Assert.StartsWith("<div class=\"docspinner mdl-spinner mdlSpinnerActive\" role=\"status\"", alone, StringComparison.Ordinal);
        Assert.Contains("mdl-spinner__layer-4", alone, StringComparison.Ordinal);
        Assert.EndsWith("<script id=\"x\"></script>", alone, StringComparison.Ordinal);
        Assert.Contains("&lt;b&gt;gone&lt;/b&gt;", message, StringComparison.Ordinal);
        Assert.Contains("stolon-status-loading", spinner, StringComparison.Ordinal);
        Assert.Contains("Almost there", spinner, StringComparison.Ordinal);
    }

    /// <summary>
    /// ServeWebClient answers each screen with its status code, its title, and the plugin's shared files.
    /// True: a controller serves a web client status page in one line.
    /// False: a not found page would answer 200, or load no Stolon script to follow the viewer.
    /// </summary>
    [Theory]
    [InlineData(StatusPageScreen.Loading, 200)]
    [InlineData(StatusPageScreen.SignIn, 401)]
    [InlineData(StatusPageScreen.Unauthorized, 403)]
    [InlineData(StatusPageScreen.NotFound, 404)]
    public void ServeWebClient_AnswersWithTheScreensStatus(StatusPageScreen screen, int status)
    {
        var (controller, context) = Controller("/pages/hello");

        var result = StatusPage.ServeWebClient(controller, "myplugin", screen);

        Assert.Equal(status, result.StatusCode);
        Assert.Contains("configurationpage?name=myplugin_stolon.js", result.Content!, StringComparison.Ordinal);
        Assert.Contains("data-stolon-session=\"follow\"", result.Content!, StringComparison.Ordinal);
        Assert.Contains("<base href=\"../\" />", result.Content!, StringComparison.Ordinal);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"]);
    }

    /// <summary>
    /// The plugin's own screen encodes its texts and keeps its raw content.
    /// True: a plugin draws its own state in the web client look.
    /// False: a crafted heading could run script.
    /// </summary>
    [Fact]
    public void ServeWebClient_OwnScreenEncodes()
    {
        var (controller, _) = Controller("/x");

        var result = StatusPage.ServeWebClient(controller, "myplugin", "<i>Hi</i>", "Wait", buttonText: null, showSpinner: true, content: "<div id=\"mine\"></div>", statusCode: 409);

        Assert.Equal(409, result.StatusCode);
        Assert.Contains("<title>&lt;i&gt;Hi&lt;/i&gt;</title>", result.Content!, StringComparison.Ordinal);
        Assert.Contains("stolon-screen-spinner", result.Content!, StringComparison.Ordinal);
        Assert.Contains("<div id=\"mine\"></div>", result.Content!, StringComparison.Ordinal);
        Assert.DoesNotContain("stolon-screen-button", result.Content!, StringComparison.Ordinal);
    }

    /// <summary>
    /// The content style carries the web client's fonts with their addresses under the frame's root.
    /// True: author content in a frame loads Noto Sans and Material Icons from the installed web client.
    /// False: the frame would fall back to the browser's serif font.
    /// </summary>
    [Fact]
    public void ContentStyle_LoadsTheWebClientsFonts()
    {
        var css = WebClientContentStyle.Render(_dir, "../");

        Assert.StartsWith("<!--", css, StringComparison.Ordinal);
        Assert.Contains("<style id=\"stolon-web-content\">", css, StringComparison.Ordinal);
        Assert.Contains("url(../web/noto.1.woff2)", css, StringComparison.Ordinal);
        Assert.Contains("url(../web/icons.woff2)", css, StringComparison.Ordinal);
        Assert.Contains("html{font-family:Noto Sans,sans-serif}", css, StringComparison.Ordinal);
        Assert.Contains("--jf-palette-primary-main, #00a4dc", css, StringComparison.Ordinal);
        Assert.DoesNotContain("{{", css, StringComparison.Ordinal);
        Assert.DoesNotContain("url(", WebClientContentStyle.Render(null, "./"), StringComparison.Ordinal);
    }

    /// <summary>
    /// The style goes first in the head, after the html tag when there is no head, and first of all otherwise.
    /// True: the author's own styles come after it and win.
    /// False: the style would override the author's rules, or land outside the document.
    /// </summary>
    [Theory]
    [InlineData("<html><head lang=\"x\"><style>a{}</style></head></html>", "<html><head lang=\"x\">S<style>a{}</style></head></html>")]
    [InlineData("<HTML><body>x</body></HTML>", "<HTML>S<body>x</body></HTML>")]
    [InlineData("<p>x</p>", "S<p>x</p>")]
    public void ContentStyle_InjectsFirst(string html, string expected)
    {
        Assert.Equal(expected, WebClientContentStyle.InjectInto(html, "S"));
    }

    /// <summary>
    /// Inject reads the web client and the root from the request.
    /// True: a controller styles its frame in one line.
    /// False: the fonts would point at the wrong folder under a nested path.
    /// </summary>
    [Fact]
    public void ContentStyle_InjectUsesTheRequest()
    {
        var (controller, _) = Controller("/pages/hello");

        var html = WebClientContentStyle.Inject(controller, "<head></head>");

        Assert.Contains("url(../web/noto.1.woff2)", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// Content fetched from a deeper path than the page that shows it takes its fonts relative to the holding page.
    /// True: a page at /pages/hello that writes in content from /pages/hello/user loads the fonts under any base path.
    /// False: the fonts would resolve one folder too high, above the server's base path.
    /// </summary>
    [Theory]
    [InlineData("/pages/hello", "url(../web/noto.1.woff2)")]
    [InlineData("pages/hello", "url(../web/noto.1.woff2)")]
    [InlineData("/wireguard", "url(./web/noto.1.woff2)")]
    [InlineData("/a/b/c", "url(../../web/noto.1.woff2)")]
    public void ContentStyle_HoldingPagePathSetsTheRoot(string holdingPage, string expected)
    {
        var (controller, _) = Controller("/pages/hello/user");

        var style = WebClientContentStyle.Style(controller, holdingPage);
        var injected = WebClientContentStyle.Inject(controller, "<head></head>", holdingPage);

        Assert.Contains(expected, style, StringComparison.Ordinal);
        Assert.Contains(expected, injected, StringComparison.Ordinal);
        Assert.Contains("url(../../web/noto.1.woff2)", WebClientContentStyle.Style(controller), StringComparison.Ordinal);
    }

    /// <summary>
    /// A holding page path is required.
    /// True: a missing path fails at once.
    /// False: an empty path would silently fall back to the server root.
    /// </summary>
    [Fact]
    public void ContentStyle_HoldingPagePathIsRequired()
    {
        var (controller, _) = Controller("/pages/hello/user");

        Assert.Throws<ArgumentException>(() => WebClientContentStyle.Style(controller, string.Empty));
        Assert.Throws<ArgumentNullException>(() => WebClientContentStyle.Style(controller, null!));
    }

    /// <summary>
    /// A standard screen takes the document title it is given, and its heading without one.
    /// True: a loading screen for a page names the page in the browser's tab.
    /// False: every loading page would read Loading in the tab.
    /// </summary>
    [Fact]
    public void ServeWebClient_TakesTheDocumentTitle()
    {
        var (controller, _) = Controller("/pages/hello");

        var named = StatusPage.ServeWebClient(controller, "myplugin", StatusPageScreen.Loading, title: "<Hello>").Content!;
        var plain = StatusPage.ServeWebClient(controller, "myplugin", StatusPageScreen.NotFound).Content!;

        Assert.Contains("<title>&lt;Hello&gt;</title>", named, StringComparison.Ordinal);
        Assert.Contains("<title>Page not found</title>", plain, StringComparison.Ordinal);
    }

    /// <summary>
    /// The user page frame loads the web client's Noto Sans faces, and none of its font stacks.
    /// True: the user page's font stack finds Noto Sans, as the web client shows it.
    /// False: the page would fall back to the system font, or take the web client's stack in place of its own.
    /// </summary>
    [Fact]
    public void UserPage_LoadsTheNotoFaces()
    {
        var (controller, _) = Controller("/invites/abc");
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status"));

        var html = page.Serve(controller).Content!;

        Assert.Contains("<style>@font-face{font-family:Noto Sans;src:url(web/noto.1.woff2)}</style>", html, StringComparison.Ordinal);
        Assert.DoesNotContain("html{font-family:Noto Sans", html, StringComparison.Ordinal);
        Assert.DoesNotContain("{{FONTS}}", html, StringComparison.Ordinal);
    }

    private (ControllerBase Controller, DefaultHttpContext Context) Controller(string path)
    {
        var host = Substitute.For<IServerApplicationHost>();
        host.FriendlyName.Returns("Den");
        host.SystemId.Returns("server1");
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        var services = Substitute.For<IServiceProvider>();
        services.GetService(typeof(IServerApplicationHost)).Returns(host);
        services.GetService(typeof(IServerApplicationPaths)).Returns(paths);
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Path = path;
        return (new PageController { ControllerContext = new ControllerContext { HttpContext = context } }, context);
    }

    private sealed class PageController : ControllerBase
    {
    }
}
