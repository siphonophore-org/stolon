using System;
using System.IO;

namespace Siphonophore.Stolon;

/// <summary>
/// Reads the free space on the volume that holds a path.
/// </summary>
public static class DiskSpace
{
    /// <summary>
    /// Reads the bytes free to the server's account on the volume that holds a path, which need not exist yet.
    /// </summary>
    /// <remarks>
    /// On Linux and macOS a missing path is measured at its nearest folder that exists. On Windows the path's drive root is measured. It never throws for a path it cannot measure.
    /// </remarks>
    /// <param name="path">A file or folder on the volume.</param>
    /// <param name="freeBytes">The bytes free on that volume, or zero when unknown.</param>
    /// <returns><c>true</c> when the space was read, <c>false</c> when it is unknown.</returns>
    public static bool TryGetFreeBytes(string? path, out long freeBytes)
    {
        freeBytes = 0;
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        try
        {
            var target = MeasurablePath(path);
            if (string.IsNullOrEmpty(target))
            {
                return false;
            }

            freeBytes = new DriveInfo(target).AvailableFreeSpace;
            return true;
        }
        catch (Exception ex) when (ex is IOException or ArgumentException or UnauthorizedAccessException or NotSupportedException)
        {
            freeBytes = 0;
            return false;
        }
    }

    // DriveInfo on Linux and macOS measures the file system of the folder it is given, which must exist.
    private static string? MeasurablePath(string path)
    {
        if (OperatingSystem.IsWindows())
        {
            return Path.GetPathRoot(Path.GetFullPath(path));
        }

        var directory = Path.GetFullPath(path);
        while (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            directory = Path.GetDirectoryName(directory);
        }

        return directory;
    }
}
