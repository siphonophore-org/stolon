using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Siphonophore.Stolon;

/// <summary>
/// A read through wrapper that charges every byte read to a meter and fails once the meter refuses, such as a daily allowance.
/// Seeks pass through, so a response that serves byte ranges is charged only for the bytes it sends.
/// </summary>
/// <remarks>
/// The read the meter refuses throws an <see cref="IOException"/>, after its bytes were charged. The wrapper owns the inner stream and disposes it. It cannot write.
/// </remarks>
public sealed class MeteredReadStream : Stream
{
    private readonly Stream _inner;
    private readonly Func<int, bool> _take;
    private int _disposed;

    /// <summary>
    /// Initializes a new instance of the <see cref="MeteredReadStream"/> class.
    /// </summary>
    /// <param name="inner">The stream to read from. It is disposed with this wrapper.</param>
    /// <param name="take">Charges a number of bytes read and returns whether they were allowed.</param>
    public MeteredReadStream(Stream inner, Func<int, bool> take)
    {
        ArgumentNullException.ThrowIfNull(inner);
        ArgumentNullException.ThrowIfNull(take);
        _inner = inner;
        _take = take;
    }

    /// <inheritdoc />
    public override bool CanRead => _inner.CanRead;

    /// <inheritdoc />
    public override bool CanSeek => _inner.CanSeek;

    /// <inheritdoc />
    public override bool CanWrite => false;

    /// <inheritdoc />
    public override long Length => _inner.Length;

    /// <inheritdoc />
    public override long Position
    {
        get => _inner.Position;
        set => _inner.Position = value;
    }

    /// <inheritdoc />
    public override void Flush()
    {
    }

    /// <inheritdoc />
    public override int Read(byte[] buffer, int offset, int count) => Charge(_inner.Read(buffer, offset, count));

    /// <inheritdoc />
    public override int Read(Span<byte> buffer) => Charge(_inner.Read(buffer));

    /// <inheritdoc />
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

    /// <inheritdoc />
    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        => Charge(await _inner.ReadAsync(buffer, cancellationToken).ConfigureAwait(false));

    /// <inheritdoc />
    public override long Seek(long offset, SeekOrigin origin) => _inner.Seek(offset, origin);

    /// <inheritdoc />
    public override void SetLength(long value) => throw new NotSupportedException();

    /// <inheritdoc />
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    /// <inheritdoc />
    public override async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposed, 1) == 0)
        {
            await _inner.DisposeAsync().ConfigureAwait(false);
        }

        await base.DisposeAsync().ConfigureAwait(false);
    }

    /// <inheritdoc />
    protected override void Dispose(bool disposing)
    {
        if (disposing && Interlocked.Exchange(ref _disposed, 1) == 0)
        {
            _inner.Dispose();
        }

        base.Dispose(disposing);
    }

    private int Charge(int read)
    {
        if (read > 0 && !_take(read))
        {
            throw new IOException("The allowance for this read is used up.");
        }

        return read;
    }
}
