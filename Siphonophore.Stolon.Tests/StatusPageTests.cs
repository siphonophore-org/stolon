using Siphonophore.Stolon;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="StatusPage"/> renders the shared status card with every value encoded and no template token left over.</summary>
public class StatusPageTests
{
    /// <summary>
    /// The heading and message appear in the card and no template token is left in the output.
    /// True: the page shows what the plugin passed.
    /// False: a literal token would show on the page.
    /// </summary>
    [Fact]
    public void Render_FillsHeadingAndMessage_AndLeavesNoTokens()
    {
        var html = StatusPage.Render("Sign in required", "Please sign in.");

        Assert.Contains("Sign in required", html, System.StringComparison.Ordinal);
        Assert.Contains("Please sign in.", html, System.StringComparison.Ordinal);
        Assert.Contains("stolon-status-page-card", html, System.StringComparison.Ordinal);
        // The content slot defaults to empty, so it must not leak as a literal token.
        Assert.DoesNotContain("{{", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The heading and message are HTML encoded.
    /// True: text from a request cannot inject markup.
    /// False: a tag in the heading would render as markup.
    /// </summary>
    [Fact]
    public void Render_EncodesHtml()
    {
        var html = StatusPage.Render("<b>x</b>", "a & b");
        Assert.Contains("&lt;b&gt;x&lt;/b&gt;", html, System.StringComparison.Ordinal);
        Assert.Contains("a &amp; b", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The spinner and the action button appear only when asked for.
    /// True: a plain message page shows neither.
    /// False: an unwanted spinner or button would show.
    /// </summary>
    [Fact]
    public void Render_SpinnerAndButtonAreOptional()
    {
        // The assertions look for the elements, since the template's style block always defines the classes.
        var withButton = StatusPage.Render("H", "M", buttonText: "Back", buttonHref: "../web/", showSpinner: true);
        Assert.Contains("<div class=\"stolon-spinner\"", withButton, System.StringComparison.Ordinal);
        Assert.Contains("<a class=\"stolon-btn\"", withButton, System.StringComparison.Ordinal);
        Assert.Contains("../web/", withButton, System.StringComparison.Ordinal);

        var noButton = StatusPage.Render("H", "M", buttonText: null, buttonHref: null);
        Assert.DoesNotContain("<a class=\"stolon-btn\"", noButton, System.StringComparison.Ordinal);
        Assert.DoesNotContain("<div class=\"stolon-spinner\"", noButton, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The shared card template keeps the rules and tokens a page depends on.
    /// True: a missing hidden rule or favicon link is caught here.
    /// False: a broken template would ship.
    /// </summary>
    [Theory]
    [InlineData(".stolon-hidden{display:none}")]
    [InlineData("{{CONTENT}}")]
    [InlineData("rel=\"icon\"")]
    [InlineData("{{TITLE}}")]
    [InlineData("{{HEADING}}")]
    [InlineData("{{MESSAGE}}")]
    [InlineData("{{SPINNER}}")]
    [InlineData("{{BUTTON}}")]
    [InlineData("stolon-logo")]
    public void StatusTemplate_ContainsRequiredMarkup(string needle)
    {
        Assert.Contains(needle, TemplateLoader.Load("status"), System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The card uses <c>.stolon-status-page-card</c> and not <c>.stolon-card</c>, which is the kit's count card.
    /// True: a page that links the kit CSS beside this card keeps its look.
    /// False: the count card rules would restyle the status card.
    /// </summary>
    [Fact]
    public void StatusTemplate_UsesUncollidingCardClass()
    {
        var html = TemplateLoader.Load("status");
        Assert.Contains("stolon-status-page-card", html, System.StringComparison.Ordinal);
        Assert.DoesNotContain("class=\"stolon-card\"", html, System.StringComparison.Ordinal);
        Assert.DoesNotContain(".stolon-card{", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The content argument is placed in the card as raw markup.
    /// True: a plugin can add a form or a script slot to the card.
    /// False: the markup would be encoded and show as text.
    /// </summary>
    [Fact]
    public void Render_PlacesRawContent()
    {
        var html = StatusPage.Render("Heading", "Message", content: "<form id=\"f\"></form>");

        Assert.Contains("<form id=\"f\"></form>", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// The template styles an error line, a secondary button, and a stack of buttons for the content slot.
    /// True: a plugin's content needs no style block of its own for them.
    /// False: an error line or a second button would show unstyled.
    /// </summary>
    [Fact]
    public void Render_StylesErrorLineSecondaryButtonAndStack()
    {
        var html = StatusPage.Render("Sign up", "Pick a name.", content: "<p class=\"stolon-status-error\">Taken.</p><div class=\"stolon-btn-stack\"><a class=\"stolon-btn stolon-btn-secondary\" href=\"#\">Help</a></div>");

        Assert.Contains(".stolon-status-error{", html, System.StringComparison.Ordinal);
        Assert.Contains(".stolon-btn-secondary{", html, System.StringComparison.Ordinal);
        Assert.Contains(".stolon-btn-stack{", html, System.StringComparison.Ordinal);
        Assert.Contains("<p class=\"stolon-status-error\">Taken.</p>", html, System.StringComparison.Ordinal);
    }
}
