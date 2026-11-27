using System;
using System.IO;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="OwnerOnly"/> keeps folders and files private to the account the server runs as.</summary>
public sealed class OwnerOnlyTests : IDisposable
{
    private const UnixFileMode Group = UnixFileMode.GroupRead | UnixFileMode.GroupWrite | UnixFileMode.GroupExecute;
    private const UnixFileMode Other = UnixFileMode.OtherRead | UnixFileMode.OtherWrite | UnixFileMode.OtherExecute;

    private readonly string _dir = Path.Join(Path.GetTempPath(), "stolon-owner-" + Guid.NewGuid().ToString("N"));

    public OwnerOnlyTests() => Directory.CreateDirectory(_dir);

    public void Dispose()
    {
        if (Directory.Exists(_dir))
        {
            Directory.Delete(_dir, true);
        }
    }

    /// <summary>
    /// A missing folder is created private.
    /// True: secrets written inside are never reachable by another account.
    /// False: the folder would be missing or open to the group or others.
    /// </summary>
    [Fact]
    public void ProtectFolder_Missing_CreatesPrivate()
    {
        var folder = Path.Join(_dir, "a", "b");

        OwnerOnly.ProtectFolder(folder);

        Assert.True(Directory.Exists(folder));
        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute, File.GetUnixFileMode(folder));
        }
    }

    /// <summary>
    /// An existing open folder is narrowed.
    /// True: a folder made by an older setup becomes private.
    /// False: it would stay readable by others.
    /// </summary>
    [Fact]
    public void ProtectFolder_ExistingOpen_Narrows()
    {
        var folder = Path.Join(_dir, "open");
        Directory.CreateDirectory(folder);
        if (!OperatingSystem.IsWindows())
        {
            File.SetUnixFileMode(folder, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | Group | Other);
        }

        OwnerOnly.ProtectFolder(folder);

        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.None, File.GetUnixFileMode(folder) & (Group | Other));
        }
    }

    /// <summary>
    /// A blank path throws.
    /// True: a caller bug is caught at the call.
    /// False: the current folder could be narrowed.
    /// </summary>
    [Fact]
    public void ProtectFolder_Blank_Throws()
    {
        Assert.ThrowsAny<ArgumentException>(() => OwnerOnly.ProtectFolder(string.Empty));
    }

    /// <summary>
    /// A created file is private from the start and refuses to replace an existing one.
    /// True: there is no moment the file is readable by others, and nothing is overwritten.
    /// False: the file would be wider, or an existing file would be truncated.
    /// </summary>
    [Fact]
    public void CreateFile_IsPrivateAndNew()
    {
        var path = Path.Join(_dir, "key");

        using (var stream = OwnerOnly.CreateFile(path))
        {
            stream.WriteByte(1);
        }

        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
        }

        Assert.Throws<IOException>(() => OwnerOnly.CreateFile(path).Dispose());
    }
}
