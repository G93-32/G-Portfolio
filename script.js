// Tells the failsafe in index.html that JS is alive and the reveals will run.
window.__ready = true;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Chapters menu ─────────────────────────────────────────── */
const chaptersBtn = document.getElementById('chaptersBtn');
const menu = document.getElementById('menu');

chaptersBtn.addEventListener('click', () => {
  document.body.classList.toggle('menu-open');
});

menu.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => document.body.classList.remove('menu-open'))
);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.body.classList.remove('menu-open');
});

/* ── Reveal on scroll ──────────────────────────────────────────
   Driven by scroll position rather than IntersectionObserver: an
   observer that never fires would leave the whole page invisible. */
let pending = [...document.querySelectorAll('.rv, .line')];

function checkReveals() {
  const vh = window.innerHeight;
  if (!vh) return; // viewport not measurable yet — try again on a later pass
  for (let i = pending.length - 1; i >= 0; i--) {
    const box = pending[i].getBoundingClientRect();
    if (box.top < vh * 0.9 && box.bottom > 0) {
      pending[i].classList.add('in');
      pending.splice(i, 1);
    }
  }
}

/* ── Stat counters ─────────────────────────────────────────── */
const pad = n => String(n).padStart(2, '0');
let statsPending = [...document.querySelectorAll('.stat-n')];

// Real figures live in the markup so they're correct without JS; zero them
// here only because we're about to count up to them.
if (!reduced) statsPending.forEach(el => { el.textContent = '00'; });

function runCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  if (reduced || target === 0) { el.textContent = pad(target); return; }

  const duration = 1100;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = pad(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function checkStats() {
  const vh = window.innerHeight;
  for (let i = statsPending.length - 1; i >= 0; i--) {
    const box = statsPending[i].getBoundingClientRect();
    if (box.top < vh * 0.85 && box.bottom > 0) {
      runCounter(statsPending[i]);
      statsPending.splice(i, 1);
    }
  }
}

/* ── Scroll progress + auto-hiding header ──────────────────── */
const progress = document.getElementById('progress');
const header = document.getElementById('header');
let lastY = 0;

const update = () => {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

  // Hide the header while scrolling down, bring it back on the way up.
  const hide = y > lastY && y > 400 && !document.body.classList.contains('menu-open');
  header.classList.toggle('hide', hide);
  lastY = y;

  checkReveals();
  checkStats();
  checkHeaderTone();
};

/* The header sits over both light and dark sections, so flip its colour
   whenever it overlaps one of the dark ones. */
const darkSections = document.querySelectorAll('.infos, .pin-dark, .footer');

function checkHeaderTone() {
  const mid = header.getBoundingClientRect().bottom - 12;
  let onDark = false;
  darkSections.forEach(s => {
    const b = s.getBoundingClientRect();
    if (b.top <= mid && b.bottom >= mid) onDark = true;
  });
  header.classList.toggle('on-dark', onDark);
}

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { update(); ticking = false; });
};

window.addEventListener('scroll', onScroll, { passive: true });
// Resize runs update directly: it's infrequent, and going through the
// rAF throttle would strand the reveals if frames aren't being served.
window.addEventListener('resize', update, { passive: true });
window.addEventListener('load', update);
// Web fonts change line heights, so re-measure once they land.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
// Layout and viewport size can settle late. Re-check over the first few
// seconds so nothing is left stuck invisible if an early pass measured 0.
[100, 400, 1000, 2500].forEach(t => setTimeout(update, t));
update();

/* ── Timeline rail: drag to scroll ─────────────────────────── */
const rail = document.getElementById('rail');
let down = false, startX = 0, startScroll = 0, moved = false;

rail.addEventListener('pointerdown', e => {
  down = true; moved = false;
  startX = e.clientX;
  startScroll = rail.scrollLeft;
  rail.classList.add('dragging');
});

rail.addEventListener('pointermove', e => {
  if (!down) return;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 4) moved = true;
  rail.scrollLeft = startScroll - dx;
});

const endDrag = () => {
  down = false;
  rail.classList.remove('dragging');
};
rail.addEventListener('pointerup', endDrag);
rail.addEventListener('pointerleave', endDrag);
rail.addEventListener('pointercancel', endDrag);

// A drag that ends on a card shouldn't also count as a click.
rail.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);

/* ── Footer year ───────────────────────────────────────────── */
document.getElementById('year').textContent = new Date().getFullYear();
