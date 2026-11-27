using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies the cascade the layout rules rely on: hidden stays hidden, a stack's gap wins over field spacing, and parts fit their frame.</summary>
/// <remarks>
/// The bundle joins the CSS files in name order, but no rule may rely on that, so each rule that must win across files is
/// pinned here by its specificity.
/// </remarks>
public class CssLayoutRulesTests
{
    private static readonly IReadOnlyDictionary<string, string> Sources = CssRules.KitSources();

    private static List<CssRules.Rule> Rules(string file) => CssRules.Parse(Sources[file], file);

    private static List<CssRules.Rule> AllRules() => Sources.SelectMany(s => CssRules.Parse(s.Value, s.Key)).ToList();

    private static CssRules.Rule RuleFor(string file, string selector)
    {
        var wanted = CssRules.Normalize(selector);
        var rule = Rules(file).FirstOrDefault(r => r.Selectors.Contains(wanted));
        Assert.True(rule != null, file + " must have a rule for " + selector + ".");
        return rule!;
    }

    private static string Value(CssRules.Rule rule, string property) =>
        rule.Declarations.LastOrDefault(d => d.Property == property)?.Value ?? string.Empty;

    private static int Compare(string a, string b) => CssRules.Specificity(a).CompareTo(CssRules.Specificity(b));

    /// <summary>
    /// Every rule that forces a display other than none is no more specific than stolon-hidden, or leaves out stolon-hidden
    /// and the hidden attribute itself.
    /// True: stolon-hidden and hidden hide any element, such as a fill button or a field label.
    /// False: a forced display would show an element its page hid, as a fill button once did.
    /// </summary>
    [Fact]
    public void ForcedDisplay_NeverOutranksHidden()
    {
        var faults = new List<string>();
        foreach (var rule in AllRules())
        {
            var display = Value(rule, "display");
            if (!display.Contains("!important", StringComparison.Ordinal) || display.StartsWith("none", StringComparison.Ordinal))
            {
                continue;
            }

            foreach (var selector in rule.Selectors)
            {
                var outranks = Compare(selector, ".stolon-hidden") > 0;
                var excludes = selector.Contains(":not(.stolon-hidden)", StringComparison.Ordinal) && selector.Contains(":not([hidden])", StringComparison.Ordinal);
                if (outranks && !excludes)
                {
                    faults.Add(rule.File + ": " + selector);
                }
            }
        }

        Assert.True(faults.Count == 0, "These rules force a display over stolon-hidden: " + string.Join(", ", faults));
    }

    /// <summary>
    /// The paginated table's status cell has a least width and no fixed basis.
    /// True: a long status such as Ignored (Copy to Link) widens its cell and its badge stays inside the row.
    /// False: a fixed width clips the badge, as it once did at 110 and 120 pixels.
    /// </summary>
    [Fact]
    public void StatusColumn_GrowsToFitItsBadge()
    {
        var css = CssRules.StripComments(Sources["paginated-table.css"]);
        var rules = CssRules.Parse(css, "paginated-table.css").Where(r => r.Selectors.Contains(".stolon-table-cell.stolon-table-cell-status")).ToList();
        Assert.NotEmpty(rules);
        foreach (var rule in rules)
        {
            var flex = Value(rule, "flex");
            Assert.True(flex.Length == 0 || flex.EndsWith("auto", StringComparison.Ordinal), "The status cell must size from its badge, not from a fixed basis: " + rule.Body);
            Assert.DoesNotContain("width:", rule.Body.Replace("min-width:", string.Empty, StringComparison.Ordinal), StringComparison.Ordinal);
        }

        Assert.Contains("min-width: calc(var(--stolon-size-large) * 3)", RuleFor("paginated-table.css", ".stolon-table-cell.stolon-table-cell-status").Body, StringComparison.Ordinal);
    }

