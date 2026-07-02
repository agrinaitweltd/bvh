/* ============================================================
   BREEZYEE VANS — App JS
   ============================================================ */
import { supabase, ADMIN_EMAIL } from './supabase.js';

let currentUser = null;
let bookingsRealtimeChannel = null;
const ADMIN_OWNER_NAME = 'Mr Olushola Fadipe';
const authListener = supabase ? supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  updateAuthNav(currentUser);
}) : null;

function isAdminUser(user) {
  return user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function refreshAuthState() {
  if (!supabase) {
    updateAuthNav(null);
    return null;
  }
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

async function markBookingAsPaid(bookingId) {
  if (!confirm('Are you sure you want to mark this booking as paid?')) return;

  try {
    if (supabase) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Paid' })
        .eq('id', bookingId);

      if (error) throw error;
    }

    // Refresh the dashboard to show updated data
    const user = await refreshAuthState();
    initDashboardPage(user);

    alert('Booking marked as paid successfully!');
  } catch (error) {
    console.error('Error marking booking as paid:', error);
    alert('Failed to mark booking as paid. Please try again.');
  }
}

async function deleteBooking(bookingId) {
  if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;

  try {
    if (supabase) {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
    }

    // Refresh the dashboard to show updated data
    const user = await refreshAuthState();
    initDashboardPage(user);

    alert('Booking deleted successfully!');
  } catch (error) {
    console.error('Error deleting booking:', error);
    alert('Failed to delete booking. Please try again.');
  }
}

async function deleteCustomer(customerEmail) {
  if (!confirm(`Are you sure you want to delete all bookings and data for customer ${customerEmail}? This action cannot be undone.`)) return;

  try {
    if (supabase) {
      // Delete all bookings for this customer
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .eq('email', customerEmail);

      if (bookingError) throw bookingError;

      // Note: We don't delete the auth user as that would prevent them from logging in
      // If you want to delete the auth user, you would need additional server-side logic
    }

    // Refresh the dashboard to show updated data
    const user = await refreshAuthState();
    initDashboardPage(user);

    alert(`All data for customer ${customerEmail} has been deleted successfully!`);
  } catch (error) {
    console.error('Error deleting customer:', error);
    alert('Failed to delete customer data. Please try again.');
  }
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
  if (supabase) await supabase.auth.signOut();
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
      const siblings = [...(el.parentElement?.querySelectorAll('.reveal:not(.visible)') || [])];
      const idx = siblings.indexOf(el);
      el.style.transitionDelay = `${idx * 80}ms`;
      el.classList.add('visible');
    }
  });
}

