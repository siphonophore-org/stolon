using System;
using System.Buffers;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Siphonophore.Stolon;

/// <summary>
/// The web client's details page template, <c>src/controllers/itemDetails/index.html</c> in jellyfin-web, read from the installed web client,
/// so a web client shell page lays out an item's details with the markup the web client itself uses. Any item fits it, such as a movie,
/// a show, or a person.
/// </summary>
/// <remarks>
/// The web client ships the template as a string in one of its script chunks. It is found by what it holds, decoded as the JavaScript string
/// it is, never run, and cut down to plain markup: no scripts, no event handlers, no script addresses, and only an allowed set of elements
/// and attributes. When the web client has none, or one that lacks a part the page fills in, Stolon's copy from jellyfin-web 12.4 stands in.
/// </remarks>
public static partial class WebClientDetailsTemplate
{
    /// <summary>What marks the template, its page's id.</summary>
    internal const string Marker = "id=\"itemDetailPage\"";

    // A file larger than this is not read. The template's chunk is a few kilobytes, and only the main bundle is bigger than a few megabytes.
    private const long MaxFileBytes = 8 * 1024 * 1024;

    // The classes and ids adoptDetailsTemplate fills in. Without any of them the page cannot use the template.
    private static readonly string[] RequiredClasses =
    [
        "itemBackdrop", "detailLogo", "detailPageWrapperContainer", "detailPagePrimaryContainer", "detailImageContainer", "detailRibbon",
        "infoWrapper", "nameContainer", "itemMiscInfo-primary", "mainDetailButtons", "detailPagePrimaryContent", "detailSection",
        "trackSelections", "detailSectionContent", "tagline", "overview", "overview-controls", "overview-expand", "itemExternalLinks",
        "itemDetailsGroup", "detailPageSecondaryContainer"
    ];

    private static readonly string[] RequiredIds =
    [
        "itemDetailPage", "itemBirthday", "itemBirthLocation", "itemDeathDate", "listChildrenCollapsible", "childrenContent", "castCollapsible", "similarCollapsible"
    ];

