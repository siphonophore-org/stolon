using System;
using System.IO;
using System.Runtime.Versioning;
using System.Security.AccessControl;
using System.Security.Principal;

namespace Siphonophore.Stolon;

/// <summary>
/// Keeps files and folders private to the account the server runs as, on every OS.
/// On Windows, SYSTEM and Administrators keep access too, so services, backups, and an administrator can still reach them.
/// </summary>
/// <remarks>
/// <see cref="AtomicFile"/> creates an owner only file through it, and <see cref="ProtectedJsonFileStore{T}"/> writes every file that way.
/// On Linux and macOS a file is mode 600 and a folder mode 700. On Windows each gets an access list of its own that inherits nothing.
/// </remarks>
public static class OwnerOnly
{
    /// <summary>
    /// Creates a folder, or narrows an existing one, so only the account the server runs as can open it.
    /// On Windows, files and folders created inside inherit the same rights.
    /// </summary>
    /// <remarks>Files already inside keep their own rights. An I/O or access failure is not caught.</remarks>
    /// <param name="path">The folder.</param>
    public static void ProtectFolder(string path)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);

        Directory.CreateDirectory(path);
        if (OperatingSystem.IsWindows())
        {
            new DirectoryInfo(path).SetAccessControl(FolderSecurity());
        }
        else
        {
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
    }

    /// <summary>
    /// Creates a new file for writing that is private from the moment it exists, rather than created wider and narrowed after.
    /// </summary>
    /// <remarks>On Windows the file is opened with the rights <c>GENERIC_WRITE</c> maps to, which a flush to the disk needs.</remarks>
    /// <param name="path">The file, which must not exist yet.</param>
    /// <returns>The open stream, which the caller disposes.</returns>
    internal static FileStream CreateFile(string path)
    {
        if (OperatingSystem.IsWindows())
        {
            const FileSystemRights rights = FileSystemRights.Write | FileSystemRights.ReadPermissions | FileSystemRights.Synchronize;
            return new FileInfo(path).Create(FileMode.CreateNew, rights, FileShare.None, 4096, FileOptions.None, FileSecurity());
        }

        return new FileStream(path, new FileStreamOptions
        {
            Mode = FileMode.CreateNew,
            Access = FileAccess.Write,
            Share = FileShare.None,
            UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite
        });
    }

    [SupportedOSPlatform("windows")]
    private static FileSecurity FileSecurity()
    {
        var security = new FileSecurity();
        security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
        foreach (var sid in Owners())
        {
            security.AddAccessRule(new FileSystemAccessRule(sid, FileSystemRights.FullControl, AccessControlType.Allow));
        }

        return security;
    }

    [SupportedOSPlatform("windows")]
    private static DirectorySecurity FolderSecurity()
    {
        var security = new DirectorySecurity();
        security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
        foreach (var sid in Owners())
        {
            security.AddAccessRule(new FileSystemAccessRule(
                sid,
                FileSystemRights.FullControl,
                InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
                PropagationFlags.None,
                AccessControlType.Allow));
        }

        return security;
    }

    // The account the server runs as, SYSTEM for services and backups, and Administrators so an administrator can still recover the files.
    [SupportedOSPlatform("windows")]
    private static SecurityIdentifier[] Owners()
    {
        var system = new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null);
        using var identity = WindowsIdentity.GetCurrent();
        return
        [
            identity.User ?? system,
            system,
            new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null)
        ];
    }
}
