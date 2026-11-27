using System;
using System.IO;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="FolderProbe"/> finds whether a folder can be written by trying it.</summary>
public sealed class FolderProbeTests : IDisposable
{
    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-probe-" + Guid.NewGuid().ToString("N"));

    public FolderProbeTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(_dir, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
                foreach (var sub in Directory.GetDirectories(_dir))
                {
                    File.SetUnixFileMode(sub, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
                }
            }

            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// A writable folder is true and keeps no probe file.
    /// True: a check leaves the folder as it was.
    /// False: the probe would litter the folder or report it unwritable.
    /// </summary>
    [Fact]
    public void CanWrite_Writable_TrueAndClean()
    {
        Assert.True(FolderProbe.CanWrite(_dir));
        Assert.Empty(Directory.GetFileSystemEntries(_dir));
    }

    /// <summary>
    /// A missing folder is created and then probed.
    /// True: a new download folder is ready after the check.
    /// False: a missing folder would read as unwritable.
    /// </summary>
    [Fact]
    public void CanWrite_Missing_CreatesIt()
    {
        var folder = Path.Join(_dir, "new", "deeper");

        Assert.True(FolderProbe.CanWrite(folder));
        Assert.True(Directory.Exists(folder));
    }

    /// <summary>
    /// A folder the account cannot write is false.
    /// True: a caller learns of it before a long job fails.
    /// False: it would claim the folder is writable, or throw.
    /// </summary>
    [Fact]
    public void CanWrite_ReadOnlyFolder_False()
    {
        if (OperatingSystem.IsWindows() || Environment.UserName == "root")
        {
            return;
        }

        var folder = Path.Join(_dir, "locked");
        Directory.CreateDirectory(folder);
        File.SetUnixFileMode(folder, UnixFileMode.UserRead | UnixFileMode.UserExecute);

        Assert.False(FolderProbe.CanWrite(folder));
    }

    /// <summary>
    /// A blank path, or a path that is a file, is false.
    /// True: a bad setting never throws from a check.
    /// False: it would throw.
    /// </summary>
    [Fact]
    public void CanWrite_BlankOrFile_False()
    {
        var file = Path.Join(_dir, "file");
        File.WriteAllText(file, "x");

        Assert.False(FolderProbe.CanWrite(null));
        Assert.False(FolderProbe.CanWrite(" "));
        Assert.False(FolderProbe.CanWrite(file));
    }
}