    /// <summary>
    /// A dialog button keeps its label on one line, and its row wraps the buttons when they do not fit.
    /// True: Keep editing beside Discard stays on one line in a narrow dialog, with the buttons stacked.
    /// False: the label would break onto two lines inside a squeezed button.
    /// </summary>
    [Fact]
    public void DialogButtons_WrapInsteadOfTheirLabels()
    {
        var button = RuleFor("dialog.css", ".stolon-modal-button");
        Assert.Equal("nowrap", Value(button, "white-space"));
        Assert.Equal("max-content", Value(button, "min-width"));
        Assert.Equal("wrap", Value(RuleFor("dialog.css", ".stolon-modal-button-row"), "flex-wrap"));
    }

    /// <summary>
    /// A badge is capped at its container's width and ends in an ellipsis.
    /// True: a badge never runs past the edge of a narrow cell or card.
    /// False: a long label would spill out of its frame on a phone.
    /// </summary>
    [Fact]
    public void Badge_NeverOverflowsItsContainer()
    {
        var rule = RuleFor("badge.css", ".stolon-badge");
        Assert.Equal("100%", Value(rule, "max-width"));
        Assert.Equal("hidden", Value(rule, "overflow"));
        Assert.Equal("ellipsis", Value(rule, "text-overflow"));
        Assert.Equal("nowrap", Value(rule, "white-space"));
    }

    /// <summary>
    /// A count card in balanced rows drops its least width with a rule more specific than the card's own, and its count ends in an ellipsis.
    /// True: every card stays inside the column balanceRows gives it.
    /// False: the card's least width outweighs the balanced grid and the card runs past its column.
    /// </summary>
    [Fact]
    public void BalancedCards_ShrinkToTheirColumn()
    {
        const string Balanced = ".stolon-cards.stolon-balanced > .stolon-card";
        Assert.Equal("0", Value(RuleFor("count-cards.css", Balanced), "min-width"));
        foreach (var rule in AllRules().Where(r => r.Declarations.Any(d => d.Property == "min-width" && d.Value != "0")))
        {
            foreach (var selector in rule.Selectors.Where(s => s.EndsWith(".stolon-card", StringComparison.Ordinal) && s != Balanced))
            {
                Assert.True(Compare(Balanced, selector) > 0, Balanced + " must outrank " + selector + ".");
            }
        }

        Assert.Equal("var(--stolon-font-large)", Value(RuleFor("count-cards.css", ".stolon-cards.stolon-fit .stolon-card-count"), "font-size"));
        Assert.True(CssRules.Specificity(".stolon-cards.stolon-fit .stolon-card-count").CompareTo(CssRules.Specificity(".stolon-cards.stolon-compact .stolon-card-count")) >= 0);
        Assert.Equal("ellipsis", Value(RuleFor("count-cards.css", ".stolon-card-count"), "text-overflow"));
        Assert.Equal("normal", Value(RuleFor("count-cards.css", ".stolon-cards.stolon-words .stolon-card-count"), "white-space"));
    }

    /// <summary>
    /// A stack's rule that zeroes its children's margins outranks every forced margin the form fields set on one class.
    /// True: fields, descriptions, and kit blocks in a stack sit exactly one gap apart.
    /// False: the field spacing stacks on top of the gap, unevenly, as plugin pages once fixed by hand.
    /// </summary>
    [Fact]
    public void Stack_OutranksTheFieldSpacing()
    {
        var zero = new[] { ".pluginConfigurationPage .stolon-stack > [class]", ".pluginConfigurationPage .stolon-flow > [class]" };
        foreach (var selector in zero)
        {
            var rule = RuleFor("utility-classes.css", selector);
            Assert.Equal("0 !important", Value(rule, "margin-top"));
            Assert.Equal("0 !important", Value(rule, "margin-bottom"));
        }

        var spacing = Rules("form-fields.css")
            .Where(r => r.Declarations.Any(d => d.Property.StartsWith("margin", StringComparison.Ordinal) && d.Value.Contains("!important", StringComparison.Ordinal) && !d.Value.StartsWith("0 !", StringComparison.Ordinal)))
            .SelectMany(r => r.Selectors)
            .Where(s => s.StartsWith(".pluginConfigurationPage .", StringComparison.Ordinal) && s.Split(' ').Length == 2)
            .ToList();
        Assert.Contains(".pluginConfigurationPage .fieldDescription", spacing);
        Assert.Contains(".pluginConfigurationPage .inputContainer", spacing);
        foreach (var selector in spacing)
        {
            foreach (var z in zero)
            {
                Assert.True(Compare(z, selector) > 0, z + " must outrank " + selector + ".");
            }
        }
    }

