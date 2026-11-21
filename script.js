/* ==========================================================================
   St. Mary's Parents' Association — shared script
   Vanilla JavaScript only. No cookies, no analytics, no third-party requests.
   The only thing saved is your light/dark choice, in this browser's local
   storage on your own device. It never leaves your device.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function prefersReduced() {
    return motionQuery.matches;
  }

  /* ---------------------------------------------------------------- theme */
  var THEME_KEY = "pa-theme";

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      var dark = theme === "dark";
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title", dark ? "Switch to light mode" : "Switch to dark mode");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#08131f" : "#1d3f72");
    }
  }

  applyTheme(root.getAttribute("data-theme") || systemTheme());

  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (err) {
        /* storage blocked — the choice simply won't be remembered */
      }
    });
  }

  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      var stored = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch (err) {
        stored = null;
      }
      if (!stored) applyTheme(systemTheme());
    });
  } catch (err) {
    /* older browsers: ignore */
  }

  /* ------------------------------------------------------------ mobile nav */
  var menuBtn = document.querySelector("[data-menu-toggle]");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        menuBtn.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  /* --------------------------------------------------------- current page */
  var here = window.location.pathname.split("/").pop() || "index.html";
  var navLinks = document.querySelectorAll("#site-nav a");
  Array.prototype.forEach.call(navLinks, function (link) {
    if (link.getAttribute("href") === here) link.setAttribute("aria-current", "page");
  });

  /* ------------------------------------------------------- header on scroll */
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------ reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if ("IntersectionObserver" in window && !prefersReduced()) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
      );
      Array.prototype.forEach.call(revealEls, function (el) {
        observer.observe(el);
      });
    } else {
      Array.prototype.forEach.call(revealEls, function (el) {
        el.classList.add("is-visible");
      });
    }
  }

  /* -------------------------------------------------- optional hero photo */
  Array.prototype.forEach.call(document.querySelectorAll("[data-scene-photo]"), function (img) {
    var hero = img.closest(".hero");

    function show() {
      img.hidden = false;
      if (hero) hero.classList.add("has-photo");
    }

    function hide() {
      img.hidden = true;
      if (hero) hero.classList.remove("has-photo");
    }

    if (img.complete) {
      if (img.naturalWidth > 0) show();
      else hide();
    } else {
      img.addEventListener("load", show);
      img.addEventListener("error", hide);
    }
  });

  /* ------------------------------------------------------------- 3D board */
  var board = document.querySelector("[data-board]");
  if (board) initBoard(board);

  function initBoard(boardEl) {
    var ring = boardEl.querySelector("[data-board-ring]");
    var viewport = boardEl.querySelector(".board-viewport");
    var cards = Array.prototype.slice.call(boardEl.querySelectorAll(".board-card"));
    var scenes = Array.prototype.slice.call(boardEl.querySelectorAll(".board-scene"));
    var dots = Array.prototype.slice.call(boardEl.querySelectorAll("[data-board-dot]"));
    var live = boardEl.querySelector("[data-board-live]");
    if (!ring || !viewport || !cards.length) return;

    var total = cards.length;
    var step = 360 / total;
    var index = 0;
    var current = 0;
    var dragging = false;
    var startX = 0;
    var startCurrent = 0;
    var moved = 0;
    var pointerId = null;

    function radius() {
      var width = cards[0].offsetWidth || 300;
      return Math.round((width / 2 / Math.tan(Math.PI / total)) * 1.16);
    }

    function paint() {
      ring.style.transform =
        "translateZ(" + -radius() + "px) rotateY(" + current + "deg)";
    }

    function layout() {
      var r = radius();
      cards.forEach(function (card, i) {
        card.style.transform = "rotateY(" + i * step + "deg) translateZ(" + r + "px)";
      });
      paint();
    }

    function setActive(next, announce) {
      index = ((next % total) + total) % total;
      current = -index * step;

      cards.forEach(function (card, i) {
        var on = i === index;
        card.setAttribute("data-active", on ? "true" : "false");
        if (on) card.removeAttribute("aria-hidden");
        else card.setAttribute("aria-hidden", "true");
        if (on) card.removeAttribute("tabindex");
        else card.setAttribute("tabindex", "-1");
      });

      scenes.forEach(function (scene, i) {
        scene.setAttribute("data-active", i === index ? "true" : "false");
      });

      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });

      if (announce && live) {
        var heading = cards[index].querySelector("h3");
        live.textContent = "Card " + (index + 1) + " of " + total + ": " + (heading ? heading.textContent : "");
      }
    }

    function go(next) {
      setActive(next, true);
      paint();
    }

    /* drag / swipe */
    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      moved = 0;
      startX = event.clientX;
      startCurrent = current;
      pointerId = event.pointerId;
      ring.classList.add("is-dragging");
      try {
        viewport.setPointerCapture(pointerId);
      } catch (err) {
        /* ignore */
      }
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      current = startCurrent + dx * 0.32;
      paint();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      ring.classList.remove("is-dragging");
      setActive(Math.round(-current / step), true);
      paint();
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("pointerleave", function () {
      if (dragging) endDrag();
    });

    /* cards: tap a side card to bring it forward, tap the front card to open */
    cards.forEach(function (card, i) {
      card.addEventListener("click", function (event) {
        if (moved > 8) {
          event.preventDefault();
          moved = 0;
          return;
        }
        if (i !== index) {
          event.preventDefault();
          go(i);
        }
      });

      card.addEventListener("keydown", function (event) {
        if (event.key === " ") {
          event.preventDefault();
          go(i);
        }
      });
    });

    /* arrows */
    var prevBtn = boardEl.querySelector("[data-board-prev]");
    var nextBtn = boardEl.querySelector("[data-board-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { go(index - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(index + 1); });

    /* dots */
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { go(i); });
    });

    /* keyboard */
    boardEl.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    });

    /* resize */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 160);
    });

    layout();
    setActive(0, false);
  }

  /* ------------------------------------------------------------- lightbox */
  var lightbox = document.querySelector("[data-lightbox]");
  if (lightbox) initLightbox(lightbox);

  function initLightbox(box) {
    var image = box.querySelector("[data-lb-img]");
    var caption = box.querySelector("[data-lb-cap]");
    var counter = box.querySelector("[data-lb-count]");
    var items = [];
    var position = 0;
    var opener = null;

    function available() {
      return Array.prototype.filter.call(
        document.querySelectorAll("[data-gallery-item]"),
        function (btn) {
          var figure = btn.closest(".gallery-item");
          return figure && !figure.classList.contains("is-missing");
        }
      );
    }

    function show(next) {
      items = available();
      if (!items.length) return;
      position = ((next % items.length) + items.length) % items.length;
      var btn = items[position];
      image.src = btn.getAttribute("data-full");
      image.alt = btn.getAttribute("data-alt") || "";
      if (caption) caption.textContent = btn.getAttribute("data-caption") || "";
      if (counter) counter.textContent = position + 1 + " / " + items.length;
    }

    function open(btn) {
      opener = btn;
      items = available();
      show(items.indexOf(btn));
      box.hidden = false;
      document.body.classList.add("lb-open");
      var closeBtn = box.querySelector("[data-lb-close]");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      box.hidden = true;
      document.body.classList.remove("lb-open");
      if (opener) opener.focus();
    }

    document.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-gallery-item]");
      if (!btn) return;
      event.preventDefault();
      open(btn);
    });

    box.addEventListener("click", function (event) {
      if (event.target === box || event.target.closest("[data-lb-close]")) {
        close();
      } else if (event.target.closest("[data-lb-prev]")) {
        show(position - 1);
      } else if (event.target.closest("[data-lb-next]")) {
        show(position + 1);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (box.hidden) return;
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        show(position + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(position - 1);
      } else if (event.key === "Tab") {
        var focusables = box.querySelectorAll("button");
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ------------------------------------- gallery placeholders for no photo */
  Array.prototype.forEach.call(document.querySelectorAll(".gallery-item img"), function (img) {
    function markMissing() {
      var figure = img.closest(".gallery-item");
      if (figure) figure.classList.add("is-missing");
    }

    if (img.complete) {
      if (!img.naturalWidth) markMissing();
    } else {
      img.addEventListener("error", markMissing);
    }
  });

  /* ---------------------------------------------------- smooth page change */
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    var href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return;
    if (link.host !== window.location.host) return;
    if (!/\.html([?#].*)?$/.test(href)) return;
    if (prefersReduced()) return;

    event.preventDefault();
    document.body.classList.add("is-leaving");
    window.setTimeout(function () {
      window.location.href = link.href;
    }, 180);
  });

  /* ------------------------------------------------------------ footer year */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
