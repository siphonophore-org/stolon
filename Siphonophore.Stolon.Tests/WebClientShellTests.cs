using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>
/// Verifies the web client shell: the hosted page frame that links the installed web client's stylesheets, the assets it reads,
/// the details page template, the startup check, and the installable app.
/// </summary>
public sealed class WebClientShellTests : IDisposable
{
    private const string Index = "<html><head><link href=\"1133.ab.css?v=1\" rel=\"stylesheet\"><link href=\"main.jellyfin.cd.css?v=1\" rel=\"stylesheet\">"
        + "<link href=\"../outside.css\" rel=\"stylesheet\"><style>.hide{display:none!important}</style></head></html>";

    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-shell-" + Guid.NewGuid().ToString("N"));

    public WebClientShellTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// The shell links the stylesheets index.html links, then the numbered ones found by what they hold, then the route ones.
    /// True: the shell is styled by the same rules, in the same order, as the web client.
    /// False: a part of the shell would be unstyled, or a later rule would lose to an earlier one.
    /// </summary>
    [Fact]
    public void Stylesheets_FollowTheWebClientsOrder()
    {
        WebClient();

        var list = WebClientAssets.Stylesheets(_dir, Index);

        Assert.Equal(["1133.ab.css?v=1", "main.jellyfin.cd.css?v=1", "200.aa.css", "300.bb.css", "400.cc.css", "search.11.css", "itemDetails.22.css", "list.33.css"], list);
    }

    /// <summary>
    /// The fonts are the Noto Sans faces and stacks with addresses moved under web/, the index rules are read, and the logo is found.
    /// True: the shell shows the web client's type and mark.
    /// False: the shell would fall back to the system font, or show no logo.
    /// </summary>
    [Fact]
    public void Shell_ReadsFontsIndexRulesAndLogo()
    {
        WebClient();

        var shell = WebClientAssets.Shell(_dir);

        Assert.Contains("url(web/noto.1.woff2)", shell.Fonts, StringComparison.Ordinal);
        Assert.Contains("html{font-family:Noto Sans,sans-serif}", shell.Fonts, StringComparison.Ordinal);
        Assert.DoesNotContain("Noto Sans JP", shell.Fonts, StringComparison.Ordinal);
        Assert.Equal(".hide{display:none!important}", shell.IndexStyle);
        Assert.Equal("icon-transparent.9.png", shell.LogoHref);
        Assert.Equal(12, shell.Fingerprint.Length);
        Assert.Same(WebClientShellAssets.None, WebClientAssets.Shell(Path.Join(_dir, "missing")));
    }