function setupRevealElements(root = document) {
  const elements = root.querySelectorAll('.reveal');
  elements.forEach(el => {
    if (el.dataset.revealBound === 'true' || el.classList.contains('visible')) return;
    el.dataset.revealBound = 'true';
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 20) {
      const siblings = [...(el.parentElement?.querySelectorAll('.reveal:not(.visible)') || [])];
      const idx = siblings.indexOf(el);
      el.style.transitionDelay = `${idx * 80}ms`;
      el.classList.add('visible');
    } else {
      revealObserver.observe(el);
    }
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const siblings = [...(entry.target.parentElement?.querySelectorAll('.reveal:not(.visible)') || [])];
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 80}ms`;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
setupRevealElements(document);

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

// ── CAR MANAGEMENT FUNCTIONS ──
let carsData = [];
let carsRealtimeChannel = null;

// Fallback fleet data in case Supabase isn't configured yet
const FALLBACK_CARS = [
  {
    id: 'fallback-1',
    model: 'Citroen Berlingo',
    type: 'small',
    price_daily: 100,
    capacity: '2–3 m³',
    payload: 750,
    description: 'Best for light moves and deliveries. Compact, nimble, and easy to park in the city.',
    image_url: '/van-small.jpg',
    is_active: true
  },
  {
    id: 'fallback-2',
    model: 'Mercedes Sprinter',
    type: 'medium',
    price_daily: 200,
    capacity: '10–12 m³',
    payload: 1500,
    description: 'Ideal for house moves and business relocations. Spacious, powerful, and built to perform.',
    image_url: '/van-medium.jpg',
    is_active: true
  },
  {
    id: 'fallback-3',
    model: 'Iveco Daily Luton',
    type: 'xl',
    price_daily: 350,
    capacity: '18–20 m³',
    payload: 2000,
    description: 'Maximum capacity for the biggest jobs. Full house moves, large furniture, zero compromises.',
    image_url: '/van-large.jpg',
    is_active: true
  }
];

async function loadCarsFromSupabase() {
  // Check if Supabase is configured
  if (!supabase) {
    console.log('Supabase not configured, using fallback fleet data');
    carsData = FALLBACK_CARS;
    return FALLBACK_CARS;
  }

  try {
    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading cars from Supabase:', error);
      console.log('Using fallback fleet data instead');
      carsData = FALLBACK_CARS;
      return FALLBACK_CARS;
    }
    
    if (!cars || cars.length === 0) {
      console.log('No cars found in Supabase, using fallback data');
      carsData = FALLBACK_CARS;
      return FALLBACK_CARS;
    }
    
    carsData = cars;
    console.log(`Loaded ${cars.length} cars from Supabase`);
    return cars;
  } catch (error) {
    console.error('Failed to load cars from Supabase:', error);
    console.log('Using fallback fleet data instead');
    carsData = FALLBACK_CARS;
    return FALLBACK_CARS;
  }
}

async function initCarsPage(user) {
  const carsPage = document.body.dataset.page === 'cars';
  if (!carsPage) return;
  if (!user || !isAdminUser(user)) {
    window.location.href = 'login.html';
    return;
  }

  const cars = await loadCarsFromSupabase();
  renderAdminCarsTable(cars);
  renderAdminCarsPreview(cars);
  updateCarsStats(cars);

  // Only set up realtime subscription if we successfully loaded from Supabase and supabase is available
  const usingFallback = cars === FALLBACK_CARS;
  if (!usingFallback && !carsRealtimeChannel && supabase) {
    carsRealtimeChannel = supabase
      .channel('cars-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars' }, () => {
        loadCarsFromSupabase().then(cars => {
          renderAdminCarsTable(cars);
          renderAdminCarsPreview(cars);
          updateCarsStats(cars);
        });
      })
      .subscribe();
  }

  // Make functions globally accessible
  window.saveCarToSupabase = async function(carData) {
    if (!supabase) {
      console.log('Supabase not configured, adding car locally only');
      alert('Note: Supabase is not configured. The car will be added locally for this session only.');
      const newCar = { ...carData, id: `fallback-${Date.now()}` };
      FALLBACK_CARS.push(newCar);
      carsData = [...FALLBACK_CARS];
      renderAdminCarsTable(carsData);
      renderAdminCarsPreview(carsData);
      updateCarsStats(carsData);
      return newCar;
    }

    try {
      const { data, error } = await supabase
        .from('cars')
        .insert([carData])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error saving car to Supabase:', error);
      alert('Note: Could not save to Supabase. The car will be added locally for this session only. Please set up Supabase to enable persistent storage.');
      // Add to fallback data temporarily
      const newCar = { ...carData, id: `fallback-${Date.now()}` };
      FALLBACK_CARS.push(newCar);
      carsData = [...FALLBACK_CARS];
      renderAdminCarsTable(carsData);
      renderAdminCarsPreview(carsData);
      updateCarsStats(carsData);
      return newCar;
    }
  };

  window.updateCarInSupabase = async function(id, carData) {
    if (!supabase) {
      console.log('Supabase not configured, updating car locally only');
      alert('Note: Supabase is not configured. Changes will be local only.');
      const index = FALLBACK_CARS.findIndex(c => c.id === id);
      if (index !== -1) {
        FALLBACK_CARS[index] = { ...FALLBACK_CARS[index], ...carData };
        carsData = [...FALLBACK_CARS];
        renderAdminCarsTable(carsData);
        renderAdminCarsPreview(carsData);
        updateCarsStats(carsData);
      }
      return carData;
    }

    try {
      const { data, error } = await supabase
        .from('cars')
        .update(carData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating car in Supabase:', error);
      alert('Note: Could not update in Supabase. Changes will be local only. Please set up Supabase to enable persistent storage.');
      // Update fallback data temporarily
      const index = FALLBACK_CARS.findIndex(c => c.id === id);
      if (index !== -1) {
        FALLBACK_CARS[index] = { ...FALLBACK_CARS[index], ...carData };
        carsData = [...FALLBACK_CARS];
        renderAdminCarsTable(carsData);
        renderAdminCarsPreview(carsData);
        updateCarsStats(carsData);
      }
      return carData;
    }
  };

  window.deleteCarFromSupabase = async function(id) {
    if (!supabase) {
      console.log('Supabase not configured, deleting car locally only');
      alert('Note: Supabase is not configured. Removal will be local only.');
      const index = FALLBACK_CARS.findIndex(c => c.id === id);
      if (index !== -1) {
        FALLBACK_CARS.splice(index, 1);
        carsData = [...FALLBACK_CARS];
        renderAdminCarsTable(carsData);
        renderAdminCarsPreview(carsData);
        updateCarsStats(carsData);
      }
      return true;
    }

    try {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting car from Supabase:', error);
      alert('Note: Could not delete from Supabase. Removal will be local only. Please set up Supabase to enable persistent storage.');
      // Remove from fallback data temporarily
      const index = FALLBACK_CARS.findIndex(c => c.id === id);
      if (index !== -1) {
        FALLBACK_CARS.splice(index, 1);
        carsData = [...FALLBACK_CARS];
        renderAdminCarsTable(carsData);
        renderAdminCarsPreview(carsData);
        updateCarsStats(carsData);
      }
      return true;
    }
  };
}

function renderAdminCarsTable(cars) {
  const tableBody = document.getElementById('carsTableBody');
  if (!tableBody) return;

  if (!cars || cars.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="txt-dim">No cars in fleet yet.</td></tr>';
    return;
  }

  const typeLabels = {
    small: 'Small / Medium',
    medium: 'Medium / Large',
    xl: 'Large / XL'
  };

  const typeBadgeClasses = {
    small: 'car-badge-small',
    medium: 'car-badge-medium',
    xl: 'car-badge-xl'
  };

  const gradientColors = {
    small: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    medium: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    xl: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  };

  const vanEmojis = {
    small: '🚐',
    medium: '🚛',
    xl: '🚚'
  };

  tableBody.innerHTML = cars.map(car => `
    <tr>
      <td>
        <div class="car-thumb" style="background: ${car.image_url ? `url(${car.image_url})` : gradientColors[car.type]}; background-size: cover; background-position: center;">
          ${!car.image_url ? `<span>${vanEmojis[car.type] || '🚐'}</span>` : ''}
        </div>
      </td>
      <td><strong>${car.model}</strong></td>
      <td><span class="car-badge ${typeBadgeClasses[car.type]}">${typeLabels[car.type]}</span></td>
      <td><strong>£${car.price_daily}</strong>/day</td>
      <td>${car.capacity} • ${car.payload} kg</td>
      <td><span class="status-badge ${car.is_active ? 'status-active' : 'status-inactive'}">${car.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="admin-btn-icon edit-car-btn" data-id="${car.id}" title="Edit car">✏️</button>
        <button class="admin-btn-icon delete-car-btn" data-id="${car.id}" title="Delete car">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Add event listeners for edit and delete buttons
  tableBody.querySelectorAll('.edit-car-btn').forEach(btn => {
    btn.addEventListener('click', () => editCar(btn.dataset.id));
  });

  tableBody.querySelectorAll('.delete-car-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCar(btn.dataset.id));
  });
}

