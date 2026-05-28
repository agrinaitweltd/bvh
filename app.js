/* ============================================================
   BREEZYEE VANS — App JS
   ============================================================ */
import { supabase, ADMIN_EMAIL } from './supabase.js';

let currentUser = null;
const authListener = supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  updateAuthNav(currentUser);
});

function isAdminUser(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function refreshAuthState() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;
  currentUser = user;
  updateAuthNav(user);
  if (user) {
    const custEmailEl = document.getElementById('custEmail');
    const custNameEl = document.getElementById('custName');
    if (custEmailEl) custEmailEl.value = user.email || '';
    if (custNameEl) custNameEl.value = user.user_metadata?.full_name || '';
  }
  return user;
}

function updateAuthNav(user) {
  document.querySelectorAll('.nav-auth-signed-out').forEach(el => {
    el.style.display = user ? 'none' : '';
  });
  document.querySelectorAll('.nav-auth-signed-in').forEach(el => {
    el.style.display = user ? '' : 'none';
  });
  document.querySelectorAll('.nav-user-name').forEach(el => {
    el.textContent = user ? user.email : '';
  });
}

async function signOut() {
  await supabase.auth.signOut();
  await refreshAuthState();
  const path = window.location.pathname;
  if (path.endsWith('dashboard.html') || path.includes('admin-')) {
    window.location.href = 'login.html';
  }
}

document.getElementById('signOutLink')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut();
});

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
  function toggleNav(e) {
    e.preventDefault();
    e.stopPropagation();
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  navToggle.addEventListener('click', toggleNav);
  navToggle.addEventListener('touchend', toggleNav, { passive: false });

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

bookingForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = bookingForm.querySelector('.bk-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  const van      = document.getElementById('vanSize')?.value;
  const pickup   = document.getElementById('pickup')?.value;
  const dropoff  = document.getElementById('dropoff')?.value;
  const bookDate = document.getElementById('bookDate')?.value;
  const bookTime = document.getElementById('bookTime')?.value;
  const duration = document.getElementById('duration')?.value;
  const helpers  = document.getElementById('helpers')?.value || '0';
  const name     = document.getElementById('custName')?.value;
  const email    = currentUser?.email || document.getElementById('custEmail')?.value;
  const phone    = document.getElementById('custPhone')?.value;
  const price    = document.getElementById('estimatedPrice')?.textContent || '—';
  const userId   = currentUser?.id || null;

  await new Promise(resolve => setTimeout(resolve, 800));

  if (supabase) {
    await supabase.from('bookings').insert([{
      user_id: userId,
      service: activeService,
      van_size: van,
      pickup,
      dropoff,
      date: bookDate,
      time: bookTime,
      duration,
      helpers,
      name,
      email,
      phone,
      price,
      status: 'Pending',
    }]);
  }

  bookingForm.style.display    = 'none';
  bookingConfirm.style.display = 'block';
  bookingConfirm.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
const COOKIE_BANNER_KEY = 'bv_cookies';
const cookieBanner = document.getElementById('cookieBanner');
if (cookieBanner) {
  if (localStorage.getItem(COOKIE_BANNER_KEY) === '1') {
    cookieBanner.classList.add('hide');
    cookieBanner.style.display = 'none';
  }

  function dismissCookie(accepted = false) {
    if (accepted) {
      localStorage.setItem(COOKIE_BANNER_KEY, '1');
    }
    cookieBanner.classList.add('hide');
    setTimeout(() => { cookieBanner.style.display = 'none'; }, 350);
  }

  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    dismissCookie(true);
  });
  document.getElementById('cookieManage')?.addEventListener('click', dismissCookie);
}

// ── CHAT BUBBLE ──
document.getElementById('chatBubble')?.addEventListener('click', () => {
  window.location.href = 'tel:+441234567890';
});

// ── SMOOTH SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const targetSel = a.getAttribute('href');
    // Ignore placeholder links like href="#" to avoid invalid selector errors.
    if (!targetSel || targetSel === '#') return;
    const t = document.querySelector(targetSel);
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

window.addEventListener('load', async () => {
  document.body.classList.add('is-ready');
  const user = await refreshAuthState();
  initLoginPage(user);
  initBookingPage(user);
  initDashboardPage(user);
});

function initLoginPage(user) {
  const loginPage = document.getElementById('loginPage');
  if (!loginPage) return;
  if (user) {
    document.getElementById('authStatus').textContent = 'Already signed in. Redirecting to your dashboard…';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    return;
  }

  const authForm = document.getElementById('authForm');
  const authToggle = document.getElementById('authToggle');
  const authHeading = document.getElementById('authHeading');
  const authModeHint = document.getElementById('authModeHint');
  const authSubmit = document.getElementById('authSubmit');
  const authStatus = document.getElementById('authStatus');
  const signupFields = loginPage.querySelectorAll('.signup-only');
  let authMode = 'signIn';

  function updateMode() {
    if (authMode === 'signIn') {
      authMode = 'signUp';
      authHeading.textContent = 'Create your account';
      authModeHint.textContent = 'Already registered?';
      authToggle.textContent = 'Sign in';
      authSubmit.textContent = 'Create account';
    } else {
      authMode = 'signIn';
      authHeading.textContent = 'Sign in to your account';
      authModeHint.textContent = 'New here?';
      authToggle.textContent = 'Create an account';
      authSubmit.textContent = 'Sign in';
    }
    signupFields.forEach(field => {
      field.style.display = authMode === 'signUp' ? 'block' : 'none';
    });
    authStatus.textContent = 'Enter your email and password to continue.';
  }

  authToggle.addEventListener('click', updateMode);
  signupFields.forEach(field => { field.style.display = 'none'; });
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value.trim();
    if (!email || !password) return;

    authSubmit.disabled = true;
    authStatus.textContent = authMode === 'signIn' ? 'Signing in…' : 'Creating account…';

    let result;
    const fullName = document.getElementById('authFullName')?.value.trim();
    const dob = document.getElementById('authDob')?.value;
    const phone = document.getElementById('authPhone')?.value.trim();
    const postcode = document.getElementById('authPostcode')?.value.trim();

    if (authMode === 'signUp' && (!fullName || !dob || !phone || !postcode)) {
      authStatus.textContent = 'Please complete all required signup fields.';
      authSubmit.disabled = false;
      return;
    }

    const authEmail = email.toLowerCase() === 'admin' ? ADMIN_EMAIL : email;

    if (authMode === 'signIn') {
      result = await supabase.auth.signInWithPassword({ email: authEmail, password });
    } else {
      result = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            postcode,
            dob,
          },
        },
      });
    }

    authSubmit.disabled = false;
    if (result.error) {
      authStatus.textContent = result.error.message;
      return;
    }

    if (authMode === 'signIn') {
      window.location.href = 'dashboard.html';
    } else if (result.data?.session) {
      window.location.href = 'dashboard.html';
    } else {
      authStatus.textContent = 'Account created. Please sign in to continue.';
    }
  });
}

