/* BrosWars Studio – Meta Pixel with consent (loads only after the visitor accepts). */
(function () {
  var PIXEL_ID = '2159615711184436';
  var KEY = 'bw_ads_consent';
  var cs = /^(cs|sk)/i.test(navigator.language || '') || /\.me$|nacti/.test(location.hostname);
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function load() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', { content_name: location.hostname + location.pathname });
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var h = a.href || '';
      if (/buy\.stripe\.com|checkout\.stripe\.com|\/pro\b|apps\.shopify\.com|itch\.io/.test(h)) {
        fbq('track', 'InitiateCheckout', { content_name: h.split('?')[0] });
      }
    }, true);
  }

  function banner() {
    var d = document.createElement('div');
    d.setAttribute('role', 'dialog');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:520px;margin:0 auto;background:#0d1020;color:#e8ecf8;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 16px;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)';
    var txt = cs
      ? 'Používáme cookies pro měření reklam (Meta Pixel), abychom věděli, které reklamy fungují. Souhlasíte?'
      : 'We use cookies to measure our ads (Meta Pixel) so we know which ads work. Do you agree?';
    d.innerHTML = '<div style="margin-bottom:10px">' + txt + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end">' +
      '<button data-v="no" style="background:transparent;color:#c9d1e8;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:8px 14px;cursor:pointer">' + (cs ? 'Odmítnout' : 'Decline') + '</button>' +
      '<button data-v="yes" style="background:#4f8cff;color:#fff;border:0;border-radius:999px;padding:8px 16px;font-weight:600;cursor:pointer">' + (cs ? 'Souhlasím' : 'Accept') + '</button></div>';
    d.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      set(v); d.remove();
      if (v === 'yes') load();
    });
    document.body.appendChild(d);
  }

  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
  }
})();