function renderAdminCarsPreview(cars) {
  const previewGrid = document.querySelector('.admin-cars-preview-grid');
  if (!previewGrid) return;

  if (!cars || cars.length === 0) {
    previewGrid.innerHTML = '<p class="txt-dim">No cars to preview.</p>';
    return;
  }

  const typeLabels = {
    small: 'Small / Medium Van',
    medium: 'Medium / Large Van',
    xl: 'Large / XL Van'
  };

  const gradientColors = {
    small: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    medium: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    xl: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  };

  const vanEmojis = {
    small: '🚐',
    medium: '🚛',
    xl: '🚚'
  };

  previewGrid.innerHTML = cars.map(car => `
    <div class="car-preview-card">
      <div class="car-preview-img" style="background: ${car.image_url ? `url(${car.image_url})` : gradientColors[car.type]}; background-size: cover; background-position: center;">
        ${!car.image_url ? `<span style="font-size: 3rem;">${vanEmojis[car.type] || '🚐'}</span>` : ''}
      </div>
      <div class="car-preview-info">
        <h4>${car.model}</h4>
        <p class="car-type">${typeLabels[car.type]}</p>
        <div class="car-specs">
          <span>${car.capacity}</span>
          <span>•</span>
          <span>${car.payload} kg</span>
        </div>
        <div class="car-preview-price">
          <strong>£${car.price_daily}</strong><span>/day</span>
        </div>
      </div>
    </div>
  `).join('');
}

