using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using MediaBrowser.Controller;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Siphonophore.Stolon;

/// <summary>
/// The web client's look for author content a plugin shows in a frame, such as a page an administrator wrote: the web client's
/// Noto Sans and Material Icons faces from the installed web client, its dark theme colors, light text on its dark background,
/// its link color, headings, tables, fields, and buttons. It comes from the <c>webclient-content</c> template.
/// </summary>
/// <remarks>
/// The style reads the <c>--jf-palette-*</c> variables first, so a document that sets them follows another theme. The font
/// addresses are relative to the page that holds the frame, since a <c>srcdoc</c> frame resolves addresses against it. When the
/// content is fetched from another path than the page that shows it, such as <c>/pages/{slug}/user</c> for the page at
/// <c>/pages/{slug}</c>, pass the holding page's path.
/// </remarks>
public static partial class WebClientContentStyle
{
    /// <summary>
    /// Writes the style block for a frame on the page the request opened.
    /// </summary>
    /// <param name="controller">The controller whose request serves the page that holds the frame.</param>
    /// <returns>A <c>style</c> element.</returns>
    public static string Style(ControllerBase controller)
    {
        ArgumentNullException.ThrowIfNull(controller);
        var paths = controller.HttpContext?.RequestServices?.GetService(typeof(IServerApplicationPaths)) as IServerApplicationPaths;
        var path = controller.HttpContext?.Request.Path ?? default;
        return Render(paths?.WebPath, HostedPage.RootFor(path));
    }

    /// <summary>
    /// Writes the style block for a frame on another page than the one the request opened, such as content a page fetches from
    /// a deeper path and writes into itself.
    /// </summary>
    /// <param name="controller">The controller whose request serves the content.</param>
    /// <param name="holdingPagePath">The path of the page that shows the content, without the server's base path, such as <c>/pages/hello</c>.</param>
    /// <returns>A <c>style</c> element.</returns>
    public static string Style(ControllerBase controller, string holdingPagePath)
    {
        ArgumentNullException.ThrowIfNull(controller);
        ArgumentException.ThrowIfNullOrEmpty(holdingPagePath);
        var paths = controller.HttpContext?.RequestServices?.GetService(typeof(IServerApplicationPaths)) as IServerApplicationPaths;
        return Render(paths?.WebPath, HostedPage.RootFor(new PathString(holdingPagePath.StartsWith('/') ? holdingPagePath : "/" + holdingPagePath)));
    }

    /// <summary>
    /// Puts the style block first in a document's head, so the author's own styles after it win. A document with no head gets it
    /// before everything else.
    /// </summary>
    /// <param name="controller">The controller whose request serves the page that holds the frame.</param>
    /// <param name="html">The author's document.</param>
    /// <returns>The document with the style block.</returns>
    public static string Inject(ControllerBase controller, string html)
    {
        ArgumentNullException.ThrowIfNull(html);
        return InjectInto(html, Style(controller));
    }

    /// <summary>
    /// Puts the style block for another page than the one the request opened first in a document's head, as
    /// <see cref="Style(ControllerBase, string)"/> writes it.
    /// </summary>
    /// <param name="controller">The controller whose request serves the content.</param>
    /// <param name="html">The author's document.</param>
    /// <param name="holdingPagePath">The path of the page that shows the content, without the server's base path, such as <c>/pages/hello</c>.</param>
    /// <returns>The document with the style block.</returns>
    public static string Inject(ControllerBase controller, string html, string holdingPagePath)
    {
        ArgumentNullException.ThrowIfNull(html);
        return InjectInto(html, Style(controller, holdingPagePath));
    }

    /// <summary>
    /// Writes the style block with the fonts of the web client in a folder.
    /// </summary>
    /// <param name="webPath">The web client's folder, or <c>null</c> when it is not known.</param>
    /// <param name="root">The server root relative to the page that holds the frame, ending in a slash, such as <c>../</c>.</param>
    /// <returns>A <c>style</c> element.</returns>
    internal static string Render(string? webPath, string root)
    {
        var fonts = string.Empty;
        if (!string.IsNullOrEmpty(webPath))
        {
            var shell = WebClientAssets.Shell(webPath);
            var icons = WebClientAssets.For(webPath).IconFace;
            fonts = WebAddress().Replace(shell.Fonts + (icons.Length > 0 ? "\n" + icons : string.Empty), m => "url(" + m.Groups[1].Value + root + "web/");
        }

        return TemplateLoader.Fill("webclient-content", new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["FONTS"] = fonts.Replace("</", "<\\/", StringComparison.Ordinal)
        }).Trim();
    }

    /// <summary>
    /// Puts a style block first in a document's head, or before everything else when it has none.
    /// </summary>
    /// <param name="html">The document.</param>
    /// <param name="style">The style block.</param>
    /// <returns>The document with the style block.</returns>
    internal static string InjectInto(string html, string style)
    {
        var head = HeadPattern().Match(html);
        if (head.Success)
        {
            return html.Insert(head.Index + head.Length, style);
        }

        var root = HtmlPattern().Match(html);
        return root.Success ? html.Insert(root.Index + root.Length, style) : style + html;
    }

    [GeneratedRegex("url\\(([\"']?)web/")]
    private static partial Regex WebAddress();

    [GeneratedRegex("<head(?:\\s[^>]*)?>", RegexOptions.IgnoreCase)]
    private static partial Regex HeadPattern();

    [GeneratedRegex("<html(?:\\s[^>]*)?>", RegexOptions.IgnoreCase)]
    private static partial Regex HtmlPattern();
}
