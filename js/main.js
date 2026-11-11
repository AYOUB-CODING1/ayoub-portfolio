(function () {
  "use strict";

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function paintToggle() {
    var dark = currentTheme() === "dark";
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  toggle.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    paintToggle();
  });
  paintToggle();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  }
  menuBtn.addEventListener("click", function () {
    setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* ---------- Current section in the nav ---------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (a) { a.removeAttribute("aria-current"); });
          var a = map[entry.target.id];
          if (a) a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ---------- F-1 round-trip instrument ---------- */
  // Exact integer arithmetic throughout (BigInt), mirroring the paper's design:
  // K = 27,720; x is a positive divisor of K other than 1;
  // f(x) = 1 - K/x; f^-1(y) = K / (1 - y).
  var K = 27720n;
  var fmt = function (n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",").replace("-", "−"); };

  function divisors() {
    var out = [];
    for (var d = 2n; d <= K; d++) { if (K % d === 0n) out.push(d); }
    return out;
  }
  function forward(x) { return 1n - K / x; }
  function inverse(y) { return K / (1n - y); }

  var plotUpdate = function () {};
  var divs = divisors();
  var select = document.getElementById("divisor");
  var ids = ["t-q", "t-x1", "t-q2", "t-y", "t-y2", "t-y3", "t-d", "t-rec", "t-ok"];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById(id); });

  divs.forEach(function (d) {
    var o = document.createElement("option");
    o.value = d.toString();
    o.textContent = fmt(d);
    select.appendChild(o);
  });
  select.value = "360"; // the worked example in the paper

  function show(x) {
    var q = K / x;
    var y = forward(x);
    var back = inverse(y);
    el["t-q"].textContent = fmt(q);
    el["t-x1"].textContent = fmt(x);
    el["t-q2"].textContent = fmt(q);
    el["t-y"].textContent = fmt(y);
    el["t-y2"].textContent = fmt(y);
    el["t-y3"].textContent = fmt(y);
    el["t-d"].textContent = fmt(back);
    el["t-rec"].textContent = fmt(back);
    var ok = back === x;
    el["t-ok"].textContent = ok ? "Matches the original exactly" : "Does not match";
    el["t-ok"].className = "t-ok" + (ok ? "" : " is-bad");
    plotUpdate(x);
    var trace = document.getElementById("trace");
    trace.classList.remove("flash");
    void trace.offsetWidth;
    trace.classList.add("flash");
  }

  select.addEventListener("change", function () { show(BigInt(select.value)); });

  document.getElementById("random-btn").addEventListener("click", function () {
    var pick;
    do { pick = divs[Math.floor(Math.random() * divs.length)]; } while (pick.toString() === select.value && divs.length > 1);
    select.value = pick.toString();
    show(pick);
  });

  document.getElementById("check-all").addEventListener("click", function () {
    var seen = new Set();
    var good = 0;
    divs.forEach(function (x) {
      var y = forward(x);
      seen.add(y.toString());
      if (inverse(y) === x) good++;
    });
    document.getElementById("check-out").textContent =
      good + " of " + divs.length + " divisors return to the original value exactly, and the forward function produces " +
      seen.size + " distinct outputs. This checks the mathematics only; the character assignment depends on the seed in the project code.";
  });

  /* ---------- Plot of the codebook ---------- */
  // x against K/x on logarithmic axes: the 95 divisors lie on a straight line,
  // and each divisor's partner K/x is mirrored across the diagonal.
  var plotEl = document.getElementById("plot");
  if (plotEl) {
    var NS = "http://www.w3.org/2000/svg";
    var W = 520, H = 460, ml = 66, mr = 22, mt = 22, mb = 58;
    var HI = 4.6;
    var sx = function (v) { return ml + (Math.log10(Number(v)) / HI) * (W - ml - mr); };
    var sy = function (v) { return H - mb - (Math.log10(Number(v)) / HI) * (H - mt - mb); };
    var mk = function (tag, attrs, parent, text) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text !== undefined) n.textContent = text;
      parent.appendChild(n);
      return n;
    };

    var svg = mk("svg", {
      viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Plot of the 95 divisors of 27,720 against 27,720 divided by each divisor, on logarithmic axes. The dots lie on a straight line."
    }, plotEl);

    var ticks = [1, 10, 100, 1000, 10000];
    ticks.forEach(function (t) {
      mk("line", { class: "grid", x1: sx(t), x2: sx(t), y1: mt, y2: H - mb }, svg);
      mk("line", { class: "grid", x1: ml, x2: W - mr, y1: sy(t), y2: sy(t) }, svg);
      mk("text", { class: "tick", x: sx(t), y: H - mb + 20, "text-anchor": "middle" }, svg, fmt(BigInt(t)));
      mk("text", { class: "tick", x: ml - 10, y: sy(t) + 4, "text-anchor": "end" }, svg, fmt(BigInt(t)));
    });
    mk("line", { class: "axis", x1: ml, x2: W - mr, y1: H - mb, y2: H - mb }, svg);
    mk("line", { class: "axis", x1: ml, x2: ml, y1: mt, y2: H - mb }, svg);
    mk("text", { class: "axis-title", x: (ml + W - mr) / 2, y: H - 10, "text-anchor": "middle" }, svg, "divisor x");
    mk("text", { class: "axis-title", transform: "translate(16 " + ((mt + H - mb) / 2) + ") rotate(-90)", "text-anchor": "middle" }, svg, "K / x  (equals 1 − y)");

    mk("line", { class: "trend", x1: sx(1), y1: sy(27720), x2: sx(27720), y2: sy(1) }, svg);

    divs.forEach(function (d, i) {
      var c = mk("circle", { class: "pt", cx: sx(d), cy: sy(K / d), r: 3.4 }, svg);
      c.style.setProperty("--i", i);
    });

    var partner = mk("g", { class: "partner" }, svg);
    var pRing = mk("circle", { r: 8 }, partner);
    var pText = mk("text", { "text-anchor": "start" }, partner, "partner");
    var sel = mk("g", { class: "sel" }, svg);
    var gx = mk("line", { class: "guide" }, sel);
    var gy = mk("line", { class: "guide" }, sel);
    var dot = mk("circle", { r: 7.5 }, sel);
    var lx = mk("text", { class: "sel-label", "text-anchor": "middle" }, sel);
    var ly = mk("text", { class: "sel-label", "text-anchor": "start" }, sel);

    plotUpdate = function (x) {
      var q = K / x;
      var px = sx(x), py = sy(q);
      gx.setAttribute("x1", px); gx.setAttribute("x2", px); gx.setAttribute("y1", py); gx.setAttribute("y2", H - mb);
      gy.setAttribute("x1", ml); gy.setAttribute("x2", px); gy.setAttribute("y1", py); gy.setAttribute("y2", py);
      dot.setAttribute("cx", px); dot.setAttribute("cy", py);
      lx.setAttribute("x", px); lx.setAttribute("y", H - mb - 8); lx.textContent = fmt(x);
      ly.setAttribute("x", ml + 8); ly.setAttribute("y", py - 8); ly.textContent = fmt(q);
      if (q > 1n && q !== x) {
        var ax = sx(q), ay = sy(x);
        pRing.setAttribute("cx", ax); pRing.setAttribute("cy", ay);
        // keep the label inside the plot: put it on the left when the partner is near the right edge
        var flip = ax > W * 0.62;
        pText.setAttribute("text-anchor", flip ? "end" : "start");
        pText.setAttribute("x", flip ? ax - 13 : ax + 13);
        pText.setAttribute("y", ay + 4);
        pText.textContent = "partner " + fmt(q);
        partner.style.display = "";
      } else {
        partner.style.display = "none";
      }
    };
  }

  /* ---------- Certificate preview ---------- */
  var dialog = document.getElementById("cert-dialog");
  var thumbs = Array.prototype.slice.call(document.querySelectorAll(".cert-thumb"));
  if (dialog && thumbs.length) {
    var cdImg = document.getElementById("cd-img");
    var cdCap = document.getElementById("cd-caption");
    var current = 0;

    var showCert = function (i) {
      current = (i + thumbs.length) % thumbs.length;
      var t = thumbs[current];
      cdImg.src = t.getAttribute("data-large");
      cdImg.alt = "Certificate: " + t.getAttribute("data-caption");
      cdCap.textContent = (current + 1) + " of " + thumbs.length + ": " + t.getAttribute("data-caption");
    };
    var openCert = function (i) {
      showCert(i);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    };

    thumbs.forEach(function (t, i) { t.addEventListener("click", function () { openCert(i); }); });
    document.getElementById("cd-prev").addEventListener("click", function () { showCert(current - 1); });
    document.getElementById("cd-next").addEventListener("click", function () { showCert(current + 1); });
    document.getElementById("cd-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); showCert(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); showCert(current + 1); }
    });
  }

  show(360n);
})();
