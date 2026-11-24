using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Siphonophore.Stolon;

/// <summary>
/// The standalone page script, for a page that loads neither the bundle nor its CSS, such as one that mirrors the web client. It sets
/// the global <c>StolonPage</c> with the bundle's web push and casing helpers, built from the same sources, and holds no text of its own.
/// </summary>
/// <remarks>
/// scripts/build-page-script.mjs writes this file from <c>src/js/lib/page-script.ts</c>, and a test fails when it is out of date.
/// </remarks>
public static class StolonPageScript
{
    /// <summary>
    /// The script. It defines <c>StolonPage.webPushState</c>, <c>subscribeWebPush</c>, and <c>unsubscribeWebPush</c>, which resolve to a
    /// state code, <c>webPushLabel</c>, and <c>titleCase</c> and <c>sentenceCase</c>, which take the plugin's casing list.
    /// </summary>
    public const string Script = """
        "use strict";(()=>{function O(e){var r=C();return r?Promise.resolve(r):Notification.permission==="denied"?Promise.resolve("denied"):e?Promise.resolve(e).then(function(n){return n.pushManager.getSubscription()}).then(function(n){return n&&Notification.permission==="granted"?"on":"off"}):Promise.resolve("off")}function T(e){var r=C();if(r)return Promise.resolve(r);var n=H(e.publicKey||"");return n.length?Promise.resolve(Notification.requestPermission()).then(function(t){return t!=="granted"?t==="denied"?"denied":"off":Promise.resolve(e.registration).then(function(u){return u.pushManager.getSubscription().then(function(o){return o&&!B(o,n)?o.unsubscribe().then(function(){return null}):o}).then(function(o){return o||u.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:n})})}).then(function(u){var o=e.save?e.save(R(u)):null;return Promise.resolve(o).then(function(){return"on"})})}):Promise.reject(new Error("publicKey is required"))}function N(e){var r=C();return r?Promise.resolve(r):Promise.resolve(e.registration).then(function(n){return n.pushManager.getSubscription()}).then(function(n){if(!n)return"off";var t=e.remove?e.remove(R(n)):null;return Promise.resolve(t).then(function(){return n.unsubscribe()}).then(function(){return"off"})})}function W(e){var r=e==null?typeof navigator!="undefined"?navigator.userAgent:"":e,n=/Edg\//.test(r)?"Edge":/OPR\//.test(r)?"Opera":/Firefox\//.test(r)?"Firefox":/Chrome\//.test(r)||/CriOS\//.test(r)?"Chrome":/Safari\//.test(r)?"Safari":"",t=/iPhone/.test(r)?"iPhone":/iPad/.test(r)?"iPad":/Android/.test(r)?"Android":/Mac OS X|Macintosh/.test(r)?"macOS":/Windows/.test(r)?"Windows":/CrOS/.test(r)?"ChromeOS":/Linux/.test(r)?"Linux":"";return n&&t?n+" \xB7 "+t:n||t}function C(){if(typeof window=="undefined")return"unsupported";if(window.isSecureContext===!1)return"insecure";var e=typeof navigator!="undefined"?navigator:null;return F(e)&&!G(e)?"install":!e||!("serviceWorker"in e)||typeof window.PushManager=="undefined"||typeof window.Notification=="undefined"?"unsupported":null}function F(e){return e?/iPhone|iPad|iPod/.test(e.userAgent||"")||/Macintosh/.test(e.userAgent||"")&&(e.maxTouchPoints||0)>1:!1}function G(e){return e&&e.standalone===!0?!0:typeof window.matchMedia=="function"&&window.matchMedia("(display-mode: standalone)").matches}function R(e){var r=e.toJSON(),n=r.keys||{};return{endpoint:r.endpoint||e.endpoint,keys:{p256dh:n.p256dh||"",auth:n.auth||""},label:W()}}function B(e,r){var n=e.options&&e.options.applicationServerKey;if(!n)return!0;var t=new Uint8Array(n);if(t.length!==r.length)return!1;for(var u=0;u<t.length;u++)if(t[u]!==r[u])return!1;return!0}function H(e){for(var r=String(e||"").trim();r.charAt(r.length-1)==="=";)r=r.slice(0,-1);if(!/^[A-Za-z0-9_-]*$/.test(r))return new Uint8Array(0);for(var n=r.replace(/-/g,"+").replace(/_/g,"/");n.length%4;)n+="=";try{for(var t=atob(n),u=new Uint8Array(t.length),o=0;o<t.length;o++)u[o]=t.charCodeAt(o);return u}catch(i){return new Uint8Array(0)}}var L=["Jellyfin","TV","ID","API","URL","HTTP","HTTPS","IP","DNS","HDR","SDR","4K"],D={};["a","an","and","as","at","but","by","for","from","in","into","nor","of","on","or","per","the","to","via","vs","with"].forEach(function(e){D[e]=!0});var j=/[\p{L}\p{Nd}]/u,V=/\p{L}/u,z=/\p{Nd}/u,X=/\p{Lu}/u,K=/\s/;function Z(e){var r=String(e||"").trim().replace(/_/g,"-").toLowerCase();return r===""||r==="en"||r.indexOf("en-")===0}function w(...e){var r=[];return e.forEach(function(n){(n||[]).forEach(function(t){if(!(typeof t!="string"||!t.trim())){var u=t.trim(),o=u.toLowerCase(),i=-1;r.forEach(function(b,l){b.toLowerCase()===o&&(i=l)}),i>=0?r[i]=u:r.push(u)}})}),r.map(function(n,t){return{w:n,i:t}}).sort(function(n,t){return t.w.length-n.w.length||n.i-t.i}).map(function(n){return n.w})}function S(e){return e!==void 0&&j.test(e)}function U(e){if(!e)return e;var r=e.charAt(0).toUpperCase();return(r.length===1?r:e.charAt(0))+e.slice(1)}function M(e,r,n){for(var t=r;t<r+n;t++)e[t]=!0}function I(e,r,n){for(var t=r;t<r+n;t++)if(e[t])return!0;return!1}function k(e,r,n){for(var t=r-1;t>=0&&K.test(e[t]);)t--;return t<0||n&&t===r-1?"":e[t]}function E(e,r,n,t,u){var o=String(e==null?"":e);if(!o||!Z(n))return o;for(var i=o.split(""),b=i.map(function(){return!1}),l=0;l<i.length;l++)if(i[l]==="{"){for(var h=l+1;h<i.length&&i[h]!=="}"&&i[h]!=="{"&&!K.test(i[h]);)h++;h<i.length&&i[h]==="}"&&(M(b,l,h-l+1),l=h)}var _=o.toLowerCase();w(r).forEach(function(f){for(var P=f.toLowerCase(),s=0;s<=o.length-f.length;){var a=_.indexOf(P,s);if(a<0)return;var v=a+f.length,d=!S(i[a-1])&&!S(i[v]);if(d&&!I(b,a,f.length)){for(var c=0;c<f.length;c++)i[a+c]=f.charAt(c);M(b,a,f.length),s=v}else s=a+1}});for(var y=[],p=0;p<i.length;){if(!S(i[p])){p++;continue}for(var g=p;g<i.length&&(S(i[g])||(i[g]==="'"||i[g]==="\u2019")&&S(i[g+1]));)g++;y.push([p,g]),p=g}return y.forEach(function(f,P){var s=f[0],a=f[1];if(!I(b,s,a-s)){var v=i.slice(s,a).join("");if(!(X.test(v.slice(1))||z.test(v)&&V.test(v))){var d=v.toLowerCase(),c;if(t){var x=i[s-1]==="-"||i[a]==="-",J=P===0||P===y.length-1||x||k(i,s,!1)===":";c=!J&&D[d]?d:U(v)}else{var A=k(i,s,!0);c=P===0&&u!==!1||A==="."||A==="!"||A==="?"?U(d):d}for(var m=0;m<c.length&&m<a-s;m++)i[s+m]=c.charAt(m)}}}),i.join("")}window.StolonPage={webPushState:O,subscribeWebPush:T,unsubscribeWebPush:N,webPushLabel:W,titleCase:function(e,r,n){return E(e,w(L,r),n,!0)},sentenceCase:function(e,r,n){return E(e,w(L,r),n,!1)}};})();
        """;

    /// <summary>
    /// Answers a request for the script, as JavaScript that a browser checks again on every load.
    /// </summary>
    /// <param name="response">The response, which receives the cache header.</param>
    /// <returns>The script.</returns>
    public static ContentResult Serve(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        response.Headers.CacheControl = "no-cache";
        return new ContentResult { Content = Script, ContentType = "text/javascript; charset=utf-8", StatusCode = StatusCodes.Status200OK };
    }
}