function updateCarsStats(cars) {
  if (!cars || cars.length === 0) {
    document.getElementById('totalCarsCount').textContent = '0';
    document.getElementById('avgPriceRate').textContent = '£0';
    document.getElementById('totalCapacity').textContent = '0 m³';
    document.getElementById('fleetUtil').textContent = '0%';
    return;
  }

  const totalCars = cars.length;
  const avgPrice = cars.reduce((sum, car) => sum + Number(car.price_daily), 0) / totalCars;
  const activeCars = cars.filter(car => car.is_active).length;
  
  // Parse capacity ranges (e.g., "10–12 m³" -> average of 11)
  const capacities = cars.map(car => {
    const match = car.capacity.match(/(\d+)(?:–(\d+))?\s*m³/);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : min;
      return (min + max) / 2;
    }
    return 0;
  });
  const totalCapacity = capacities.reduce((sum, cap) => sum + cap, 0);

  document.getElementById('totalCarsCount').textContent = totalCars;
  document.getElementById('avgPriceRate').textContent = `£${Math.round(avgPrice)}`;
  document.getElementById('totalCapacity').textContent = `${Math.round(totalCapacity)}–${Math.round(totalCapacity * 1.2)} m³`;
  document.getElementById('fleetUtil').textContent = activeCars > 0 ? '87%' : '0%';
}

async function editCar(id) {
  const car = carsData.find(c => c.id === id);
  if (!car) return;

  document.getElementById('modalTitle').textContent = 'Edit Car';
  document.getElementById('carModel').value = car.model;
  document.getElementById('carType').value = car.type;
  document.getElementById('carPrice').value = car.price_daily;
  document.getElementById('carCapacity').value = car.capacity;
  document.getElementById('carPayload').value = car.payload;
  document.getElementById('carDesc').value = car.description || '';
  document.getElementById('carActive').checked = car.is_active;
  
  // Handle image preview
  if (car.image_url) {
    const previewImg = document.getElementById('previewImg');
    const imagePreview = document.getElementById('imagePreview');
    previewImg.src = car.image_url;
    imagePreview.style.display = 'block';
  }

  document.getElementById('carModal').style.display = 'flex';
  
  // Store the car ID for updating
  document.getElementById('carForm').dataset.editId = id;
}

async function deleteCar(id) {
  if (!confirm('Are you sure you want to delete this car?')) return;

  try {
    await window.deleteCarFromSupabase(id);
    alert('Car deleted successfully!');
  } catch (error) {
    alert('Error deleting car: ' + error.message);
  }
}

