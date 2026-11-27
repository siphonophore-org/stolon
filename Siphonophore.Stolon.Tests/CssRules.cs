using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace Siphonophore.Stolon.Tests;

/// <summary>
/// Just enough of a CSS reader for the kit's own sources: style rules with their selector lists and declarations, and
/// whether each sits inside an <c>@supports (color: color-mix(...))</c> block. Comments are dropped first.
/// </summary>
internal static class CssRules
{
    internal sealed record Declaration(string Property, string Value);

    internal sealed record Rule(string File, IReadOnlyList<string> Selectors, IReadOnlyList<Declaration> Declarations, bool InColorMixSupports)
    {
        public string Body => string.Join("; ", Declarations.Select(d => d.Property + ": " + d.Value));
    }

    /// <summary>The kit's per-component CSS sources, embedded by the test project, keyed by file name.</summary>
    public static IReadOnlyDictionary<string, string> KitSources()
    {
        var asm = typeof(CssRules).Assembly;
        var sources = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var name in asm.GetManifestResourceNames().Where(n => n.Contains(".Css.", StringComparison.Ordinal) && n.EndsWith(".css", StringComparison.Ordinal)))
        {
            using var stream = asm.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            sources[name.Substring(name.IndexOf(".Css.", StringComparison.Ordinal) + 5)] = reader.ReadToEnd();
        }

        return sources;
    }

    public static List<Rule> Parse(string css, string file = "")
    {
        var rules = new List<Rule>();
        Walk(StripComments(css), file, false, rules);
        return rules;
    }

    /// <summary>The declarations of the first rule whose selector list names <paramref name="selector"/>, or null.</summary>
    public static string? BodyFor(string css, string selector)
    {
        var wanted = Normalize(selector);
        return Parse(css).FirstOrDefault(r => r.Selectors.Contains(wanted))?.Body;
    }

    /// <summary>
    /// The specificity of one selector as (ids, classes, types), where attributes and pseudo-classes count as classes,
    /// a pseudo-element counts as a type, and <c>:not()</c> counts its argument. Compare two with <c>CompareTo</c>.
    /// </summary>
    public static (int Ids, int Classes, int Types) Specificity(string selector)
    {
        int ids = 0, classes = 0, types = 0;
        var s = Regex.Replace(selector, @":not\(([^()]*)\)", "$1");
        s = Regex.Replace(s, @"\[[^\]]*\]", _ => { classes++; return " "; });
        s = Regex.Replace(s, @"::[\w-]+", _ => { types++; return " "; });
        s = Regex.Replace(s, @":[\w-]+(\([^)]*\))?", _ => { classes++; return " "; });
        s = Regex.Replace(s, @"#[\w-]+", _ => { ids++; return " "; });
        s = Regex.Replace(s, @"\.[\w-]+", _ => { classes++; return " "; });
        types += Regex.Count(s, @"[A-Za-z][\w-]*");
        return (ids, classes, types);
    }

    public static string StripComments(string css) => Regex.Replace(css, @"/\*.*?\*/", string.Empty, RegexOptions.Singleline);

    public static string Normalize(string selector) => Regex.Replace(selector.Trim(), @"\s+", " ");

    private static void Walk(string text, string file, bool inSupports, List<Rule> rules)
    {
        var i = 0;
        while (i < text.Length)
        {
            var open = text.IndexOf('{', i);
            if (open < 0)
            {
                break;
            }

            var prelude = text.Substring(i, open - i).Trim();
            var close = MatchingBrace(text, open);
            var inner = text.Substring(open + 1, close - open - 1);
            if (prelude.StartsWith('@'))
            {
                var supports = inSupports || Regex.IsMatch(prelude, @"^@supports\s*\(\s*color\s*:\s*color-mix\(");
                Walk(inner, file, supports, rules);
            }
            else
            {
                var selectors = prelude.Split(',').Select(Normalize).Where(s => s.Length > 0).ToList();
                var declarations = inner.Split(';')
                    .Select(d => d.Trim())
                    .Where(d => d.Contains(':', StringComparison.Ordinal))
                    .Select(d =>
                    {
                        var colon = d.IndexOf(':', StringComparison.Ordinal);
                        return new Declaration(d.Substring(0, colon).Trim(), d.Substring(colon + 1).Trim());
                    })
                    .ToList();
                rules.Add(new Rule(file, selectors, declarations, inSupports));
            }

            i = close + 1;
        }
    }

    private static int MatchingBrace(string text, int open)
    {
        var depth = 0;
        for (var i = open; i < text.Length; i++)
        {
            if (text[i] == '{')
            {
                depth++;
            }
            else if (text[i] == '}' && --depth == 0)
            {
                return i;
            }
        }

        throw new FormatException("Unbalanced braces in CSS.");
    }
}
