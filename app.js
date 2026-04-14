/* ============================================================
   BREEZYEE VANS — App JS
   ============================================================ */

// ── NAVBAR SCROLL ──
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── MOBILE NAV ──
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── REVEAL ON SCROLL ──
const revealEls = document.querySelectorAll('.reveal');

function revealCheck() {
  revealEls.forEach(el => {
    if (el.classList.contains('visible')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 20) {
      const siblings = [...el.parentElement.querySelectorAll('.reveal:not(.visible)')];
      const idx = siblings.indexOf(el);
      el.style.transitionDelay = `${idx * 80}ms`;
      el.classList.add('visible');
    }
  });
}

const ro = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')];
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 80}ms`;
      entry.target.classList.add('visible');
      ro.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
revealEls.forEach(el => ro.observe(el));

// Scroll fallback (fixes iOS Safari overflow-x issue with IntersectionObserver)
window.addEventListener('scroll', revealCheck, { passive: true });
window.addEventListener('resize', revealCheck, { passive: true });
// Run once on load to show elements already in view
revealCheck();

// ── BOOKING TABS (booking page) ──
const bkTabs = document.querySelectorAll('.bk-tab');
const helpersField = document.getElementById('helpersField');
let activeService = 'van-hire';

// Pre-select from URL param
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('service') === 'man-van') activeService = 'man-van';
if (urlParams.get('van')) {
  const vs = document.getElementById('vanSize');
  if (vs) vs.value = urlParams.get('van');
}

bkTabs.forEach(tab => {
  if (tab.dataset.tab === activeService) tab.classList.add('active');
  else tab.classList.remove('active');

  tab.addEventListener('click', () => {
    bkTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeService = tab.dataset.tab;
    if (helpersField) helpersField.style.display = activeService === 'man-van' ? 'flex' : 'none';
    const sumSvc = document.getElementById('sum-service');
    if (sumSvc) sumSvc.textContent = activeService === 'man-van' ? 'Man & Van' : 'Van Hire';
    calcPrice();
  });
});
if (activeService === 'man-van' && helpersField) {
  helpersField.style.display = 'flex';
  bkTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === 'man-van'));
}

// ── FLEET PAGE BWB TABS ──
document.querySelectorAll('.bwb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.bwb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});
// Set today on bwb dates
const bwbDate   = document.getElementById('bwbDate');
const bwbReturn = document.getElementById('bwbReturn');
if (bwbDate) {
  const today = new Date().toISOString().split('T')[0];
  const next  = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  bwbDate.value   = today;
  bwbDate.min     = today;
  if (bwbReturn) { bwbReturn.value = next; bwbReturn.min = today; }
}

// ── PRICE CALCULATION ──
const RATES = {
  small:  { hourly: 12, daily: 35 },
  medium: { hourly: 20, daily: 75 },
  xl:     { hourly: 28, daily: 95 },
};
const HELPER_RATES = { '0': 0, '1': 30, '2': 55 };

function calcPrice() {
  const van      = document.getElementById('vanSize')?.value;
  const duration = document.getElementById('duration')?.value;
  const helpers  = document.getElementById('helpers')?.value || '0';
  const priceEl  = document.getElementById('estimatedPrice');
  const sumTotal = document.getElementById('sum-total');
  const sumVan   = document.getElementById('sum-van');
  const sumDur   = document.getElementById('sum-duration');
  const sumSvc   = document.getElementById('sum-service');

  const vanLabels = { small: 'Small Van (Berlingo)', medium: 'Medium Van (Sprinter)', xl: 'XL Van (Luton)' };
  const durLabels = { '2':'2 Hours','4':'4 Hours (Half Day)','8':'Full Day','24':'1 Day','48':'2 Days','72':'3 Days','custom':'Custom' };

  if (sumVan)  sumVan.textContent  = vanLabels[van]     || 'Not selected';
  if (sumDur)  sumDur.textContent  = durLabels[duration] || 'Not selected';
  if (sumSvc)  sumSvc.textContent  = activeService === 'man-van' ? 'Man & Van' : 'Van Hire';

  if (!priceEl) return;

  if (!van || !duration || duration === 'custom') {
    const dash = duration === 'custom' ? 'Call for quote' : '—';
    priceEl.textContent = dash;
    if (sumTotal) sumTotal.textContent = dash;
    return;
  }
  const hrs      = parseFloat(duration);
  const isDays   = hrs >= 24;
  const r        = RATES[van];
  const vanCost  = isDays ? r.daily * (hrs / 24) : r.hourly * hrs;
  const drCost   = activeService === 'man-van' ? 25 * hrs : 0;
  const hlpCost  = activeService === 'man-van' ? (HELPER_RATES[helpers] || 0) * hrs : 0;
  const total    = `£${Math.ceil(vanCost + drCost + hlpCost).toLocaleString()}`;
  priceEl.textContent = total;
  if (sumTotal) sumTotal.textContent = total;
}

['vanSize', 'duration', 'helpers'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', calcPrice);
});

// Set default date
const bd = document.getElementById('bookDate');
if (bd) { const t = new Date().toISOString().split('T')[0]; bd.min = t; bd.value = t; }

// ── FORM SUBMIT ──
const bookingForm    = document.getElementById('bookingForm');
const bookingConfirm = document.getElementById('bookingConfirm');
const newBookingBtn  = document.getElementById('newBookingBtn');

bookingForm?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = bookingForm.querySelector('.bk-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
  setTimeout(() => {
    bookingForm.style.display    = 'none';
    bookingConfirm.style.display = 'block';
    bookingConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1200);
});

newBookingBtn?.addEventListener('click', () => {
  bookingConfirm.style.display = 'none';
  bookingForm.style.display    = 'block';
  bookingForm.reset();
  if (document.getElementById('estimatedPrice')) document.getElementById('estimatedPrice').textContent = '—';
  if (helpersField) helpersField.style.display = 'none';
  activeService = 'van-hire';
  bkTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === 'van-hire'));
  const btn = bookingForm.querySelector('.bk-submit');
  if (btn) { btn.disabled = false; btn.textContent = 'Confirm Booking →'; }
  const t = new Date().toISOString().split('T')[0];
  if (document.getElementById('bookDate')) document.getElementById('bookDate').value = t;
});

// ── COOKIE BANNER ──
const cookieBanner = document.getElementById('cookieBanner');
if (cookieBanner) {
  if (localStorage.getItem('bv_cookies')) {
    cookieBanner.style.display = 'none';
  }
  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    localStorage.setItem('bv_cookies', '1');
    cookieBanner.style.animation = 'cookieSlide .4s reverse forwards';
    setTimeout(() => { cookieBanner.style.display = 'none'; }, 400);
  });
  document.getElementById('cookieManage')?.addEventListener('click', () => {
    cookieBanner.style.animation = 'cookieSlide .4s reverse forwards';
    setTimeout(() => { cookieBanner.style.display = 'none'; }, 400);
  });
}

// ── CHAT BUBBLE ──
document.getElementById('chatBubble')?.addEventListener('click', () => {
  window.location.href = 'tel:+441234567890';
});

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