    /// <summary>
    /// Inside a stack, the rules that keep a description tight to its field and give a subsection title room above outrank the zeroing rule.
    /// True: a description sits a narrow gap under its field, and a subsection title a second gap below the block above.
    /// False: the zeroing rule flattens both to one gap.
    /// </summary>
    [Fact]
    public void Stack_KeepsDescriptionsTightAndTitlesApart()
    {
        const string Zero = ".pluginConfigurationPage .stolon-stack > [class]";
        var tight = RuleFor("utility-classes.css", ".stolon-stack > :not(.stolon-subsection-title):not(.stolon-status-text):not(.stolon-hidden):not([hidden]) + .fieldDescription");
        Assert.Equal("calc(var(--stolon-gap-narrow) - var(--stolon-gap-wide)) !important", Value(tight, "margin-top"));
        Assert.True(Compare(tight.Selectors[0], Zero) > 0);

        const string Title = ".pluginConfigurationPage .stolon-stack > .stolon-subsection-title:not(:first-child)";
        Assert.Equal("var(--stolon-gap-wide) !important", Value(RuleFor("utility-classes.css", Title), "margin-top"));
        Assert.True(Compare(Title, Zero) > 0);

        Assert.Equal("none", Value(RuleFor("utility-classes.css", ".stolon-stack > .stolon-status-text:empty"), "display"));
    }

    /// <summary>
    /// The flow modifier lays out only an open section, so a closed one stays hidden.
    /// True: stolon-collapsed hides the content of a flowing section.
    /// False: the flex column would show a closed section's content.
    /// </summary>
    [Fact]
    public void Flow_LeavesAClosedSectionHidden()
    {
        var rule = RuleFor("utility-classes.css", ".stolon-flow:not(.stolon-collapsed)");
        Assert.Equal("flex", Value(rule, "display"));
        Assert.DoesNotContain(AllRules(), r => r.Selectors.Contains(".stolon-flow") && Value(r, "display").Length > 0);
    }

    /// <summary>
    /// The margin utilities outrank the field spacing, and tie a stack's zeroing rule while coming after it in the same file.
    /// True: stolon-gap-below-wide adds its gap on a config page, in a dialog, and inside a stack.
    /// False: the field spacing or the stack would take the margin back.
    /// </summary>
    [Fact]
    public void GapUtilities_WinOverFieldSpacingAndStacks()
    {
        var css = Sources["utility-classes.css"];
        var zeroAt = css.IndexOf(".pluginConfigurationPage .stolon-stack > [class]", StringComparison.Ordinal);
        foreach (var side in new[] { "above", "below" })
        {
            foreach (var size in new[] { "narrow", "wide" })
            {
                var selector = ".pluginConfigurationPage .stolon-gap-" + side + "-" + size + "[class]";
                var rule = RuleFor("utility-classes.css", selector);
                Assert.Equal("var(--stolon-gap-" + size + ") !important", Value(rule, side == "above" ? "margin-top" : "margin-bottom"));
                Assert.True(Compare(selector, ".pluginConfigurationPage .fieldDescription") > 0);
                Assert.True(Compare(selector, ".pluginConfigurationPage .stolon-stack > [class]") >= 0);
                Assert.True(css.IndexOf(selector, StringComparison.Ordinal) > zeroAt, selector + " must come after the stack's zeroing rule.");
            }
        }
    }