    /// <summary>
    /// A shell page links the web client's rules before the theme, Stolon's CSS after the theme, and no custom CSS of its own, which
    /// the page script adds after the content.
    /// True: the cascade is the web client's, then the theme, then Stolon and the plugin, then the custom CSS.
    /// False: the server's custom CSS would lose to Stolon's rules, or load for a viewer who turned it off.
    /// </summary>
    [Fact]
    public void RenderShell_OrdersTheCascade()
    {
        WebClient();
        var page = new HostedPage("myplugin", HostedPageAccess.User, HostedPageContent.Template("status")) { Frame = HostedPageFrame.WebClient };

        var html = page.RenderShell(new PathString("/myplugin/"), "Den", "abc", "en-us", null, WebClientAssets.Shell(_dir), null, null);

        var index = html.IndexOf("<style>.hide", StringComparison.Ordinal);
        var main = html.IndexOf("href=\"web/main.jellyfin.cd.css?v=1\"", StringComparison.Ordinal);
        var theme = html.IndexOf("stolon-shell-theme", StringComparison.Ordinal);
        var stolon = html.IndexOf("configurationpage?name=myplugin_stolon.css", StringComparison.Ordinal);
        var content = html.IndexOf("stolon-shell-content", StringComparison.Ordinal);
        Assert.True(index > 0 && index < main && main < theme && theme < stolon && stolon < content);
        Assert.DoesNotContain("Branding/Css", html, StringComparison.Ordinal);
        Assert.Contains("<base href=\"../\" />", html, StringComparison.Ordinal);
        Assert.Contains("content=\"abc\"", html, StringComparison.Ordinal);
        Assert.Contains("startWebClientShell", html, StringComparison.Ordinal);
        Assert.Contains("data-stolon-access=\"user\"", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The theme script keeps a theme name to letters, digits, hyphens, and underscores before it writes it into an address.
    /// True: a stored setting cannot break out of the theme's link.
    /// False: a crafted setting could load a stylesheet from anywhere.
    /// </summary>
    [Fact]
    public void Template_ChecksTheThemeName()
    {
        var html = TemplateLoader.Load("webclient");

        Assert.Contains("/^[A-Za-z0-9_-]{1,64}$/.test(picked)", html, StringComparison.Ordinal);
        Assert.Contains("'-appTheme'", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The mark, its icon, the server's name, and the content's values are encoded, and the details template is placed when asked for.
    /// True: nothing the plugin or a request passes becomes markup.
    /// False: a crafted value could run script on the server's origin.
    /// </summary>
    [Fact]
    public void RenderShell_EncodesAndPlacesTheDetailsTemplate()
    {
        var page = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status"))
        {
            Frame = HostedPageFrame.WebClient,
            Mark = "<b>\"Mine\"",
            MarkIcon = "search",
            Manifest = "myplugin/manifest.webmanifest"
        };

        var html = page.RenderShell(new PathString("/x"), "<Den>", null, "en-us", "favicon.1.ico", WebClientShellAssets.None, "<div id=\"itemDetailPage\"></div>", new Dictionary<string, string>(StringComparer.Ordinal) { ["HEADING"] = "<i>" });

        Assert.Contains("data-stolon-mark=\"&lt;b&gt;&quot;Mine&quot;\"", html, StringComparison.Ordinal);
        Assert.Contains("&lt;Den&gt;", html, StringComparison.Ordinal);
        Assert.Contains("&lt;i&gt;", html, StringComparison.Ordinal);
        Assert.Contains("<template id=\"stolon-shell-details\"><div id=\"itemDetailPage\"></div></template>", html, StringComparison.Ordinal);
        Assert.Contains("<link rel=\"manifest\" href=\"myplugin/manifest.webmanifest\" />", html, StringComparison.Ordinal);
        Assert.Contains("href=\"web/favicon.1.ico\"", html, StringComparison.Ordinal);
    }

    /// <summary>
    /// The user page frame stays the default, and Render draws a shell page in the shell.
    /// True: an existing page keeps its look, and a page that asks for the shell gets it.
    /// False: an invite page with no signed in viewer would draw an empty app bar.
    /// </summary>
    [Fact]
    public void Frame_DefaultsToTheUserPage()
    {
        var plain = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status"));
        var shell = new HostedPage("myplugin", HostedPageAccess.Anyone, HostedPageContent.Template("status")) { Frame = HostedPageFrame.WebClient };

        Assert.Equal(HostedPageFrame.UserPage, plain.Frame);
        Assert.Contains("stolon-user-page-column", plain.Render(new PathString("/x"), null, "en-us", null, string.Empty, null), StringComparison.Ordinal);
        Assert.Contains("class=\"stolon-shell\"", shell.Render(new PathString("/x"), null, "en-us", null, string.Empty, null), StringComparison.Ordinal);
    }

    /// <summary>
    /// Serve draws a shell page with the installed web client's stylesheets and the server's id.
    /// True: a controller serves the shell in one line.
    /// False: the shell would load none of the web client's look.
    /// </summary>
    [Fact]
    public void Serve_LinksTheInstalledWebClient()
    {
        WebClient();
        var host = Substitute.For<IServerApplicationHost>();
        host.FriendlyName.Returns("Den");
        host.SystemId.Returns("server1");
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        var services = Substitute.For<IServiceProvider>();
        services.GetService(typeof(IServerApplicationHost)).Returns(host);
        services.GetService(typeof(IServerApplicationPaths)).Returns(paths);
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Path = "/myplugin";
        var controller = new PageController { ControllerContext = new ControllerContext { HttpContext = context } };
        var page = new HostedPage("myplugin", HostedPageAccess.User, HostedPageContent.Template("status")) { Frame = HostedPageFrame.WebClient, DetailsTemplate = true };

        var html = page.Serve(controller).Content!;

        Assert.Contains("href=\"web/search.11.css\"", html, StringComparison.Ordinal);
        Assert.Contains("content=\"server1\"", html, StringComparison.Ordinal);
        Assert.Contains("<img src=\"web/icon-transparent.9.png\" alt=\"\" />", html, StringComparison.Ordinal);
        Assert.Contains("id=\"stolon-shell-details\"", html, StringComparison.Ordinal);
        Assert.Equal("no-store", context.Response.Headers["Cache-Control"]);
    }

    /// <summary>
    /// The details template is decoded from a script's string and cut down to plain markup.
    /// True: the page gets the web client's own details markup with nothing that runs.
    /// False: a script, a handler, or a script address in the chunk would reach the page.
    /// </summary>
    [Fact]
    public void DetailsTemplate_DecodesAndCleans()
    {
        var script = "x.default='<div id=\\\"itemDetailPage\\\" onclick=\\\"a()\\\"><script>bad()</script><a href=\\\"javascript:x\\\" class=\\\"y\\\">${Name}\\u0021</a>"
            + "<p style=\\\"background:url(x)\\\" data-ok=\\\"1\\\">t</p><svg><g/></svg><br></div>';";

        var raw = WebClientDetailsTemplate.Extract(script);
        var clean = WebClientDetailsTemplate.Sanitize(raw!);

        Assert.Equal("<div id=\"itemDetailPage\"><a class=\"y\">!</a><p data-ok=\"1\">t</p><br></div>", clean);
    }

    /// <summary>
    /// A tag that never ends is text, and an element that never closes takes the rest with it.
    /// True: broken markup cannot open a tag the cleaner did not check.
    /// False: an unfinished tag could slip through whole.
    /// </summary>
    [Fact]
    public void DetailsTemplate_HandlesBrokenMarkup()
    {
        Assert.Equal("a &lt;div class=\"x", WebClientDetailsTemplate.Sanitize("a <div class=\"x"));
        Assert.Equal("<p>a</p>", WebClientDetailsTemplate.Sanitize("<p>a</p><script>never closes <p>"));
        Assert.Equal("<p>b</p>", WebClientDetailsTemplate.Sanitize("<style>x</style ><p>b</p>"));
    }

    /// <summary>
    /// Stolon's copy has every part, and stands in when the web client has no template or one that lacks a part.
    /// True: the details page always draws.
    /// False: a web client update would leave an empty details page.
    /// </summary>
    [Fact]
    public void DetailsTemplate_FallsBackToStolonsCopy()
    {
        Assert.Empty(WebClientDetailsTemplate.Missing(WebClientDetailsTemplate.Fallback));
        Assert.Equal(WebClientDetailsTemplate.Fallback, WebClientDetailsTemplate.Load(Path.Join(_dir, "missing")));

        File.WriteAllText(Path.Join(_dir, "index.html"), Index);
        File.WriteAllText(Path.Join(_dir, "itemDetails-index-html.1.chunk.js"), "t.default='<div id=\"itemDetailPage\"><div class=\"itemBackdrop\"></div></div>'");
        Assert.Null(WebClientDetailsTemplate.Find(Path.Join(_dir, "missing")));
        Assert.Contains(".mainDetailButtons", WebClientDetailsTemplate.Missing(WebClientDetailsTemplate.Find(_dir)!));
        Assert.Equal(WebClientDetailsTemplate.Fallback, WebClientDetailsTemplate.Load(_dir));
    }

    /// <summary>
    /// Class attributes give whole names only, and a name joined to an expression in a script is left out.
    /// True: the check looks only for names the page really writes.
    /// False: part of a built name would be reported as missing.
    /// </summary>
    [Fact]
    public void ClassesIn_SkipsPartsOfBuiltNames()
    {
        var classes = WebClientCheck.ClassesIn("<div class=\"card portraitCard\"></div><script>x = '<div class=\"card ' + shape + 'Card cardBox\">';</script>");

        Assert.Equal(["card", "cardBox", "portraitCard"], classes);
    }

    /// <summary>
    /// A class is missing only when no stylesheet and no script of the web client names it. Stolon's and Material UI's never are.
    /// True: the warning names exactly the classes a web client update renamed.
    /// False: the log would cry wolf on every start, or miss a rename.
    /// </summary>
    [Fact]
    public void Missing_LooksInStylesheetsThenScripts()
    {
        var missing = WebClientCheck.Missing(["card", "itemAction", "gone", "MuiMenuItem-root", "stolon-shell"], ".card{x:1}", ["var a='itemActions itemAction';"]);

        Assert.Equal(["gone"], missing);
    }

    /// <summary>
    /// The shell's own classes are all in the installed kind of web client the fixtures model, and the build is noted and compared.
    /// True: a plugin's startup warns once after a Jellyfin update, and not on the first start.
    /// False: the warning would show on every start, or never.
    /// </summary>
    [Fact]
    public void NoteBuild_WarnsOnlyWhenTheBuildChanges()
    {
        var store = Path.Join(_dir, "config", "seen.json");
        File.WriteAllText(Path.Join(_dir, "index.html"), "one");

        Assert.Null(WebClientCheck.NoteBuild(_dir, store, null));
        Assert.Null(WebClientCheck.NoteBuild(_dir, store, null));
        File.WriteAllText(Path.Join(_dir, "index.html"), "two");
        var changed = WebClientCheck.NoteBuild(_dir, store, null);

        Assert.NotNull(changed);
        Assert.Equal(WebClientAssets.Fingerprint("one"), changed!.Value.Was);
        Assert.Equal(WebClientAssets.Fingerprint("two"), changed.Value.Now);
        Assert.Null(WebClientCheck.NoteBuild(Path.Join(_dir, "missing"), store, null));
    }

    /// <summary>
    /// The startup check logs a warning for a class the web client lacks and for a changed build, and never throws.
    /// True: an administrator reads in the log what to update.
    /// False: a renamed class would go unnoticed, or the check would stop the plugin starting.
    /// </summary>
    [Fact]
    public async Task RunAsync_LogsWhatItFinds()
    {
        WebClient();
        var config = Directory.CreateDirectory(Path.Join(_dir, "config")).FullName;
        var paths = Substitute.For<IServerApplicationPaths>();
        paths.WebPath.Returns(_dir);
        paths.PluginConfigurationsPath.Returns(config);
        var logger = new ListLogger();

        await WebClientCheck.RunAsync(paths, logger, "request page", "<div class=\"oldName\"></div>", ["builtName"], checkDetailsTemplate: true);
        await File.AppendAllTextAsync(Path.Join(_dir, "index.html"), "<!-- update -->");
        await WebClientCheck.RunAsync(paths, logger, "request page");
        paths.WebPath.Returns(Path.Join(_dir, "missing"));
        await WebClientCheck.RunAsync(paths, logger, "request page");

        var warnings = logger.Lines.Where(l => l.Level == LogLevel.Warning).Select(l => l.Text).ToList();
        Assert.Contains(warnings, w => w.Contains("builtName", StringComparison.Ordinal) && w.Contains("oldName", StringComparison.Ordinal) && !w.Contains("skinHeader", StringComparison.Ordinal) && w.Contains("request page", StringComparison.Ordinal));
        Assert.Contains(warnings, w => w.Contains("has no details page template", StringComparison.Ordinal));
        Assert.Single(warnings, w => w.Contains("The web client changed from build", StringComparison.Ordinal));
    }

    /// <summary>
    /// The manifest starts and scopes the app at the page's folder and lists its icons.
    /// True: a browser installs the page as an app that opens on it.
    /// False: the installed app would open the web client, or have no icon.
    /// </summary>
    [Fact]
    public void Manifest_DescribesTheApp()
    {
        var json = WebClientApp.Manifest("Jellyfin Things", "Things", "Things for Jellyfin", [new WebClientAppIcon("icons/192.png", "192x192"), new WebClientAppIcon("icons/m.png", "512x512", "maskable")]);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.Equal("./", root.GetProperty("start_url").GetString());
        Assert.Equal("./", root.GetProperty("scope").GetString());
        Assert.Equal("standalone", root.GetProperty("display").GetString());
        Assert.Equal("maskable", root.GetProperty("icons")[1].GetProperty("purpose").GetString());
        Assert.Equal("image/png", root.GetProperty("icons")[0].GetProperty("type").GetString());

        var response = new DefaultHttpContext().Response;
        var served = WebClientApp.ServeManifest(response, json);
        Assert.Equal("application/manifest+json", served.ContentType);
        Assert.Equal("nosniff", response.Headers["X-Content-Type-Options"]);
    }

    /// <summary>
    /// The worker names its caches after the plugin, loads the push script when asked, and refuses a prefix that could break its script.
    /// True: two plugins' apps keep separate caches and each shows its own notifications.
    /// False: one plugin's worker would clear another's cache, or a prefix could end the script's string.
    /// </summary>
    [Fact]
    public void ServiceWorker_IsNamedForThePlugin()
    {
        var script = WebClientApp.ServiceWorker("myplugin");

        Assert.StartsWith("importScripts('push-worker.js');", script, StringComparison.Ordinal);
        Assert.Contains("var CACHE = 'myplugin-v1';", script, StringComparison.Ordinal);
        Assert.Contains("key.indexOf('myplugin-') === 0", script, StringComparison.Ordinal);
        Assert.DoesNotContain("STOLON_CACHE_PREFIX", script, StringComparison.Ordinal);
        Assert.DoesNotContain("importScripts", WebClientApp.ServiceWorker("myplugin", null), StringComparison.Ordinal);
        Assert.Throws<ArgumentException>(() => WebClientApp.ServiceWorker("My'plugin"));

        var response = new DefaultHttpContext().Response;
        Assert.Equal("text/javascript; charset=utf-8", WebClientApp.ServeWorker(response, script).ContentType);
        Assert.Equal("no-cache", response.Headers.CacheControl);
    }

    // A web client folder with the files the shell reads.
    private void WebClient()
    {
        File.WriteAllText(Path.Join(_dir, "index.html"), Index);
        File.WriteAllText(Path.Join(_dir, "1133.ab.css"), ".card{}.cardBox{}");
        File.WriteAllText(Path.Join(_dir, "main.jellyfin.cd.css"), ".raised{}");
        File.WriteAllText(Path.Join(_dir, "100.ff.css"), ".unrelated{}");
        File.WriteAllText(Path.Join(_dir, "200.aa.css"), "html{font-size:93%}.layout-mobile{font-size:90%}");
        File.WriteAllText(Path.Join(_dir, "300.bb.css"), ".itemBackdrop:before{x:1}");
        File.WriteAllText(Path.Join(_dir, "400.cc.css"), ".emby-textarea{x:1}");
        File.WriteAllText(Path.Join(_dir, "500.dd.css"), "@font-face{font-family:Noto Sans;src:url(noto.1.woff2)}@font-face{font-family:Noto Sans JP;src:url(jp.woff2)}html{font-family:Noto Sans,sans-serif}");
        File.WriteAllText(Path.Join(_dir, "search.11.css"), ".searchFields{}");
        File.WriteAllText(Path.Join(_dir, "itemDetails.22.css"), ".detailRibbon{}");
        File.WriteAllText(Path.Join(_dir, "list.33.css"), ".x{}");
        File.WriteAllText(Path.Join(_dir, "icon-transparent.9.png"), "x");
        File.WriteAllText(Path.Join(_dir, "main.bundle.js"), "var c='skinHeader';");
    }

    private sealed class PageController : ControllerBase
    {
    }

    private sealed class ListLogger : ILogger
    {
        public List<(LogLevel Level, string Text)> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Lines)
            {
                Lines.Add((logLevel, formatter(state, exception)));
            }
        }
    }
}