async function loadCarsForFleetPage() {
  console.log('loadCarsForFleetPage called');
  const fleetGrid = document.querySelector('.van-cards-grid');
  const specsGrid = document.querySelector('.specs-comparison');

  if (fleetGrid) {
    renderFleetCards(FALLBACK_CARS, fleetGrid);
  }

  if (specsGrid) {
    renderSpecsCards(FALLBACK_CARS, specsGrid);
  }

  try {
    const cars = await loadCarsFromSupabase();
    console.log('Cars loaded:', cars);

    if (fleetGrid) {
      console.log('Rendering fleet cards...');
      renderFleetCards(cars, fleetGrid);
    }

    if (specsGrid) {
      console.log('Rendering specs cards...');
      renderSpecsCards(cars, specsGrid);
    }

    if (cars === FALLBACK_CARS) {
      console.log('Fleet page: Using fallback data (Supabase not configured)');
    } else {
      console.log('Fleet page: Using live Supabase data');
    }
  } catch (error) {
    console.error('Error in loadCarsForFleetPage:', error);
    if (fleetGrid) {
      renderFleetCards(FALLBACK_CARS, fleetGrid);
    }
  }
}

function renderFleetCards(cars, container) {
  console.log('renderFleetCards called with', cars?.length, 'cars');
  if (!cars || cars.length === 0) {
    container.innerHTML = '<p class="txt-dim">No fleet available at the moment.</p>';
    return;
  }

  const typeBadgeClasses = {
    small: '',
    medium: 'van-badge-purple',
    xl: ''
  };

  const badgeLabels = {
    small: 'Small / Medium Van',
    medium: 'Best Seller',
    xl: 'Large / XL Van'
  };

  const descriptions = {
    small: 'Best for light moves and deliveries. Compact, nimble, and easy to park in the city.',
    medium: 'Ideal for house moves and business relocations. Spacious, powerful, and built to perform.',
    xl: 'Maximum capacity for the biggest jobs. Full house moves, large furniture, zero compromises.'
  };

  const fallbackIcons = {
    small: '🚐',
    medium: '🚛',
    xl: '🚚'
  };

  container.innerHTML = cars.map(car => `
    <div class="van-card reveal ${car.type === 'medium' ? 'van-featured' : ''}">
      <div class="van-card-image van-card-image-loading">
        <div class="van-card-image-fallback">${fallbackIcons[car.type] || '🚐'}</div>
        <img
          src="${car.image_url || '/van-small.jpg'}"
          alt="${car.model}"
          loading="lazy"
          decoding="async"
          width="640"
          height="400"
          onload="this.parentElement.classList.add('is-loaded');"
          onerror="this.parentElement.classList.add('is-error'); this.style.display='none';"
        />
      </div>
      <div class="van-card-body">
        <div class="van-name-row">
          <span class="van-badge-tag ${typeBadgeClasses[car.type]}">${badgeLabels[car.type]}</span>
        </div>
        <h3>${car.model}</h3>
        <p>${car.description || descriptions[car.type]}</p>
        <div class="van-specs-row">
          <span class="vspec">Automatic</span>
          <span class="vspec">${car.capacity}</span>
          <span class="vspec">${car.payload} kg payload</span>
        </div>
        <div class="van-price-row">
          <div><span class="price-from">From</span><strong class="price-big">£${car.price_daily}</strong><span class="price-unit">/day</span></div>
          <a href="booking.html?van=${car.type}" class="btn btn-primary">Book Now</a>
        </div>
      </div>
    </div>
  `).join('');
  requestAnimationFrame(() => setupRevealElements(container));
}

function renderSpecsCards(cars, container) {
  if (!cars || cars.length === 0) {
    container.innerHTML = '<p class="txt-dim">No specifications available.</p>';
    return;
  }

  container.innerHTML = cars.map(car => `
    <div class="specs-card reveal ${car.type === 'medium' ? 'specs-featured' : ''}">
      <h3>${car.model}</h3>
      <div class="specs-list">
        <div class="spec-row">
          <span class="spec-label">Transmission</span>
          <span class="spec-value">Automatic</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Load Space</span>
          <span class="spec-value">${car.capacity}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Max Payload</span>
          <span class="spec-value">${car.payload} kg</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Fuel Type</span>
          <span class="spec-value">Diesel</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Seats</span>
          <span class="spec-value">2 front ${car.type !== 'small' ? '' : '+ jump seats'}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Daily Rate</span>
          <span class="spec-value">From £${car.price_daily}</span>
        </div>
      </div>
      <a href="booking.html?van=${car.type}" class="btn btn-primary btn-sm">Book Now</a>
    </div>
  `).join('');
  requestAnimationFrame(() => setupRevealElements(container));
}

