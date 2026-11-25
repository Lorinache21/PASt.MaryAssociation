/* St. Mary's Parents' Association — small, dependency-free helpers.
   No cookies, no storage, no network requests. */
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
})();