    /// <summary>
    /// An icon only button is a square at each size of the scale and drops its side padding over the size rules.
    /// True: an icon only button is as wide as it is tall.
    /// False: the size's side padding would widen it.
    /// </summary>
    [Fact]
    public void IconOnlyButton_IsSquare()
    {
        var css = Sources["button.css"];
        var rule = RuleFor("button.css", ".stolon-button.stolon-icon-only");
        Assert.Equal("var(--stolon-size-medium)", Value(rule, "width"));
        Assert.Equal("0 !important", Value(rule, "padding"));
        Assert.True(css.IndexOf(".stolon-button.stolon-icon-only {", StringComparison.Ordinal) > css.IndexOf(".stolon-button.stolon-small {", StringComparison.Ordinal));
        Assert.True(css.IndexOf(".stolon-button.stolon-icon-only {", StringComparison.Ordinal) > css.IndexOf(".stolon-button.stolon-field-sized {", StringComparison.Ordinal));
        Assert.Equal("var(--stolon-size-small)", Value(RuleFor("button.css", ".stolon-button.stolon-icon-only.stolon-small"), "width"));
        Assert.Equal("var(--stolon-size-large)", Value(RuleFor("button.css", ".stolon-button.stolon-icon-only.stolon-large"), "width"));
    }

    /// <summary>
    /// A record row wraps, its text keeps a least basis and takes nearly all the spare room, and its aside may shrink.
    /// True: a wide aside, such as an inline QR code, moves under the row's text instead of crushing it, and an aside that fills grows only on a line of its own.
    /// False: the aside takes the whole row and the title gets no room.
    /// </summary>
    [Fact]
    public void RecordAside_MovesUnderTheText()
    {
        Assert.Equal("wrap", Value(RuleFor("record-list.css", ".stolon-record-list-row"), "flex-wrap"));
        Assert.Equal("1000 1 calc(var(--stolon-size-large) * 4)", Value(RuleFor("record-list.css", ".stolon-record-list-body"), "flex"));
        Assert.Equal("1", Value(RuleFor("record-list.css", ".stolon-record-list-aside.stolon-fill"), "flex-grow"));
        var aside = RuleFor("record-list.css", ".stolon-record-list-aside");
        Assert.Equal("0 1 auto", Value(aside, "flex"));
        Assert.Equal("0", Value(aside, "min-width"));
        Assert.Equal("calc(var(--stolon-size-large) * 8)", Value(RuleFor("qr-code.css", ".stolon-record-list-aside > .stolon-qr-code.stolon-inline"), "width"));
    }

    /// <summary>
    /// The specificity helper counts ids, classes, attributes, pseudo-classes, :not() arguments, and types as CSS does.
    /// True: the cascade tests above compare real specificities.
    /// False: they would pass or fail on a miscount.
    /// </summary>
    [Theory]
    [InlineData(".stolon-hidden", 0, 1, 0)]
    [InlineData(".stolon-button.stolon-fill:not(.stolon-small)", 0, 3, 0)]
    [InlineData(".pluginConfigurationPage .inputContainer > label:not(.stolon-hidden):not([hidden]):not(:empty)", 0, 5, 1)]
    [InlineData("#page .stolon-stack > * + .fieldDescription", 1, 2, 0)]
    [InlineData("input[type=\"checkbox\"]::after", 0, 1, 2)]
    public void Specificity_CountsLikeCss(string selector, int ids, int classes, int types)
    {
        Assert.Equal((ids, classes, types), CssRules.Specificity(selector));
    }

    private static List<CssRules.Rule> PhoneRules(string file)
    {
        var css = Sources[file];
        var at = css.IndexOf("@media (max-width: 600px)", StringComparison.Ordinal);
        Assert.True(at >= 0, file + " must have a phone rule.");
        var open = css.IndexOf('{', at);
        var depth = 0;
        var end = open;
        for (; end < css.Length; end++)
        {
            if (css[end] == '{')
            {
                depth++;
            }
            else if (css[end] == '}' && --depth == 0)
            {
                break;
            }
        }

        return CssRules.Parse(css.Substring(open + 1, end - open - 1), file);
    }

