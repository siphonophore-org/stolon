using System;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="StolonPageScript"/> serves the standalone page script as JavaScript. The JS tests run the script itself.</summary>
public class StolonPageScriptTests
{
    /// <summary>
    /// The script is served as JavaScript that is checked again on every load, and sets the StolonPage global.
    /// True: a standalone page loads the current script with a script tag.
    /// False: a browser would refuse the script or keep a stale copy.
    /// </summary>
    [Fact]
    public void Serve_AnswersWithTheScriptAsJavaScript()
    {
        var context = new DefaultHttpContext();

        var result = StolonPageScript.Serve(context.Response);

        Assert.Equal("text/javascript; charset=utf-8", result.ContentType);
        Assert.Equal("no-cache", context.Response.Headers.CacheControl.ToString());
        Assert.Equal(StolonPageScript.Script, result.Content);
        Assert.Contains("StolonPage=", StolonPageScript.Script, StringComparison.Ordinal);
        Assert.Throws<ArgumentNullException>(() => StolonPageScript.Serve(null!));
    }
}
