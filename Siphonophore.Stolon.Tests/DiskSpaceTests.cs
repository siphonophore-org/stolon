using System;
using System.IO;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="DiskSpace"/> reads the free space of a path's volume and never throws.</summary>
public sealed class DiskSpaceTests
{
    /// <summary>
    /// A folder that exists reads a free space.
    /// True: a caller can check room before a download.
    /// False: a real folder would read as unknown.
    /// </summary>
    [Fact]
    public void TryGetFreeBytes_ExistingFolder_Reads()
    {
        var ok = DiskSpace.TryGetFreeBytes(Path.GetTempPath(), out var free);

        Assert.True(ok);
        Assert.True(free > 0);
    }

    /// <summary>
    /// A path that does not exist yet reads the volume it would be on.
    /// True: a download's target can be checked before its folder is made.
    /// False: a new path would read as unknown.
    /// </summary>
    [Fact]
    public void TryGetFreeBytes_MissingPath_ReadsItsVolume()
    {
        var path = Path.Join(Path.GetTempPath(), "stolon-missing-" + Guid.NewGuid().ToString("N"), "a", "file.mkv");

        var ok = DiskSpace.TryGetFreeBytes(path, out var free);

        Assert.True(ok);
        Assert.True(free > 0);
    }

    /// <summary>
    /// A blank path reads as unknown with zero bytes.
    /// True: a caller bug never throws from a check.
    /// False: it would throw or report space.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void TryGetFreeBytes_Blank_Unknown(string? path)
    {
        var ok = DiskSpace.TryGetFreeBytes(path, out var free);

        Assert.False(ok);
        Assert.Equal(0, free);
    }
}
