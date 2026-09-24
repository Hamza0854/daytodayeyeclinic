/* ==========================================================================
   Day to Day Eye Clinic — interactions
   ========================================================================== */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Page-load sequence ---------- */
  const start = () => requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(start);
  } else {
    start();
  }

  /* ---------- Header: shadow, hide on scroll down, progress bar ---------- */
  const header = $(".site-header");
  const progress = $(".scroll-progress");
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("is-scrolled", y > 20);
    header.classList.toggle("is-hidden", y > 400 && y > lastY && !document.body.classList.contains("modal-open"));
    if (progress) progress.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : 0);
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Current section in nav ---------- */
  const navLinks = $$(".nav-links a");
  const sections = navLinks.map(a => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => navObserver.observe(s));
  }

  /* ---------- Close mobile menu after choosing a link ---------- */
  const mobileNav = $("#mobileNav");
  if (mobileNav && window.bootstrap) {
    $$("a", mobileNav).forEach(a => a.addEventListener("click", () => {
      bootstrap.Offcanvas.getOrCreateInstance(mobileNav).hide();
    }));
  }

  /* ---------- Open / closed status (Ghana time = UTC, no DST) ---------- */
  const HOURS = {
    0: null,               // Sunday closed
    1: [8 * 60, 16 * 60],
    2: [8 * 60, 16 * 60],
    3: [8 * 60, 16 * 60],
    4: [8 * 60, 16 * 60],
    5: [8 * 60, 16 * 60],
    6: [9 * 60 + 30, 14 * 60 + 30]
  };
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmt = mins => {
    const h = Math.floor(mins / 60), m = mins % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const updateStatus = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = HOURS[day];
    const chip = $("[data-open-status]");
    let text, open = false;

    if (today && mins >= today[0] && mins < today[1]) {
      open = true;
      text = `Open now, closes at ${fmt(today[1])}`;
    } else if (today && mins < today[0]) {
      text = `Closed now, opens today at ${fmt(today[0])}`;
    } else {
      let next = (day + 1) % 7;
      while (!HOURS[next]) next = (next + 1) % 7;
      const label = next === (day + 1) % 7 ? "tomorrow" : DAY_NAMES[next];
      text = `Closed now, opens ${label} at ${fmt(HOURS[next][0])}`;
    }

    if (chip) {
      chip.classList.toggle("is-open", open);
      chip.classList.toggle("is-closed", !open);
      $(".status-text", chip).textContent = text;
    }
    $$(".hours tr[data-days]").forEach(row => {
      row.classList.toggle("is-today", row.dataset.days.split(",").map(Number).includes(day));
    });
  };
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Iris parallax ---------- */
  const iris = $("[data-iris]");
  if (iris) {
    $$("[data-depth]", iris).forEach(el => el.style.setProperty("--d", el.dataset.depth));
    if (finePointer && !reduceMotion) {
      const hero = $(".hero");
      hero.addEventListener("pointermove", e => {
        const r = iris.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
        const y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
        iris.style.setProperty("--mx", Math.max(-1, Math.min(1, x)).toFixed(3));
        iris.style.setProperty("--my", Math.max(-1, Math.min(1, y)).toFixed(3));
      });
      hero.addEventListener("pointerleave", () => {
        iris.style.setProperty("--mx", 0);
        iris.style.setProperty("--my", 0);
      });
    }
  }

  /* ---------- Services: swap image on hover / focus ---------- */
  const svcItems = $$(".svc");
  const svcImgs = $$("[data-svc-img]");
  const svcCaption = $("[data-svc-caption]");
  const activate = item => {
    svcItems.forEach(i => i.classList.toggle("is-active", i === item));
    svcImgs.forEach(img => img.classList.toggle("is-active", img.dataset.svcImg === item.dataset.svc));
    if (svcCaption) svcCaption.textContent = $("h3", item).textContent;
  };
  svcItems.forEach(item => {
    item.addEventListener("mouseenter", () => activate(item));
    item.addEventListener("focus", () => activate(item));
  });

  /* ---------- Scroll reveals ---------- */
  const revealEls = $$("[data-reveal], .shot");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Gentle stagger for gallery tiles
        if (el.classList.contains("shot")) {
          const index = Number(el.dataset.index) || 0;
          el.style.transitionDelay = `${(index % 3) * 90}ms`;
        }
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("is-visible"));
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$(".btn-magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- Videos ---------- */
  $$(".film").forEach(film => {
    const video = $("video", film);
    const play = $(".film-play", film);
    if (!video || !play) return;
    play.addEventListener("click", () => {
      $$(".film video").forEach(v => { if (v !== video) v.pause(); });
      video.controls = true;
      video.play();
    });
    video.addEventListener("play", () => film.classList.add("is-playing"));
    video.addEventListener("pause", () => { if (video.ended) film.classList.remove("is-playing"); });
    video.addEventListener("ended", () => { film.classList.remove("is-playing"); video.controls = false; });
  });

  /* ---------- Lightbox ---------- */
  const lightboxEl = $("#lightbox");
  const shots = $$(".shot");
  if (lightboxEl && shots.length && window.bootstrap) {
    const modal = bootstrap.Modal.getOrCreateInstance(lightboxEl);
    const lbImg = $("[data-lb-img]", lightboxEl);
    const lbCap = $("[data-lb-caption]", lightboxEl);
    let current = 0;

    const show = i => {
      current = (i + shots.length) % shots.length;
      const img = $("img", shots[current]);
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = `${img.alt} (${current + 1} of ${shots.length})`;
    };

    shots.forEach((shot, i) => shot.addEventListener("click", () => { show(i); modal.show(); }));
    $("[data-lb-prev]", lightboxEl).addEventListener("click", () => show(current - 1));
    $("[data-lb-next]", lightboxEl).addEventListener("click", () => show(current + 1));

    lightboxEl.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });

    // Swipe on touch screens
    let touchX = null;
    lightboxEl.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
    lightboxEl.addEventListener("touchend", e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }

  /* ---------- Footer year ---------- */
  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
