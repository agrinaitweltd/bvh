/* ============================================================
   BREEZYEE VANS — App JS
   ============================================================ */
import { supabase, ADMIN_EMAIL } from './supabase.js';

let currentUser = null;
let bookingsRealtimeChannel = null;
const ADMIN_OWNER_NAME = 'Mr Olushola Fadipe';
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
  if (path.endsWith('dashboard.html') || path.endsWith('user-dashboard.html') || path.includes('admin-')) {
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
  small:  { hourly: 12.5, daily: 100 },
  medium: { hourly: 25, daily: 200 },
  xl:     { hourly: 43.75, daily: 350 },
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

  const vanLabels = { small: 'Small / Medium Van (Citroen Berlingo)', medium: 'Medium / Large Van (Mercedes Sprinter)', xl: 'Large / XL Van (Iveco Daily Luton)' };
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
    setTimeout(() => {
      window.location.href = isAdminUser(user) ? 'dashboard.html' : 'user-dashboard.html';
    }, 900);
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
      const signedInUser = result.data?.user;
      window.location.href = isAdminUser(signedInUser) ? 'dashboard.html' : 'user-dashboard.html';
    } else if (result.data?.session) {
      const signedInUser = result.data?.user;
      window.location.href = isAdminUser(signedInUser) ? 'dashboard.html' : 'user-dashboard.html';
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
  const isUserDashboard = dashboardPage.classList.contains('user-dashboard-page');
  const isAdminDashboard = dashboardPage.classList.contains('admin-console-page');
  const isInvoicePage = dashboardPage.classList.contains('admin-invoices-page');
  if (isAdminDashboard && !isAdmin && window.location.pathname.endsWith('dashboard.html')) {
    window.location.href = 'user-dashboard.html';
    return;
  }
  if (isUserDashboard && isAdmin) {
    window.location.href = 'dashboard.html';
    return;
  }
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  const customerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
  const displayName = isUserDashboard ? customerName : ADMIN_OWNER_NAME;
  const escapeHTML = value => String(value ?? '--')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const greetingEl = document.getElementById('dashboardGreeting');
  if (greetingEl) {
    greetingEl.textContent = isUserDashboard
      ? `Welcome back, ${customerName}`
      : `Welcome back, ${displayName}`;
  }

  const avatarEl = document.getElementById('headerAvatar');
  if (avatarEl) {
    avatarEl.textContent = isUserDashboard
      ? customerName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
      : 'OF';
  }

  document.querySelectorAll('.admin-owner-name').forEach(el => {
    el.textContent = displayName;
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const formatMoney = value => `GBP ${Math.round(value).toLocaleString()}`;
  const parseMoney = value => {
    if (typeof value === 'number') return value;
    const parsed = Number(String(value || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const { data: bookings, error } = isAdmin
    ? await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    : await supabase.from('bookings').select('*').or(`user_id.eq.${user.id},email.eq.${user.email}`).order('created_at', { ascending: false });

  const tableBody = document.getElementById('bookingsTableBody');
  if (error || !Array.isArray(bookings)) {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" class="txt-dim">Unable to load booking data. Please check your Supabase setup.</td></tr>';
    setText('dashboardSyncStatus', 'Supabase connection issue');
    return;
  }

  const invoiceRows = bookings.slice(0, 10).map((booking, index) => {
    const customer = booking.name || booking.email || 'Customer';
    return `<tr><td>${escapeHTML(customer)}</td><td>${escapeHTML(booking.email)}</td><td>${escapeHTML(booking.service)}</td><td>${escapeHTML(booking.price || 'GBP 0')}</td><td><button class="admin-email-action" type="button" data-email-action="invoice" data-booking-index="${index}">Invoice</button><button class="admin-email-action ghost" type="button" data-email-action="reminder" data-booking-index="${index}">Reminder</button></td></tr>`;
  }).join('');

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
      : isInvoicePage ? invoiceRows : bookingRows;
  }

  setText('dashboardBookingsCount', bookings.length);
  const now = new Date();
  const upcomingBookings = bookings.filter(b => b.date && new Date(b.date) >= now);
  setText('dashboardUpcomingCount', upcomingBookings.length);

  const uniqueUsers = new Set(bookings.filter(b => b.email).map(b => b.email));
  setText('dashboardUsersCount', uniqueUsers.size);

  const weeklyCountEl = document.getElementById('dashboardWeeklyCount');
  const weeklyBookings = bookings.filter(b => {
    const created = b.created_at ? new Date(b.created_at) : null;
    return created && (Date.now() - created.getTime()) <= 7 * 24 * 60 * 60 * 1000;
  });
  if (weeklyCountEl) weeklyCountEl.textContent = weeklyBookings.length;

  const totalRevenue = bookings.reduce((sum, booking) => sum + parseMoney(booking.price), 0);
  const pendingBookings = bookings.filter(b => (b.status || '').toLowerCase() === 'pending');
  const completedBookings = bookings.filter(b => {
    const status = (b.status || '').toLowerCase();
    return status.includes('success') || status.includes('complete') || status.includes('confirm');
  });
  const todayISO = now.toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === todayISO);
  const overdueBookings = pendingBookings.filter(b => {
    const created = b.created_at ? new Date(b.created_at) : null;
    return created && (Date.now() - created.getTime()) > 3 * 24 * 60 * 60 * 1000;
  });
  const currentMonthRevenue = bookings.reduce((sum, booking) => {
    const created = booking.created_at ? new Date(booking.created_at) : null;
    if (!created || created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return sum;
    return sum + parseMoney(booking.price);
  }, 0);
  const revenueGoal = Math.max(25000, totalRevenue * 1.25);
  const monthlyProgress = Math.min(100, Math.round((currentMonthRevenue / revenueGoal) * 100)) || 0;
  const fleetUtilisation = bookings.length ? Math.min(96, Math.round((upcomingBookings.length / Math.max(bookings.length, 1)) * 100) + 28) : 0;
  const followUpRate = bookings.length ? Math.round((pendingBookings.length / bookings.length) * 100) : 0;

  setText('dashboardRevenue', formatMoney(totalRevenue));
  setText('dashboardBalance', formatMoney(totalRevenue));
  setText('dashboardCreditAmount', formatMoney(totalRevenue * 0.27));
  setText('dashboardPendingCount', pendingBookings.length);
  setText('dashboardCustomersCount', uniqueUsers.size);
  setText('dashboardCompletedCount', completedBookings.length);
  setText('dashboardMonthlyRevenue', formatMoney(currentMonthRevenue));
  setText('dashboardTodayCount', todayBookings.length);
  setText('dashboardOverdueCount', overdueBookings.length);
  setText('dashboardAverageBooking', formatMoney(bookings.length ? totalRevenue / bookings.length : 0));
  setText('dashboardConversionRate', `${bookings.length ? Math.round((completedBookings.length / bookings.length) * 100) : 0}%`);
  setText('dashboardRevenueGoal', `${monthlyProgress}%`);
  setText('dashboardFleetUtilisation', `${fleetUtilisation}%`);
  setText('dashboardFollowUps', `${followUpRate}%`);
  setText('dashboardSyncStatus', 'Synced with Supabase');
  setText('dashboardLastSync', `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

  const nextBooking = upcomingBookings
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  setText('userNextService', nextBooking?.service || 'No upcoming booking');
  setText('userNextDate', nextBooking?.date || 'Book your next move when ready');
  setText('userNextVan', nextBooking?.van_size || 'Van size pending');
  setText('userTotalSpend', formatMoney(totalRevenue));
  setText('userEmail', user.email || '--');
  setText('userEmailSidebar', user.email || '--');
  setText('userPhone', user.user_metadata?.phone || 'Not added');
  setText('userPostcode', user.user_metadata?.postcode || 'Not added');

  const composeAdminEmail = (booking, type = 'invoice') => {
    const customer = booking?.name || 'Customer';
    const service = booking?.service || 'your Breezyee Vans booking';
    const amount = document.getElementById('invoiceAmount')?.value || booking?.price || 'GBP 0';
    const dueDate = document.getElementById('invoiceDueDate')?.value || 'as soon as possible';
    const customMessage = document.getElementById('invoiceMessage')?.value.trim();
    const subjects = {
      invoice: `Invoice for your Breezyee Vans booking`,
      reminder: `Payment reminder for your Breezyee Vans booking`,
      confirmation: `Booking confirmation from Breezyee Vans`,
    };
    const intros = {
      invoice: `Please find the invoice details for your Breezyee Vans booking below.`,
      reminder: `This is a friendly reminder that payment is due for your Breezyee Vans booking.`,
      confirmation: `Your Breezyee Vans booking details are below.`,
    };
    const body = [
      `Hello ${customer},`,
      '',
      customMessage || intros[type] || intros.invoice,
      '',
      `Service: ${service}`,
      `Van: ${booking?.van_size || 'To be confirmed'}`,
      `Booking date: ${booking?.date || 'To be confirmed'}`,
      `Time: ${booking?.time || 'To be confirmed'}`,
      `Pickup: ${booking?.pickup || 'To be confirmed'}`,
      `Drop-off: ${booking?.dropoff || 'To be confirmed'}`,
      `Amount: ${amount}`,
      `Due date: ${dueDate}`,
      '',
      `Kind regards,`,
      ADMIN_OWNER_NAME,
      `Breezyee Vans`,
    ].join('\n');
    return { subject: subjects[type] || subjects.invoice, body, amount, dueDate };
  };

  const logAdminEmail = async (booking, type, email) => {
    await supabase.from('admin_messages').insert([{
      booking_id: booking?.id || null,
      recipient_email: booking?.email || null,
      message_type: type,
      subject: email.subject,
      body: email.body,
      amount: email.amount,
      due_date: email.dueDate,
      created_by: user.email,
    }]);
  };

  const openAdminEmail = async (booking, type = 'invoice') => {
    if (!booking?.email) {
      setText('invoiceEmailStatus', 'This booking has no customer email');
      return;
    }
    const email = composeAdminEmail(booking, type);
    setText('invoiceEmailStatus', `Opening ${type} email for ${booking.email}`);
    const preview = document.getElementById('invoiceEmailPreview');
    if (preview) preview.textContent = `Subject: ${email.subject}\n\n${email.body}`;
    try {
      await logAdminEmail(booking, type, email);
    } catch (_error) {
      setText('invoiceEmailStatus', 'Email opened. Add admin_messages table to log sends.');
    }
    window.location.href = `mailto:${encodeURIComponent(booking.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  };

  if (isInvoicePage) {
    const bookingSelect = document.getElementById('invoiceBookingSelect');
    const amountInput = document.getElementById('invoiceAmount');
    const dueInput = document.getElementById('invoiceDueDate');
    const typeSelect = document.getElementById('invoiceEmailType');
    const preview = document.getElementById('invoiceEmailPreview');
    const form = document.getElementById('invoiceEmailForm');
    const previewButton = document.getElementById('previewInvoiceEmail');
    const selectableBookings = bookings.filter(booking => booking.email);
    if (bookingSelect) {
      bookingSelect.innerHTML = selectableBookings.length
        ? selectableBookings.map((booking, index) => `<option value="${index}">${escapeHTML(booking.name || booking.email)} - ${escapeHTML(booking.service || 'Booking')} - ${escapeHTML(booking.price || 'GBP 0')}</option>`).join('')
        : '<option value="">No bookings with customer emails</option>';
    }
    const selectedBooking = () => selectableBookings[Number(bookingSelect?.value || 0)];
    const syncInvoiceForm = () => {
      const booking = selectedBooking();
      if (amountInput) amountInput.value = booking?.price || '';
      if (dueInput && !dueInput.value) dueInput.value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const email = composeAdminEmail(booking, typeSelect?.value || 'invoice');
      if (preview) preview.textContent = booking ? `Subject: ${email.subject}\n\n${email.body}` : 'Select a booking with an email address.';
    };
    bookingSelect?.addEventListener('change', syncInvoiceForm);
    typeSelect?.addEventListener('change', syncInvoiceForm);
    amountInput?.addEventListener('input', syncInvoiceForm);
    dueInput?.addEventListener('change', syncInvoiceForm);
    document.getElementById('invoiceMessage')?.addEventListener('input', syncInvoiceForm);
    previewButton?.addEventListener('click', syncInvoiceForm);
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      await openAdminEmail(selectedBooking(), typeSelect?.value || 'invoice');
    });
    document.querySelectorAll('[data-email-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const booking = bookings[Number(button.dataset.bookingIndex)];
        await openAdminEmail(booking, button.dataset.emailAction);
      });
    });
    syncInvoiceForm();
  }

  const revenueGoalBar = document.getElementById('dashboardRevenueGoalBar');
  if (revenueGoalBar) revenueGoalBar.style.width = `${monthlyProgress}%`;
  const fleetBar = document.getElementById('dashboardFleetUtilisationBar');
  if (fleetBar) fleetBar.style.width = `${fleetUtilisation}%`;
  const followUpsBar = document.getElementById('dashboardFollowUpsBar');
  if (followUpsBar) followUpsBar.style.width = `${followUpRate}%`;

  const monthlyTotals = Array.from({ length: 12 }, () => 0);
  bookings.forEach(booking => {
    const created = booking.created_at ? new Date(booking.created_at) : booking.date ? new Date(booking.date) : null;
    if (!created || created.getFullYear() !== now.getFullYear()) return;
    monthlyTotals[created.getMonth()] += parseMoney(booking.price) || 1;
  });
  const maxMonth = Math.max(...monthlyTotals, 1);
  document.querySelectorAll('[data-month-bar]').forEach((bar, index) => {
    const height = Math.max(14, Math.round((monthlyTotals[index] / maxMonth) * 100));
    bar.style.height = `${height}%`;
    bar.classList.toggle('active', index === now.getMonth());
  });

  if (!bookingsRealtimeChannel) {
    bookingsRealtimeChannel = supabase
      .channel('admin-bookings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        initDashboardPage(user);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setText('dashboardSyncStatus', 'Live Supabase sync on');
      });
  }
}
