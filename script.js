/* St. Mary's Parents' Association — small, dependency-free helpers.
   No cookies, no analytics, no network requests. The only thing remembered is
   the visitor's own accessibility choices, kept on their device (localStorage). */
(function () {
  "use strict";
  var doc = document;
  doc.documentElement.classList.add("js");

  /* mobile menu */
  var btn = doc.querySelector("[data-menu-toggle]");
  var nav = doc.getElementById("site-nav");
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  }

  /* reveal on scroll */
  var items = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && items.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* photo slots: if the real photo is missing, show the illustration */
  Array.prototype.forEach.call(doc.querySelectorAll(".photo img"), function (img) {
    var fig = img.closest(".photo");
    var fail = function () { fig.classList.add("is-art"); img.remove(); };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener("error", fail);
  });

  /* gallery lightbox (only for photos that actually loaded) */
  var box = doc.querySelector("[data-lightbox]");
  if (box && box.showModal) {
    var big = box.querySelector("img");
    var cap = box.querySelector("p");
    doc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-zoom]");
      if (b) {
        var fig = b.closest(".photo");
        var img = fig && fig.querySelector("img");
        if (!img) return;
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        cap.textContent = b.getAttribute("data-caption") || "";
        box.showModal();
      } else if (e.target === box || e.target.closest("[data-lightbox-close]")) {
        box.close();
      }
    });
  }

  /* =======================================================================
     Accessibility menu and read-aloud
     ======================================================================= */
  var root = doc.documentElement;
  var KEY = "pa-a11y";
  var SIZES = [1, 1.15, 1.3, 1.5, 1.75];
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { prefs = {}; }
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} };

  var applyPrefs = function () {
    if (prefs.theme && prefs.theme !== "auto") root.setAttribute("data-theme", prefs.theme);
    else root.removeAttribute("data-theme");
    ["font", "spacing", "links", "motion", "bg", "focus"].forEach(function (k) {
      if (prefs[k]) root.setAttribute("data-" + k, prefs[k]); else root.removeAttribute("data-" + k);
    });
    if (prefs.scale && prefs.scale !== 1) root.style.setProperty("--a11y-scale", String(prefs.scale));
    else root.style.removeProperty("--a11y-scale");
  };
  applyPrefs();

  var el = function (tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return n;
  };
  var svg = function (inner) {
    var w = doc.createElement("div");
    w.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + "</svg>";
    return w.firstChild;
  };
  var ICON_PERSON = '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5m0 0l-3 5.5M12 15l3 5.5"/>';
  var ICON_SPEAKER = '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>';
  var ICON_STOP = '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>';

  /* live region so changes are announced to screen readers too */
  var live = el("div", { "class": "sr-only", role: "status", "aria-live": "polite" });
  doc.body.appendChild(live);
  var say = function (t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 40); };

  /* ---------- read aloud engine ---------- */
  var synth = window.speechSynthesis;
  var canSpeak = !!(synth && window.SpeechSynthesisUtterance);
  var speed = prefs.speed || 1;
  var voice = null;
  var pickVoice = function () {
    var vs = synth.getVoices() || [];
    var by = function (re) { return vs.filter(function (v) { return re.test(v.lang); })[0]; };
    voice = by(/^en[-_]IE/i) || by(/^en[-_]GB/i) || by(/^en/i) || null;
  };
  if (canSpeak) { pickVoice(); if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoice); }

  var SKIP = "script,style,svg,noscript,button,iframe,[aria-hidden='true'],.listen-row,.art-note,.sr-only,.a11y-panel,.a11y-fab";
  var gather = function (node) {
    var out = [], buf = "";
    var flush = function () {
      var t = buf.replace(/\s+/g, " ").trim(); buf = "";
      if (t) out.push(/[.!?:;]$/.test(t) ? t : t + ".");
    };
    var walk = function (n) {
      if (n.nodeType === 3) { buf += n.nodeValue; return; }
      if (n.nodeType !== 1 || n.matches(SKIP)) return;
      var cs = window.getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (n.tagName === "BR") { flush(); return; }
      if (n.tagName === "IMG") {
        var a = (n.getAttribute("alt") || "").trim();
        if (a && n.naturalWidth > 0) { flush(); out.push("Image: " + a + (/[.!?]$/.test(a) ? "" : ".")); }
        return;
      }
      var block = cs.display !== "inline" && cs.display !== "contents";
      if (block) flush();
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (block) flush();
    };
    walk(node);
    return out;
  };
  var split = function (text) {
    var parts = text.replace(/\b(St|Mr|Mrs|Ms|Dr|Co)\./g, "$1\u0001").match(/[^.!?]+[.!?]*\s*/g) || [text], res = [];
    parts.forEach(function (p) {
      p = p.trim().replace(/\u0001/g, ".");
      while (p.length > 220) {
        var cut = p.lastIndexOf(", ", 200); if (cut < 60) cut = p.lastIndexOf(" ", 200); if (cut < 60) cut = 200;
        res.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim();
      }
      if (p) res.push(p);
    });
    return res;
  };

  var token = 0, active = null; /* active = { node, btn } */
  var setBtn = function (btn, on) {
    if (!btn || !btn.classList.contains("listen-btn")) return;
    var h = btn.getAttribute("data-title") || "this section";
    btn.setAttribute("aria-label", (on ? "Stop reading " : "Listen to ") + h);
    var t = btn.querySelector(".t"); if (t) t.textContent = on ? "Stop" : "Listen";
    btn.replaceChild(svg(on ? ICON_STOP : ICON_SPEAKER), btn.querySelector("svg"));
  };
  var clearActive = function () {
    if (!active) return;
    active.node.classList.remove("is-reading");
    setBtn(active.btn, false);
    if (stopBtn) stopBtn.hidden = true;
    active = null;
  };
  var stopSpeech = function (announce) {
    token++;
    if (canSpeak) synth.cancel();
    var had = !!active;
    clearActive();
    if (had && announce) say("Stopped reading.");
  };
  var speakNode = function (node, btn) {
    if (!canSpeak) return;
    if (active && active.node === node) { stopSpeech(true); return; }
    stopSpeech(false);
    var chunks = [];
    gather(node).forEach(function (t) { chunks = chunks.concat(split(t)); });
    if (!chunks.length) return;
    var mine = ++token, i = 0;
    active = { node: node, btn: btn };
    node.classList.add("is-reading");
    setBtn(btn, true);
    if (stopBtn) stopBtn.hidden = false;
    var next = function () {
      if (mine !== token) return;
      if (i >= chunks.length) { clearActive(); return; }
      var u = new window.SpeechSynthesisUtterance(chunks[i++]);
      u.rate = speed; u.lang = voice ? voice.lang : "en-GB";
      if (voice) u.voice = voice;
      u.onend = next;
      u.onerror = function (e) { if (mine === token && e.error !== "interrupted" && e.error !== "canceled") { stopSpeech(false); } };
      synth.speak(u);
    };
    setTimeout(next, 60); /* lets cancel() settle: avoids a silent first utterance in Chrome */
  };
  window.addEventListener("pagehide", function () { if (canSpeak) synth.cancel(); });

  /* per-section speaker buttons */
  if (canSpeak) {
    Array.prototype.forEach.call(doc.querySelectorAll("main > section"), function (sec) {
      var h = sec.querySelector("h1,h2,h3");
      if (!h || (sec.textContent || "").trim().length < 60) return;
      var title = "the section: " + h.textContent.replace(/\s+/g, " ").trim();
      var b = el("button", { type: "button", "class": "listen-btn", "data-title": title, "aria-label": "Listen to " + title }, [svg(ICON_SPEAKER), el("span", { "class": "t", text: "Listen" })]);
      b.addEventListener("click", function () { speakNode(sec, b); });
      sec.insertBefore(el("div", { "class": "wrap listen-row" }, [b]), sec.firstChild);
    });
  }

  /* ---------- the menu ---------- */
  var opt = function (label, pressed, onClick, extra) {
    var b = el("button", { type: "button", "class": "a11y-opt" + (extra ? " " + extra : ""), "aria-pressed": String(!!pressed), text: label });
    b.addEventListener("click", onClick);
    return b;
  };
  var group = function (title, nodes, note) {
    var g = el("div", { "class": "a11y-group", role: "group", "aria-label": title }, [el("h3", { text: title, "aria-hidden": "true" }), el("div", { "class": "a11y-row" }, nodes)]);
    if (note) g.appendChild(el("p", { "class": "a11y-note", text: note }));
    return g;
  };

  var fab = el("button", { type: "button", "class": "a11y-fab", "aria-expanded": "false", "aria-controls": "a11y-panel" }, [svg(ICON_PERSON), el("span", { text: "Accessibility" })]);
  fab.setAttribute("aria-label", "Accessibility menu");
  var panel = el("div", { id: "a11y-panel", "class": "a11y-panel", role: "dialog", "aria-label": "Accessibility settings", hidden: "" });
  var stopBtn = null;
  var sizeOut = el("output", { "aria-live": "polite" });

  var build = function () {
    panel.textContent = "";
    var close = el("button", { type: "button", "class": "a11y-opt a11y-close", "aria-label": "Close accessibility menu", text: "×" });
    close.addEventListener("click", function () { toggle(false); });
    panel.appendChild(el("div", { "class": "a11y-head" }, [el("h2", { text: "Accessibility" }), close]));

    var themes = [["auto", "Match my device"], ["light", "Light"], ["dark", "Dark"], ["contrast", "High contrast"]];
    panel.appendChild(group("Colour theme", themes.map(function (t) {
      return opt(t[1], (prefs.theme || "auto") === t[0], function () { prefs.theme = t[0]; save(); applyPrefs(); build(); panel.querySelector("[aria-pressed='true']").focus(); say(t[1] + " theme on."); });
    })));

    var idx = Math.max(0, SIZES.indexOf(prefs.scale || 1));
    var setSize = function (d) {
      var n = Math.min(SIZES.length - 1, Math.max(0, idx + d)); if (n === idx) return;
      prefs.scale = SIZES[n]; save(); applyPrefs(); build();
      var again = panel.querySelector(d > 0 ? "[data-size='up']" : "[data-size='down']"); if (again) again.focus();
    };
    var down = opt("A−", false, function () { setSize(-1); }); down.removeAttribute("aria-pressed"); down.setAttribute("aria-label", "Smaller text"); down.setAttribute("data-size", "down");
    var up = opt("A+", false, function () { setSize(1); }); up.removeAttribute("aria-pressed"); up.setAttribute("aria-label", "Larger text"); up.setAttribute("data-size", "up");
    sizeOut.textContent = Math.round(SIZES[idx] * 100) + "%";
    if (idx === 0) down.setAttribute("aria-disabled", "true");
    if (idx === SIZES.length - 1) up.setAttribute("aria-disabled", "true");
    panel.appendChild(group("Text size", [el("div", { "class": "a11y-size" }, [down, sizeOut, up])]));

    var tog = function (label, key, onVal, msg) {
      return opt(label, prefs[key] === onVal, function () {
        if (prefs[key] === onVal) delete prefs[key]; else prefs[key] = onVal;
        save(); applyPrefs(); build();
        var f = Array.prototype.filter.call(panel.querySelectorAll(".a11y-opt"), function (b) { return b.textContent.replace("✓", "") === label; })[0]; if (f) f.focus();
        say(msg + (prefs[key] === onVal ? " on." : " off."));
      });
    };
    panel.appendChild(group("Easier reading", [
      tog("Easy-read font", "font", "readable", "Easy-read font"),
      tog("Wider spacing", "spacing", "wide", "Wider spacing"),
      tog("Underline links", "links", "on", "Underlined links")
    ]));
    panel.appendChild(group("Comfort", [
      tog("Calm page (no movement)", "motion", "reduce", "Calm page"),
      tog("Hide background photos", "bg", "off", "Hiding background photos"),
      tog("Stronger focus outline", "focus", "strong", "Stronger focus outline")
    ]));

    if (canSpeak) {
      var speeds = [["Slow", 0.8], ["Normal", 1], ["Fast", 1.25]];
      stopBtn = opt("Stop", false, function () { stopSpeech(true); }, "a11y-stop"); stopBtn.removeAttribute("aria-pressed"); stopBtn.hidden = !active;
      var readAll = opt("Read the whole page", false, function () { var m = doc.getElementById("main") || doc.body; speakNode(m, null); say("Reading the page."); });
      readAll.removeAttribute("aria-pressed");
      panel.appendChild(group("Read aloud", [readAll, stopBtn].concat(speeds.map(function (sp) {
        return opt(sp[0], speed === sp[1], function () { speed = sp[1]; prefs.speed = speed; save(); build(); say(sp[0] + " speed."); });
      })), "Or press the yellow Listen button at the top of any section to hear just that part."));
    } else {
      panel.appendChild(el("p", { "class": "a11y-note", text: "Read-aloud isn’t available in this browser. Your device’s own screen reader will work on every page." }));
    }

    var reset = opt("Reset all settings", false, function () { prefs = {}; speed = 1; save(); applyPrefs(); stopSpeech(false); build(); say("All settings reset."); }, "a11y-reset");
    reset.removeAttribute("aria-pressed");
    panel.appendChild(reset);
  };

  var toggle = function (open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) { build(); var first = panel.querySelector("button"); if (first) first.focus(); }
    else fab.focus();
  };
  fab.addEventListener("click", function () { toggle(panel.hidden); });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!panel.hidden) toggle(false); else if (active) stopSpeech(true); }
  });
  doc.body.appendChild(panel);
  doc.body.appendChild(fab);
})();
