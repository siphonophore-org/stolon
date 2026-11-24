using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Siphonophore.Stolon;

/// <summary>
/// Lets a browser install a web client shell page as an app: its web app manifest and its service worker. The worker keeps the page and its
/// versioned assets for a faster start and an offline copy, and loads Stolon's web push script so the app shows notifications.
/// </summary>
public static class WebClientApp
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    /// <summary>
    /// Writes the page's web app manifest. Its start and scope are the page's own folder, so the manifest is served beside the page.
    /// </summary>
    /// <param name="name">The app's full name, such as <c>Jellyfin Requests</c>.</param>
    /// <param name="shortName">The name under its icon.</param>
    /// <param name="description">One sentence on what the app does.</param>
    /// <param name="icons">The app's icons, relative to the manifest.</param>
    /// <param name="color">The background and theme color, a hex code (default the web client's dark background).</param>
    /// <returns>The manifest JSON.</returns>
    public static string Manifest(string name, string shortName, string description, IEnumerable<WebClientAppIcon> icons, string color = "#101010")
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        ArgumentException.ThrowIfNullOrEmpty(shortName);
        ArgumentNullException.ThrowIfNull(description);
        ArgumentNullException.ThrowIfNull(icons);
        ArgumentException.ThrowIfNullOrEmpty(color);
        var manifest = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["id"] = "./",
            ["name"] = name,
            ["short_name"] = shortName,
            ["description"] = description,
            ["start_url"] = "./",
            ["scope"] = "./",
            ["display"] = "standalone",
            ["background_color"] = color,
            ["theme_color"] = color,
            ["icons"] = icons.Select(i => new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["src"] = i.Src,
                ["sizes"] = i.Sizes,
                ["type"] = i.Type,
                ["purpose"] = i.Purpose
            }).ToList()
        };
        return JsonSerializer.Serialize(manifest, JsonOptions);
    }

    /// <summary>
    /// Answers a request for the manifest, cached for a day.
    /// </summary>
    /// <param name="response">The response, which receives the headers.</param>
    /// <param name="manifest">The manifest from <see cref="Manifest"/>.</param>
    /// <returns>The manifest.</returns>
    public static ContentResult ServeManifest(HttpResponse response, string manifest)
    {
        ArgumentNullException.ThrowIfNull(response);
        ArgumentNullException.ThrowIfNull(manifest);
        response.Headers.CacheControl = "public, max-age=86400";
        response.Headers["X-Content-Type-Options"] = "nosniff";
        return new ContentResult { Content = manifest, ContentType = "application/manifest+json", StatusCode = StatusCodes.Status200OK };
    }

    /// <summary>
    /// Writes the page's service worker. It serves the page from the network and keeps a copy for when the server cannot be reached, serves
    /// a stylesheet, script, or font with a version in its address from its cache, and reads any other again behind the copy it serves.
    /// </summary>
    /// <param name="cachePrefix">The start of the worker's cache names, lowercase letters, digits, and hyphens, such as <c>myplugin</c>.</param>
    /// <param name="pushWorker">The address of Stolon's web push script beside the worker, or <c>null</c> for an app with no notifications.</param>
    /// <returns>The script.</returns>
    public static string ServiceWorker(string cachePrefix, string? pushWorker = "push-worker.js")
    {
        ArgumentException.ThrowIfNullOrEmpty(cachePrefix);
        if (!cachePrefix.All(c => char.IsAsciiLetterLower(c) || char.IsAsciiDigit(c) || c == '-'))
        {
            throw new ArgumentException("A cache prefix holds lowercase letters, digits, and hyphens only.", nameof(cachePrefix));
        }

        var import = string.IsNullOrEmpty(pushWorker) ? string.Empty : "importScripts('" + StringUtilities.EscapeJsString(pushWorker) + "');\n";
        return import + WorkerScript.Replace("STOLON_CACHE_PREFIX", cachePrefix, StringComparison.Ordinal);
    }

    /// <summary>
    /// Answers a request for the service worker, which a browser checks again on every load.
    /// </summary>
    /// <param name="response">The response, which receives the headers.</param>
    /// <param name="script">The script from <see cref="ServiceWorker"/>.</param>
    /// <returns>The script.</returns>
    public static ContentResult ServeWorker(HttpResponse response, string script)
    {
        ArgumentNullException.ThrowIfNull(response);
        ArgumentNullException.ThrowIfNull(script);
        response.Headers.CacheControl = "no-cache";
        response.Headers["X-Content-Type-Options"] = "nosniff";
        return new ContentResult { Content = script, ContentType = "text/javascript; charset=utf-8", StatusCode = StatusCodes.Status200OK };
    }

    // The worker, with its cache prefix filled in.
    private const string WorkerScript = """
        'use strict';
        // Stolon's app worker for a web client shell page.
        var CACHE = 'STOLON_CACHE_PREFIX-v1';
        var ASSET_DESTINATIONS = ['style', 'script', 'font'];
        var FINGERPRINT = /\.[0-9a-f]{8,}(\.[a-z0-9]+)$/i;

        self.addEventListener('install', function () { self.skipWaiting(); });

        self.addEventListener('activate', function (event) {
            event.waitUntil(
                Promise.resolve(self.registration.navigationPreload && self.registration.navigationPreload.enable())
                    .catch(function () { return undefined; })
                    .then(function () { return caches.keys(); })
                    .then(function (keys) {
                        return Promise.all(keys.filter(function (key) { return key.indexOf('STOLON_CACHE_PREFIX-') === 0 && key !== CACHE; })
                            .map(function (key) { return caches.delete(key); }));
                    })
                    .then(function () { return self.clients.claim(); })
            );
        });

        self.addEventListener('fetch', function (event) {
            var request = event.request;
            if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin || request.headers.has('Authorization')) return;
            if (request.mode === 'navigate') event.respondWith(page(event, request));
            else if (ASSET_DESTINATIONS.indexOf(request.destination) !== -1) event.respondWith(asset(event, request));
        });

        function versioned(url) { return url.searchParams.has('v') || FINGERPRINT.test(url.pathname); }

        function page(event, request) {
            return caches.open(CACHE).catch(function () { return null; }).then(function (cache) {
                return Promise.resolve(event.preloadResponse).then(function (preloaded) { return preloaded || fetch(request); }).then(function (response) {
                    if (cache && response.ok && (response.headers.get('Content-Type') || '').indexOf('text/html') === 0) {
                        event.waitUntil(cache.put(self.registration.scope, response.clone()).catch(function () { return undefined; }));
                    }
                    return response;
                }, function () {
                    return (cache ? cache.match(self.registration.scope).catch(function () { return undefined; }) : Promise.resolve(undefined))
                        .then(function (kept) { return kept || Response.error(); });
                });
            });
        }

        function asset(event, request) {
            return caches.open(CACHE).catch(function () { return null; }).then(function (cache) {
                if (!cache) return fetch(request);
                return cache.match(request).catch(function () { return undefined; }).then(function (cached) {
                    if (cached && versioned(new URL(request.url))) return cached;
                    var network = fetch(request).then(function (response) {
                        if (response.ok) event.waitUntil(store(cache, request, response.clone()).catch(function () { return undefined; }));
                        return response;
                    });
                    if (cached) {
                        event.waitUntil(network.catch(function () { return undefined; }));
                        return cached;
                    }
                    return network;
                });
            });
        }

        // A versioned asset replaces the copies of its earlier versions, so they do not pile up as the plugin or the web client updates.
        function store(cache, request, response) {
            var url = new URL(request.url);
            var stem = function (u) { return u.pathname.replace(FINGERPRINT, '$1'); };
            var clear = versioned(url)
                ? cache.keys().then(function (keys) {
                    return Promise.all(keys.filter(function (key) {
                        var old = new URL(key.url);
                        return stem(old) === stem(url) && old.href !== url.href;
                    }).map(function (key) { return cache.delete(key); }));
                })
                : Promise.resolve();
            return clear.then(function () { return cache.put(request, response); });
        }

        """;
}

/// <summary>
/// One icon of a web app manifest.
/// </summary>
/// <param name="Src">The icon's address, relative to the manifest.</param>
/// <param name="Sizes">Its size, such as <c>192x192</c>.</param>
/// <param name="Purpose"><c>any</c>, or <c>maskable</c> for an icon with room for the platform's mask.</param>
/// <param name="Type">Its media type (default <c>image/png</c>).</param>
public sealed record WebClientAppIcon(string Src, string Sizes, string Purpose = "any", string Type = "image/png");
