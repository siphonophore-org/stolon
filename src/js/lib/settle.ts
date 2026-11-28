// Counts the API requests still on their way, so a page or a tab can wait until its data has all come in before it
// shows, rather than drawing each part as it lands.

var inflight = 0;
var waiting: Array<() => void> = [];
var timer: ReturnType<typeof setTimeout> | null = null;

// The quiet time after the last request ends before the page counts as settled, long enough for a request that
// starts from another's answer to begin.
var QUIET_MS = 150;

function check(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    if (inflight > 0 || !waiting.length) return;
    timer = setTimeout(function () {
        timer = null;
        if (inflight > 0) return;
        var done = waiting.splice(0);
        done.forEach(function (fn) { fn(); });
    }, QUIET_MS);
}

/**
 * Counts a request until it settles.
 *
 * @param request the request's promise
 * @returns the same promise
 */
export function trackRequest<T>(request: Promise<T>): Promise<T> {
    inflight++;
    if (timer) { clearTimeout(timer); timer = null; }
    var end = function () { inflight = Math.max(0, inflight - 1); check(); };
    request.then(end, end);
    return request;
}

/**
 * Waits until no request has been on its way for a short quiet time, or until the longest wait passes.
 *
 * @param maxMs the longest wait (default 6000)
 * @returns a promise that resolves once settled
 */
export function whenSettled(maxMs?: number): Promise<void> {
    return new Promise(function (resolve) {
        var finished = false;
        var finish = function () { if (!finished) { finished = true; resolve(); } };
        waiting.push(finish);
        setTimeout(finish, maxMs || 6000);
        check();
    });
}