window.addEventListener('load', async () => {
  document.body.classList.add('is-ready');
  const user = await refreshAuthState();
  initLoginPage(user);
  initBookingPage(user);
  initDashboardPage(user);
  initCarsPage(user);
  
  // Load cars for fleet pages - check for actual page elements instead of pathname
  const hasFleetGrid = document.querySelector('.van-cards-grid');
  const hasSpecsGrid = document.querySelector('.specs-comparison');
  if (hasFleetGrid || hasSpecsGrid) {
    console.log('Detected fleet page elements, loading cars...');
    loadCarsForFleetPage();
  }
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

    if (!supabase) {
      authStatus.textContent = 'Authentication is not configured. Please contact support.';
      authSubmit.disabled = false;
      return;
    }

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

  let bookings = [];
  let error = null;
  
  if (supabase) {
    const result = isAdmin
      ? await supabase.from('bookings').select('*').order('created_at', { ascending: false })
      : await supabase.from('bookings').select('*').or(`user_id.eq.${user.id},email.eq.${user.email}`).order('created_at', { ascending: false });
    bookings = result.data;
    error = result.error;
  }

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
        : loweredStatus.includes('paid')
          ? 'paid'
          : 'successful';
    const isPaid = loweredStatus.includes('paid');
    return `<tr>
      <td>${escapeHTML(booking.service)}</td>
      <td>${escapeHTML(booking.date)}</td>
      <td>${escapeHTML(booking.van_size)}</td>
      <td><span class="admin-status ${statusClass}">${escapeHTML(status)}</span></td>
      <td>${escapeHTML(booking.price || 'GBP 0')}</td>
      ${isAdmin ? `<td>
        <button class="admin-btn-icon mark-paid-btn" data-id="${booking.id}" ${isPaid ? 'disabled' : ''} title="${isPaid ? 'Already paid' : 'Mark as paid'}">💰</button>
        <button class="admin-btn-icon delete-booking-btn" data-id="${booking.id}" title="Delete booking">🗑️</button>
      </td>` : ''}
    </tr>`;
  }).join('');

  if (tableBody) {
    tableBody.innerHTML = bookings.length === 0
      ? `<tr><td colspan="${isAdmin ? '6' : '5'}" class="txt-dim">No bookings found yet.</td></tr>`
      : isInvoicePage ? invoiceRows : bookingRows;
  }

  // Add event listeners for booking action buttons
  if (isAdmin) {
    tableBody?.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.addEventListener('click', () => markBookingAsPaid(btn.dataset.id));
    });

    tableBody?.querySelectorAll('.delete-booking-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteBooking(btn.dataset.id));
    });

    // Populate customers table
    const customersTableBody = document.getElementById('customersTableBody');
    if (customersTableBody && Array.isArray(bookings)) {
      // Group bookings by customer email
      const customerData = {};
      bookings.forEach(booking => {
        const email = booking.email;
        if (!email) return;

        if (!customerData[email]) {
          customerData[email] = {
            name: booking.name || 'Unknown',
            email: email,
            bookings: 0,
            totalSpent: 0
          };
        }
        customerData[email].bookings++;
        customerData[email].totalSpent += parseMoney(booking.price);
      });

      const customerRows = Object.values(customerData).map(customer => `
        <tr>
          <td>${escapeHTML(customer.name)}</td>
          <td>${escapeHTML(customer.email)}</td>
          <td>${customer.bookings}</td>
          <td>${formatMoney(customer.totalSpent)}</td>
          <td>
            <button class="admin-btn-icon delete-customer-btn" data-email="${customer.email}" title="Delete customer and all bookings">🗑️</button>
          </td>
        </tr>
      `).join('');

      customersTableBody.innerHTML = Object.keys(customerData).length === 0
        ? '<tr><td colspan="5" class="txt-dim">No customers found yet.</td></tr>'
        : customerRows;

      // Add event listeners for customer delete buttons
      customersTableBody.querySelectorAll('.delete-customer-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCustomer(btn.dataset.email));
      });
    }
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
    if (supabase) {
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
    }
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
