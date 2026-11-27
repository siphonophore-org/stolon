using System;
using System.Text.Json;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="WebClientJson.Options"/> read what the web client posts as Jellyfin reads a plugin configuration.</summary>
public sealed class WebClientJsonTests
{
    private sealed class Config
    {
        public Guid UserId { get; set; }

        public string ServerName { get; set; } = string.Empty;

        public bool Enabled { get; set; }
    }

    /// <summary>
    /// A Guid without dashes and names in any case read.
    /// True: a value the web client posts binds as Jellyfin's own reader binds it.
    /// False: a Guid without dashes would throw, or a camel case name would be dropped.
    /// </summary>
    [Fact]
    public void Options_ReadDashlessGuidAndAnyCase()
    {
        var json = "{\"userId\":\"6f9619ff8b86d011b42d00c04fc964ff\",\"SERVERNAME\":\"home\",\"enabled\":true}";

        var config = JsonSerializer.Deserialize<Config>(json, WebClientJson.Options)!;

        Assert.Equal(Guid.Parse("6f9619ff-8b86-d011-b42d-00c04fc964ff"), config.UserId);
        Assert.Equal("home", config.ServerName);
        Assert.True(config.Enabled);
    }

    /// <summary>
    /// The shared options are read only.
    /// True: no caller can change how another reads.
    /// False: one caller's change would reach every other.
    /// </summary>
    [Fact]
    public void Options_AreReadOnly()
    {
        Assert.True(WebClientJson.Options.IsReadOnly);
        Assert.True(WebClientJson.Options.PropertyNameCaseInsensitive);
    }
}
