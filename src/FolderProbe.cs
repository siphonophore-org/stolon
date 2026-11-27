using System;
using System.IO;

namespace Siphonophore.Stolon;

/// <summary>
/// Checks what the server's account can do in a folder by trying it.
/// </summary>
public static class FolderProbe
{
    /// <summary>
    /// Checks whether the server's account can create files in a folder, by creating and removing a small file there. A missing folder is created first.
    /// </summary>
    /// <remarks>The probe file is <c>.stolon-write-&lt;guid&gt;</c>, opened to delete on close. It never throws for a folder it cannot write.</remarks>
    /// <param name="directoryPath">The folder to probe.</param>
    /// <returns><c>true</c> when files can be written there, otherwise <c>false</c>.</returns>
    public static bool CanWrite(string? directoryPath)
    {
        if (string.IsNullOrWhiteSpace(directoryPath))
        {
            return false;
        }

        try
        {
            Directory.CreateDirectory(directoryPath);
            var probe = Path.Join(directoryPath, ".stolon-write-" + Guid.NewGuid().ToString("N"));
            using (new FileStream(probe, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1, FileOptions.DeleteOnClose))
            {
                return true;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            return false;
        }
    }
}