function initBookingPage(user) {
  const bookingFormExists = document.getElementById('bookingForm');
  if (!bookingFormExists) return;
  if (!user) return;

  const custEmailEl = document.getElementById('custEmail');
  const custNameEl = document.getElementById('custName');
  if (custEmailEl) {
    custEmailEl.value = user.email || '';
  }
  if (custNameEl) {
    custNameEl.value = user.user_metadata?.full_name || '';
  }
}

async function initDashboardPage(user) {
  const dashboardPage = document.getElementById('dashboardPage');
  if (!dashboardPage) return;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const isAdmin = isAdminUser(user);
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  const displayName = user.user_metadata?.full_name || user.email || 'Admin';
  const firstName = displayName.split('@')[0].split(' ')[0] || 'Admin';
  const escapeHTML = value => String(value ?? '--')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) greetingEl.textContent = `Welcome Back, ${firstName}`;

  const avatarEl = document.getElementById('headerAvatar');
  if (avatarEl) avatarEl.textContent = firstName.charAt(0).toUpperCase();

  const { data: bookings, error } = isAdmin
    ? await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    : await supabase.from('bookings').select('*').or(`user_id.eq.${user.id},email.eq.${user.email}`).order('created_at', { ascending: false });

  const tableBody = document.getElementById('bookingsTableBody');
  if (error || !Array.isArray(bookings)) {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" class="txt-dim">Unable to load booking data. Please check your Supabase setup.</td></tr>';
    return;
  }

  const bookingRows = bookings.slice(0, 10).map(booking => {
    const status = booking.status || 'Pending';
    const loweredStatus = status.toLowerCase();
    const statusClass = loweredStatus.includes('cancel')
      ? 'cancelled'
      : loweredStatus.includes('pending')
        ? 'pending'
        : 'successful';
    return `<tr><td>${escapeHTML(booking.service)}</td><td>${escapeHTML(booking.date)}</td><td>${escapeHTML(booking.van_size)}</td><td><span class="admin-status ${statusClass}">${escapeHTML(status)}</span></td><td>${escapeHTML(booking.price || 'GBP 0')}</td></tr>`;
  }).join('');

  if (tableBody) {
    tableBody.innerHTML = bookings.length === 0
      ? '<tr><td colspan="5" class="txt-dim">No bookings found yet.</td></tr>'
      : bookingRows;
  }

  const bookingsCountEl = document.getElementById('dashboardBookingsCount');
  if (bookingsCountEl) bookingsCountEl.textContent = bookings.length;
  const now = new Date();
  const upcomingCountEl = document.getElementById('dashboardUpcomingCount');
  if (upcomingCountEl) upcomingCountEl.textContent = bookings.filter(b => b.date && new Date(b.date) >= now).length;

  const uniqueUsers = new Set(bookings.filter(b => b.email).map(b => b.email));
  const usersCountEl = document.getElementById('dashboardUsersCount');
  if (usersCountEl) usersCountEl.textContent = uniqueUsers.size;

  const weeklyCountEl = document.getElementById('dashboardWeeklyCount');
  if (weeklyCountEl) {
    weeklyCountEl.textContent = bookings.filter(b => {
      const created = b.created_at ? new Date(b.created_at) : null;
      return created && (Date.now() - created.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    }).length;
  }

  const totalRevenue = bookings.reduce((sum, booking) => {
    const price = typeof booking.price === 'string'
      ? Number(booking.price.replace(/[^\d.]/g, ''))
      : Number(booking.price || 0);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);
  const revenueEl = document.getElementById('dashboardRevenue');
  if (revenueEl) revenueEl.textContent = `GBP ${totalRevenue.toLocaleString()}`;

  const balanceEl = document.getElementById('dashboardBalance');
  if (balanceEl) balanceEl.textContent = `GBP ${totalRevenue.toLocaleString()}`;

  const creditEl = document.getElementById('dashboardCreditAmount');
  if (creditEl) creditEl.textContent = `GBP ${Math.round(totalRevenue * 0.27).toLocaleString()}`;

  const pendingEl = document.getElementById('dashboardPendingCount');
  if (pendingEl) pendingEl.textContent = bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;

  const customersEl = document.getElementById('dashboardCustomersCount');
  if (customersEl) customersEl.textContent = uniqueUsers.size;
}