    // The elements kept. Any other is dropped with its text kept, and the ones in DropWithContent with everything inside.
    private static readonly HashSet<string> AllowedTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "a", "button", "form", "select", "option", "label", "bdi", "br", "ul", "li", "b", "i", "em", "strong"
    };

    private static readonly HashSet<string> DropWithContent = new(StringComparer.OrdinalIgnoreCase)
    {
        "script", "style", "template", "iframe", "frame", "frameset", "object", "embed", "noscript", "svg", "math", "textarea", "title", "xmp", "noembed", "noframes", "plaintext"
    };

    private static readonly HashSet<string> AllowedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "id", "class", "style", "title", "href", "type", "role", "dir", "label", "tabindex", "for", "name", "value", "disabled", "hidden"
    };

    private static readonly SearchValues<char> HexDigits = SearchValues.Create("0123456789abcdefABCDEF");

    private const char LineSeparator = (char)0x2028;
    private const char ParagraphSeparator = (char)0x2029;

    private static readonly object Gate = new();
    private static (string Root, long Stamp, string Html)? _kept;

    /// <summary>
    /// Gets the template to use: the installed web client's when it has every part the page fills in, and Stolon's copy otherwise.
    /// The answer is kept until the web client's <c>index.html</c> changes.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <returns>The template's markup.</returns>
    public static string Load(string? webPath)
    {
        var stamp = Stamp(webPath);
        var root = stamp is null ? string.Empty : Path.GetFullPath(webPath!);
        lock (Gate)
        {
            if (stamp is not null && _kept is { } kept && kept.Root == root && kept.Stamp == stamp)
            {
                return kept.Html;
            }
        }

        var found = Find(webPath);
        var html = found is not null && Missing(found).Count == 0 ? found : Fallback;
        if (stamp is not null)
        {
            lock (Gate)
            {
                _kept = (root, stamp.Value, html);
            }
        }

        return html;
    }

    /// <summary>Gets Stolon's copy of the template, from jellyfin-web 12.4.</summary>
    public static string Fallback => TemplateLoader.Load("webclient-details");

    /// <summary>
    /// Finds the template in the web client's folder, decoded and cleaned.
    /// </summary>
    /// <param name="webPath">The web client's folder.</param>
    /// <returns>The template's markup, or <c>null</c> when no script holds it.</returns>
    public static string? Find(string? webPath)
    {
        try
        {
            if (string.IsNullOrEmpty(webPath) || !Directory.Exists(webPath))
            {
                return null;
            }

            // The chunk is named after the template in the builds Stolon knows, so it is read first.
            var files = Directory.EnumerateFiles(webPath, "*.js")
                .OrderBy(f => Path.GetFileName(f).StartsWith("itemDetails-index-html.", StringComparison.Ordinal) ? 0 : 1)
                .ThenBy(f => f, StringComparer.Ordinal);
            foreach (var file in files)
            {
                if (new FileInfo(file).Length > MaxFileBytes)
                {
                    continue;
                }

                var text = File.ReadAllText(file);
                if (text.Contains("itemDetailPage", StringComparison.Ordinal) && Extract(text) is { } raw)
                {
                    return Sanitize(raw);
                }
            }
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }

        return null;
    }

    /// <summary>
    /// Lists what a template lacks of the parts the page fills in, as <c>.class</c> and <c>#id</c>.
    /// </summary>
    /// <param name="html">The cleaned template.</param>
    /// <returns>The missing parts, empty when it has them all.</returns>
    public static IReadOnlyList<string> Missing(string html)
    {
        ArgumentNullException.ThrowIfNull(html);
        var classes = new HashSet<string>(ClassValue().Matches(html).SelectMany(m => m.Groups[1].Value.Split(' ', StringSplitOptions.RemoveEmptyEntries)), StringComparer.Ordinal);
        var ids = new HashSet<string>(IdValue().Matches(html).Select(m => m.Groups[1].Value), StringComparer.Ordinal);
        return RequiredClasses.Where(c => !classes.Contains(c)).Select(c => "." + c)
            .Concat(RequiredIds.Where(i => !ids.Contains(i)).Select(i => "#" + i))
            .ToList();
    }

    /// <summary>
    /// Reads the template's markup from a script, the string assigned to a default export that holds the details page.
    /// </summary>
    /// <param name="script">The script's text.</param>
    /// <returns>The decoded string, not yet cleaned, or <c>null</c>.</returns>
    internal static string? Extract(string script)
    {
        ArgumentNullException.ThrowIfNull(script);
        foreach (Match m in DefaultAssignment().Matches(script))
        {
            var decoded = DecodeStringLiteral(script, m.Index + m.Length, m.Groups[1].Value[0], out _);
            if (decoded is not null && decoded.Contains(Marker, StringComparison.Ordinal))
            {
                return decoded;
            }
        }

        return null;
    }

    /// <summary>
    /// Decodes a JavaScript string literal whose opening quote has just been read.
    /// </summary>
    /// <param name="text">The script.</param>
    /// <param name="start">Where the string's content starts, just after its opening quote.</param>
    /// <param name="quote">The quote it opened with.</param>
    /// <param name="end">Where it ended, just after its closing quote, or -1.</param>
    /// <returns>The string, or <c>null</c> when it does not end or holds an escape a string cannot.</returns>
    internal static string? DecodeStringLiteral(string text, int start, char quote, out int end)
    {
        ArgumentNullException.ThrowIfNull(text);
        var sb = new StringBuilder();
        end = -1;
        for (var i = start; i < text.Length; i++)
        {
            var c = text[i];
            if (c == quote)
            {
                end = i + 1;
                return sb.ToString();
            }

            if (c is '\n' or '\r')
            {
                return null;
            }

            if (c != '\\')
            {
                sb.Append(c);
                continue;
            }

            if (++i >= text.Length)
            {
                return null;
            }

            var e = text[i];
            switch (e)
            {
                case 'n': sb.Append('\n'); break;
                case 'r': sb.Append('\r'); break;
                case 't': sb.Append('\t'); break;
                case 'b': sb.Append('\b'); break;
                case 'f': sb.Append('\f'); break;
                case 'v': sb.Append('\v'); break;
                case '0' when i + 1 >= text.Length || !char.IsAsciiDigit(text[i + 1]): sb.Append('\0'); break;
                case 'x':
                    if (!TryHex(text, i + 1, 2, out var x))
                    {
                        return null;
                    }

                    sb.Append((char)x);
                    i += 2;
                    break;
                case 'u':
                    if (!AppendUnicode(text, ref i, sb))
                    {
                        return null;
                    }

                    break;
                case '\r':
                    // A line continuation stands for nothing.
                    if (i + 1 < text.Length && text[i + 1] == '\n')
                    {
                        i++;
                    }

                    break;
                case '\n' or LineSeparator or ParagraphSeparator:
                    break;
                case >= '1' and <= '9':
                    // An octal escape is not allowed in the strict mode chunks the web client ships.
                    return null;
                default:
                    sb.Append(e);
                    break;
            }
        }

        return null;
    }

    /// <summary>
    /// Cuts the template down to plain markup: only the allowed elements and attributes, no active content, no event handlers, no address
    /// other than a page, web, or relative one, no style that loads anything, and none of the web client's untranslated placeholders.
    /// </summary>
    /// <param name="html">The template.</param>
    /// <returns>The cleaned markup.</returns>
    internal static string Sanitize(string html)
    {
        ArgumentNullException.ThrowIfNull(html);
        html = Placeholder().Replace(html, string.Empty);
        var sb = new StringBuilder(html.Length);
        var i = 0;
        while (i < html.Length)
        {
            var lt = html.IndexOf('<', i);
            if (lt < 0)
            {
                sb.Append(Text(html[i..]));
                break;
            }

            sb.Append(Text(html[i..lt]));
            if (string.CompareOrdinal(html, lt, "<!--", 0, 4) == 0)
            {
                var close = html.IndexOf("-->", lt + 4, StringComparison.Ordinal);
                i = close < 0 ? html.Length : close + 3;
                continue;
            }

            if (ReadTag(html, lt) is not { } tag)
            {
                sb.Append("&lt;");
                i = lt + 1;
                continue;
            }

            i = tag.End;
            if (DropWithContent.Contains(tag.Name))
            {
                if (!tag.Closing)
                {
                    i = AfterClosing(html, i, tag.Name);
                }

                continue;
            }

            if (!AllowedTags.Contains(tag.Name))
            {
                continue;
            }

            var lower = tag.Name.ToLowerInvariant();
            if (tag.Closing)
            {
                if (lower != "br")
                {
                    sb.Append("</").Append(lower).Append('>');
                }

                continue;
            }

            sb.Append('<').Append(lower);
            foreach (var (name, value) in tag.Attributes)
            {
                var attr = name.ToLowerInvariant();
                if (!IsAllowed(attr, value))
                {
                    continue;
                }

                sb.Append(' ').Append(attr);
                if (value is not null)
                {
                    sb.Append("=\"").Append(value.Replace("\"", "&quot;", StringComparison.Ordinal).Replace("<", "&lt;", StringComparison.Ordinal).Replace(">", "&gt;", StringComparison.Ordinal)).Append('"');
                }
            }

            sb.Append('>');
        }

        return sb.ToString();
    }

    // Reads one tag at lt, with its name and attributes, reading each character once. Null when the text there is not a whole tag.
    private static Tag? ReadTag(string html, int lt)
    {
        var i = lt + 1;
        var closing = i < html.Length && html[i] == '/';
        if (closing)
        {
            i++;
        }

        var nameStart = i;
        if (i >= html.Length || !char.IsAsciiLetter(html[i]))
        {
            return null;
        }

        while (i < html.Length && (char.IsAsciiLetterOrDigit(html[i]) || html[i] == '-'))
        {
            i++;
        }

        var name = html[nameStart..i];
        var attributes = new List<(string Name, string? Value)>();
        while (i < html.Length)
        {
            var before = i;
            while (i < html.Length && char.IsWhiteSpace(html[i]))
            {
                i++;
            }

            if (i >= html.Length)
            {
                return null;
            }

            if (html[i] == '>')
            {
                return new Tag(name, closing, attributes, i + 1);
            }

            if (html[i] == '/' && i + 1 < html.Length && html[i + 1] == '>')
            {
                return new Tag(name, closing, attributes, i + 2);
            }

            if (i == before)
            {
                return null;
            }

            var attrStart = i;
            while (i < html.Length && !char.IsWhiteSpace(html[i]) && html[i] is not ('"' or '\'' or '>' or '/' or '='))
            {
                i++;
            }

            if (i == attrStart)
            {
                return null;
            }

            var attr = html[attrStart..i];
            var at = i;
            while (at < html.Length && char.IsWhiteSpace(html[at]))
            {
                at++;
            }

            if (at >= html.Length || html[at] != '=')
            {
                attributes.Add((attr, null));
                continue;
            }

            i = at + 1;
            while (i < html.Length && char.IsWhiteSpace(html[i]))
            {
                i++;
            }

            if (i >= html.Length)
            {
                return null;
            }

            if (html[i] is '"' or '\'')
            {
                var close = html.IndexOf(html[i], i + 1);
                if (close < 0)
                {
                    return null;
                }

                attributes.Add((attr, html[(i + 1)..close]));
                i = close + 1;
                continue;
            }

            var valueStart = i;
            while (i < html.Length && !char.IsWhiteSpace(html[i]) && html[i] is not ('"' or '\'' or '=' or '<' or '>' or '`'))
            {
                i++;
            }

            if (i == valueStart)
            {
                return null;
            }

            attributes.Add((attr, html[valueStart..i]));
        }

        return null;
    }

    // Where the text after an element's closing tag starts, or the end when it never closes.
    private static int AfterClosing(string html, int from, string name)
    {
        var at = from;
        while ((at = html.IndexOf("</" + name, at, StringComparison.OrdinalIgnoreCase)) >= 0)
        {
            var i = at + 2 + name.Length;
            while (i < html.Length && char.IsWhiteSpace(html[i]))
            {
                i++;
            }

            if (i < html.Length && html[i] == '>')
            {
                return i + 1;
            }

            at = i;
        }

        return html.Length;
    }

    private static string Text(string text) => text.Replace("<", "&lt;", StringComparison.Ordinal).Replace(">", "&gt;", StringComparison.Ordinal);

    private static bool IsAllowed(string attr, string? value)
    {
        if (!AllowedAttributes.Contains(attr) && !attr.StartsWith("data-", StringComparison.Ordinal) && !attr.StartsWith("aria-", StringComparison.Ordinal))
        {
            return false;
        }

        if (attr.StartsWith("data-", StringComparison.Ordinal) && !DataName().IsMatch(attr))
        {
            return false;
        }

        if (value is null)
        {
            return true;
        }

        // What a browser reads the value as, with entities decoded and the spaces and control characters it skips in an address taken out.
        var plain = Spaces().Replace(WebUtility.HtmlDecode(value), string.Empty).ToLowerInvariant();
        if (attr == "href")
        {
            return plain.Length == 0 || plain[0] is '#' or '/' or '.' || plain.StartsWith("https:", StringComparison.Ordinal) || plain.StartsWith("http:", StringComparison.Ordinal)
                || !Scheme().IsMatch(plain);
        }

        if (attr == "style")
        {
            return !plain.Contains("url(", StringComparison.Ordinal) && !plain.Contains("expression", StringComparison.Ordinal) && !plain.Contains("javascript:", StringComparison.Ordinal)
                && !plain.Contains("@import", StringComparison.Ordinal) && !plain.Contains('\\', StringComparison.Ordinal);
        }

        return !plain.Contains("javascript:", StringComparison.Ordinal) && !plain.Contains("vbscript:", StringComparison.Ordinal);
    }

    private static bool AppendUnicode(string text, ref int i, StringBuilder sb)
    {
        if (i + 1 < text.Length && text[i + 1] == '{')
        {
            var close = text.IndexOf('}', i + 2);
            if (close < 0 || close - (i + 2) is < 1 or > 6 || !TryHex(text, i + 2, close - (i + 2), out var cp) || cp > 0x10FFFF || cp is >= 0xD800 and <= 0xDFFF)
            {
                return false;
            }

            sb.Append(char.ConvertFromUtf32(cp));
            i = close;
            return true;
        }

        if (!TryHex(text, i + 1, 4, out var u))
        {
            return false;
        }

        sb.Append((char)u);
        i += 4;
        return true;
    }

    private static bool TryHex(string text, int at, int length, out int value)
    {
        value = 0;
        return at + length <= text.Length
            && text.AsSpan(at, length).IndexOfAnyExcept(HexDigits) < 0
            && int.TryParse(text.AsSpan(at, length), NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out value);
    }

    private static long? Stamp(string? webPath)
    {
        try
        {
            if (string.IsNullOrEmpty(webPath))
            {
                return null;
            }

            var index = Path.Join(webPath, "index.html");
            return File.Exists(index) ? File.GetLastWriteTimeUtc(index).Ticks : null;
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    [GeneratedRegex(@"\.default\s*=\s*(['""])")]
    private static partial Regex DefaultAssignment();

    [GeneratedRegex(@"\$\{[A-Za-z0-9_]+\}")]
    private static partial Regex Placeholder();

    [GeneratedRegex(@"^data-[a-z0-9-]+$")]
    private static partial Regex DataName();

    [GeneratedRegex(@"[\s\x00-\x1f\x7f]+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"^[a-z][a-z0-9+.-]*:")]
    private static partial Regex Scheme();

    [GeneratedRegex(@"(?<![\w-])class=""([^""]*)""")]
    private static partial Regex ClassValue();

    [GeneratedRegex(@"(?<![\w-])id=""([^""]*)""")]
    private static partial Regex IdValue();

    private sealed record Tag(string Name, bool Closing, List<(string Name, string? Value)> Attributes, int End);
}
