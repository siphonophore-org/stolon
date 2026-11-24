using System;
using System.Collections.Generic;
using System.IO;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="HostedPage"/> and <see cref="HostedPageContent"/> render a page whose links work from any path, with its content encoded and its headers set.</summary>
public sealed class HostedPageTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "stolon-hosted-" + Guid.NewGuid().ToString("N"));

    public HostedPageTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// The base address climbs from the request path back to the server root.
    /// True: the page's links reach the web client under a base path or a proxy that strips a prefix.
    /// False: a page one level deep would load its CSS from inside its own route.
    /// </summary>
    [Theory]
    [InlineData("", "./")]
    [InlineData("/wireguard", "./")]
    [InlineData("/requests/", "../")]
    [InlineData("/invites/abc", "../")]
    [InlineData("/invites/abc/", "../../")]
    [InlineData("/a/b/c", "../../")]
    public void RootFor_ClimbsToTheServerRoot(string path, string expected)
    {
        Assert.Equal(expected, HostedPage.RootFor(new PathString(path.Length == 0 ? null : path)));
    }

    /// <summary>
    /// The page links the plugin's shared CSS and JS and the web client under the base address, and starts the page script.
    /// True: a page served at /invites/abc loads the kit from the server root.
    /// False: the page would render with no styles or check no viewer.
    /// </summary>
    [Fact]
    public void Render_LinksSharedAssetsUnderTheBase()
    {
        var page = Content(HostedPageAccess.User);

        var values = new Dictionary<string, string>(StringComparer.Ordinal) { ["NAME"] = "Ana", ["CODE"] = "abc", ["MISSING"] = string.Empty };

        var html = page.Render(new PathString("/invites/abc"), "Home", "de", "favicon.1.ico", string.Empty, values);

        Assert.Contains("<base href=\"../\" />", html, StringComparison.Ordinal);
        Assert.Contains("<html lang=\"de\">", html, StringComparison.Ordinal);
        Assert.Contains("href=\"./web/configurationpage?name=myplugin_stolon.css\"", html, StringComparison.Ordinal);
        Assert.Contains("import { startUserPage } from './web/configurationpage?name=myplugin_stolon.js';", html, StringComparison.Ordinal);
        Assert.Contains("<link rel=\"icon\" href=\"web/favicon.1.ico\" />", html, StringComparison.Ordinal);
        Assert.Contains("data-stolon-access=\"user\"", html, StringComparison.Ordinal);
        Assert.DoesNotContain("{{", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// Each access writes its own name for the page script.
    /// True: the script checks the viewer the page declares.
    /// False: an administrator page would open for anyone signed in.
    /// </summary>
    [Theory]
    [InlineData(HostedPageAccess.Anyone, "anyone")]
    [InlineData(HostedPageAccess.User, "user")]
    [InlineData(HostedPageAccess.Administrator, "administrator")]
    public void Render_WritesTheAccess(HostedPageAccess access, string expected)
    {
        var html = Content(access).Render(new PathString("/x"), null, "en-us", null, string.Empty, null);

        Assert.Contains("data-stolon-access=\"" + expected + "\"", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// Content values are HTML encoded and a token with no value stays as written.
    /// True: an invite code from the address cannot inject markup.
    /// False: a crafted code would run script on the server's origin.
    /// </summary>
    [Fact]
    public void Render_EncodesContentValues()
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal) { ["NAME"] = "<b>Ana</b>", ["CODE"] = "a\"b" };

        var html = Content(HostedPageAccess.Anyone).Render(new PathString("/x"), null, "en-us", null, string.Empty, values);

        Assert.Contains("Hello &lt;b&gt;Ana&lt;/b&gt;", html, StringComparison.Ordinal);
        Assert.Contains("data-code=\"a&quot;b\"", html, StringComparison.Ordinal);
        Assert.Contains("{{MISSING}}", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The server's name, the title, and the mark are encoded, and the title falls back to the server's name.
    /// True: a server named with markup shows as text.
    /// False: the header would break or inject markup.
    /// </summary>
    [Fact]
    public void Render_EncodesTheHeader()
    {
        var html = Content(HostedPageAccess.Anyone).Render(new PathString("/x"), "<Home>", "en-us", null, string.Empty, null);

        Assert.Contains("<title>&lt;Home&gt;</title>", html, StringComparison.Ordinal);
        Assert.Contains(">&lt;Home&gt;</a>", html, StringComparison.Ordinal);
        Assert.DoesNotContain("stolon-user-page-mark", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The title, the mark, its icon, the wide column, and the translations reach the page.
    /// True: a plugin's declaration shapes its page.
    /// False: a set option would be dropped.
    /// </summary>
    [Fact]
    public void Render_AppliesTheDeclaration()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, Fragment())
        {
            Title = "Set up & go",
            Mark = "WireGuard",
            MarkIcon = "vpn_key",
            Wide = true,
            Translations = "MyPlugin/Translations"
        };

        var html = page.Render(new PathString("/wireguard"), null, "en-us", null, string.Empty, null);

        Assert.Contains("<title>Set up &amp; go</title>", html, StringComparison.Ordinal);
        Assert.Contains("<span class=\"material-icons\" aria-hidden=\"true\">vpn_key</span><span>WireGuard</span>", html, StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-user-page stolon-wide\"", html, StringComparison.Ordinal);
        Assert.Contains("startUserPage({ translations: 'MyPlugin/Translations' });", html, StringComparison.Ordinal);
        Assert.Contains(">Jellyfin</a>", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The icon face is placed in a style block, with any closing tag neutralized.
    /// True: the page shows the web client's icons.
    /// False: a crafted stylesheet could close the style block.
    /// </summary>
    [Fact]
    public void Render_PlacesTheIconFace()
    {
        var html = Content(HostedPageAccess.Anyone).Render(new PathString("/x"), null, "en-us", null, "@font-face{src:url(web/a.woff2)}</style>", null);

        Assert.Contains("<style>@font-face{src:url(web/a.woff2)}<\\/style></style>", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// A Stolon template can be the content.
    /// True: a plugin can serve a template it fills with values.
    /// False: a template page would be empty.
    /// </summary>
    [Fact]
    public void Template_IsTheContent()
    {
        var html = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status"))
            .Render(new PathString("/x"), null, "en-us", null, string.Empty, new Dictionary<string, string>(StringComparer.Ordinal) { ["HEADING"] = "Hi & bye" });

        Assert.Contains("<h1>Hi &amp; bye</h1>", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// Content that is not embedded fails with the name it looked for.
    /// True: a typo in a resource name shows at once.
    /// False: the page would render empty.
    /// </summary>
    [Fact]
    public void Resource_MissingThrowsOnRender()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Resource(typeof(HostedPageTests).Assembly, "Web.missing.html"));

        var error = Assert.Throws<InvalidOperationException>(() => page.Render(new PathString("/x"), null, "en-us", null, string.Empty, null));
        Assert.Contains("Web.missing.html", error.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// Serve answers with the page as HTML, the hardening headers, and the server's name and favicon from the request's services.
    /// True: a controller action serves the page in one line.
    /// False: a header or the server's name would be missing.
    /// </summary>
    [Fact]
    public void Serve_AnswersWithHeadersAndServerName()
    {
        File.WriteAllText(Path.Combine(_dir, "favicon.9.ico"), "x");
        File.WriteAllText(Path.Combine(_dir, "index.html"), "<link rel=\"shortcut icon\" href=\"favicon.9.ico\">");
        var host = Substitute.For<IServerApplicationHost>();
        host.FriendlyName.Returns("Den");
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        var services = Substitute.For<IServiceProvider>();
        services.GetService(typeof(IServerApplicationHost)).Returns(host);
        services.GetService(typeof(IServerApplicationPaths)).Returns(paths);
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Path = "/invites/abc";
        var controller = new PageController { ControllerContext = new ControllerContext { HttpContext = context } };

        var result = Content(HostedPageAccess.Anyone).Serve(controller);

        Assert.Equal("text/html; charset=utf-8", result.ContentType);
        Assert.Equal(StatusCodes.Status200OK, result.StatusCode);
        Assert.Contains(">Den</a>", result.Content, StringComparison.Ordinal);
        Assert.Contains("href=\"web/favicon.9.ico\"", result.Content, StringComparison.Ordinal);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"]);
        Assert.Equal("no-referrer", context.Response.Headers["Referrer-Policy"]);
        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("frame-ancestors 'self'", context.Response.Headers["Content-Security-Policy"]);
    }

    /// <summary>
    /// The administrator policy names Jellyfin's own.
    /// True: an administrator page's API refuses anyone else.
    /// False: the attribute would name a policy Jellyfin does not have and fail every call.
    /// </summary>
    [Fact]
    public void AdministratorPolicy_IsJellyfinsElevationPolicy()
    {
        Assert.Equal("RequiresElevation", HostedPage.AdministratorPolicy);
    }

    /// <summary>
    /// Missing arguments are rejected.
    /// True: a misuse fails where it is written.
    /// False: it would fail on the first request.
    /// </summary>
    [Fact]
    public void Members_RejectMissingArguments()
    {
        Assert.Throws<ArgumentException>(() => new HostedPage(string.Empty, HostedPageAccess.Anyone, Fragment()));
        Assert.Throws<ArgumentNullException>(() => new HostedPage("myplugin", HostedPageAccess.Anyone, null!));
        Assert.Throws<ArgumentException>(() => HostedPageContent.Template(string.Empty));
        Assert.Throws<ArgumentNullException>(() => HostedPageContent.Resource(null!, "x"));
        Assert.Throws<ArgumentNullException>(() => Content(HostedPageAccess.Anyone).Serve(null!));
    }

    private static HostedPageContent Fragment() =>
        HostedPageContent.Resource(typeof(HostedPageTests).Assembly, "Web.hosted-content.html");

    private static HostedPage Content(HostedPageAccess access) => new("myplugin", access, Fragment());

    private sealed class PageController : ControllerBase
    {
    }
}
