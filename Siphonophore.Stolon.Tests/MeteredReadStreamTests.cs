using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="MeteredReadStream"/> charges every byte read and fails once the meter refuses.</summary>
public sealed class MeteredReadStreamTests
{
    private sealed class Meter
    {
        private readonly long _limit;

        public Meter(long limit) => _limit = limit;

        public long Charged { get; private set; }

        public bool Take(int bytes)
        {
            Charged += bytes;
            return Charged <= _limit;
        }
    }

    /// <summary>
    /// Every byte read is charged, and a read within the allowance passes.
    /// True: the meter sees exactly what was sent.
    /// False: bytes would go uncharged or be charged twice.
    /// </summary>
    [Fact]
    public async Task Read_WithinAllowance_ChargesEveryByte()
    {
        var meter = new Meter(100);
        using var stream = new MeteredReadStream(new MemoryStream(new byte[40]), meter.Take);
        using var sink = new MemoryStream();

        await stream.CopyToAsync(sink);

        Assert.Equal(40, sink.Length);
        Assert.Equal(40, meter.Charged);
    }

    /// <summary>
    /// The read the meter refuses throws an IOException.
    /// True: a copy stops once the allowance is used up.
    /// False: the copy would run past the allowance.
    /// </summary>
    [Fact]
    public void Read_PastAllowance_Throws()
    {
        var meter = new Meter(10);
        using var stream = new MeteredReadStream(new MemoryStream(new byte[40]), meter.Take);

        Assert.Throws<IOException>(() => stream.CopyTo(Stream.Null));
    }

    /// <summary>
    /// Seeks pass through and only the bytes read after them are charged.
    /// True: a ranged response is charged for the range it sends.
    /// False: the skipped bytes would be charged, or the stream would not seek.
    /// </summary>
    [Fact]
    public void Seek_ChargesOnlyWhatIsRead()
    {
        var meter = new Meter(100);
        using var stream = new MeteredReadStream(new MemoryStream(new byte[50]), meter.Take);

        stream.Seek(45, SeekOrigin.Begin);
        var read = stream.Read(new byte[10]);

        Assert.True(stream.CanSeek);
        Assert.Equal(5, read);
        Assert.Equal(5, meter.Charged);
        Assert.Equal(50, stream.Length);
    }

    /// <summary>
    /// The end of the stream is not charged, and nothing is written.
    /// True: a read of zero bytes never trips the meter.
    /// False: the last read would charge or fail.
    /// </summary>
    [Fact]
    public void Read_AtEnd_ChargesNothing()
    {
        var calls = 0;
        using var stream = new MeteredReadStream(new MemoryStream(), _ => { calls++; return false; });

        Assert.Equal(0, stream.Read(new byte[4], 0, 4));
        Assert.Equal(0, calls);
        Assert.False(stream.CanWrite);
        Assert.Throws<NotSupportedException>(() => stream.Write(new byte[1], 0, 1));
    }

    /// <summary>
    /// Disposing the wrapper disposes the inner stream.
    /// True: a response body is closed with its wrapper.
    /// False: the inner stream would leak.
    /// </summary>
    [Fact]
    public async Task Dispose_DisposesInner()
    {
        var inner = new MemoryStream(new byte[1]);
        var stream = new MeteredReadStream(inner, _ => true);

        await stream.DisposeAsync();

        Assert.Throws<ObjectDisposedException>(() => inner.ReadByte());
    }
}