    private static CssRules.Rule PhoneRuleFor(string file, string selector)
    {
        var wanted = CssRules.Normalize(selector);
        var rule = PhoneRules(file).FirstOrDefault(r => r.Selectors.Contains(wanted));
        Assert.True(rule != null, file + " must have a phone rule for " + selector + ".");
        return rule!;
    }

    /// <summary>
    /// On a phone a reset row wraps, its text takes the full width beside the tile, and the button moves under the text, starting where the text starts.
    /// True: the text reads in one wide column and the button sits under it.
    /// False: the text squeezes into a narrow column beside the button.
    /// </summary>
    [Fact]
    public void ResetRow_StacksTheButtonUnderTheTextOnAPhone()
    {
        Assert.Equal("wrap", Value(PhoneRuleFor("reset-group.css", ".stolon-reset-row"), "flex-wrap"));
        Assert.Equal("1 1 100%", Value(PhoneRuleFor("reset-group.css", ".stolon-reset-info"), "flex"));
        Assert.Equal("calc(100% - var(--stolon-size-large) - var(--stolon-gap-narrow))", Value(PhoneRuleFor("reset-group.css", ".stolon-reset-row > .stolon-collapsible-tile ~ .stolon-reset-info"), "flex-basis"));
        Assert.Equal("calc(var(--stolon-size-large) + var(--stolon-gap-narrow))", Value(PhoneRuleFor("reset-group.css", ".stolon-reset-row > .stolon-collapsible-tile ~ .stolon-reset-info ~ *"), "margin-left"));
    }

    /// <summary>
    /// A code block breaks a long path anywhere and never grows past its frame, with or without stolon-code.
    /// True: a long path wraps inside the block.
    /// False: the page scrolls sideways on a phone.
    /// </summary>
    [Fact]
    public void CodeBlock_BreaksALongPathInsideItsFrame()
    {
        var rule = RuleFor("code-block.css", ".stolon-code-block");

        Assert.Equal("pre-wrap", Value(rule, "white-space"));
        Assert.Equal("anywhere", Value(rule, "overflow-wrap"));
        Assert.Equal("100%", Value(rule, "max-width"));
        Assert.Equal("0", Value(rule, "min-width"));
        Assert.DoesNotContain(Rules("code-block.css"), r => r.Selectors.Any(s => s.Contains("stolon-code-block", StringComparison.Ordinal)) && Value(r, "white-space") == "pre");
    }

    /// <summary>
    /// On a phone a count takes a size step down from the scale, a compact count a step further, and a row that fitCounts marks takes the large text size, so a count fits its card before it needs an ellipsis.
    /// True: a long count such as 460.5 GB reads whole on a phone.
    /// False: it ends in an ellipsis.
    /// </summary>
    [Fact]
    public void CardCount_TakesASmallerSizeOnAPhone()
    {
        Assert.Equal("calc(var(--stolon-font-large) * 1.25)", Value(PhoneRuleFor("count-cards.css", ".stolon-card-count"), "font-size"));
        Assert.Equal("var(--stolon-font-large)", Value(PhoneRuleFor("count-cards.css", ".stolon-cards.stolon-compact .stolon-card-count"), "font-size"));
        Assert.Equal("var(--stolon-font-large)", Value(RuleFor("count-cards.css", ".stolon-cards.stolon-fit .stolon-card-count"), "font-size"));
        Assert.True(CssRules.Specificity(".stolon-cards.stolon-fit .stolon-card-count").CompareTo(CssRules.Specificity(".stolon-cards.stolon-compact .stolon-card-count")) >= 0);
        Assert.Equal("ellipsis", Value(RuleFor("count-cards.css", ".stolon-card-count"), "text-overflow"));
    }
}
