using System;
using System.Threading.Tasks;
using Xunit;

namespace Siphonophore.Stolon.Tests;

/// <summary>Verifies that <see cref="PerRunLookup{TKey, TValue}"/> runs a lookup once per key until it is cleared.</summary>
public sealed class PerRunLookupTests
{
    /// <summary>
    /// A key is looked up once, null answers included, until Clear.
    /// True: a run that asks about every item asks each question once.
    /// False: the lookup would run for every ask, or a cleared answer would stay.
    /// </summary>
    [Fact]
    public void Get_LooksUpOncePerKeyUntilClear()
    {
        var lookup = new PerRunLookup<string, string?>();
        var calls = 0;
        string? Answer(string key)
        {
            calls++;
            return key == "none" ? null : key.ToUpperInvariant();
        }

        Assert.Equal("A", lookup.Get("a", Answer));
        Assert.Equal("A", lookup.Get("a", Answer));
        Assert.Null(lookup.Get("none", Answer));
        Assert.Null(lookup.Get("none", Answer));
        lookup.Clear();
        lookup.Get("a", Answer);

        Assert.Equal(3, calls);
    }

    /// <summary>
    /// Threads that ask at once share one lookup.
    /// True: a slow lookup is never run twice for one key.
    /// False: parallel workers would each run it.
    /// </summary>
    [Fact]
    public void Get_Parallel_SharesOneLookup()
    {
        var lookup = new PerRunLookup<int, int>();
        var calls = 0;

        Parallel.For(0, 64, _ => lookup.Get(1, k => { System.Threading.Interlocked.Increment(ref calls); return k; }));

        Assert.Equal(1, calls);
    }

    /// <summary>
    /// A comparer decides which keys are the same.
    /// True: paths that differ by case can share an answer.
    /// False: the comparer would be ignored.
    /// </summary>
    [Fact]
    public void Get_Comparer_MatchesKeys()
    {
        var lookup = new PerRunLookup<string, int>(StringComparer.OrdinalIgnoreCase);
        var calls = 0;

        lookup.Get("/Media", _ => ++calls);
        lookup.Get("/media", _ => ++calls);

        Assert.Equal(1, calls);
    }

    /// <summary>
    /// A null lookup throws.
    /// True: a caller bug is caught at the call.
    /// False: it would throw later from inside the cache.
    /// </summary>
    [Fact]
    public void Get_NullLookup_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new PerRunLookup<int, int>().Get(1, null!));
    }
}
