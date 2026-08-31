// ---------- One-time migration: old localStorage -> Supabase ----------
// Self-contained on purpose — doesn't depend on data.js's cache-backed
// loaders (which now read from Supabase, not localStorage) so it can
// still read the *old* browser-local data that predates this update.

const LEGACY_MONTH_KEYS = { may: '2026-05', june: '2026-06', july: '2026-07' };

const logEl = document.getElementById('log');
const migrateBtn = document.getElementById('migrateBtn');

function log(line) {
  logEl.textContent += (logEl.textContent ? '\n' : '') + line;
}

function readLegacyBookings() {
  const raw = localStorage.getItem('urbanhomes-bookings-v1');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const data = {};
    Object.keys(parsed).forEach(key => {
      data[LEGACY_MONTH_KEYS[key] || key] = parsed[key];
    });
    return data;
  } catch (e) {
    return null;
  }
}

function readLegacyJsonArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

migrateBtn.addEventListener('click', async () => {
  migrateBtn.disabled = true;
  logEl.textContent = '';

  const session = await requireSession();
  if (!session) return; // already redirecting to login.html
  const userId = session.user.id;

  const { count } = await sb.from('bookings').select('id', { count: 'exact', head: true });
  if (count && count > 0) {
    if (!confirm(`Your account already has ${count} bookings saved. Migrating again will duplicate them. Continue anyway?`)) {
      migrateBtn.disabled = false;
      return;
    }
  }

  const bookings = readLegacyBookings();
  if (!bookings) {
    log('No local booking data found in this browser — nothing to migrate.');
    migrateBtn.disabled = false;
    return;
  }

  const bookingRows = [];
  Object.keys(bookings).forEach(month => {
    (bookings[month] || []).forEach(b => {
      bookingRows.push({
        user_id: userId,
        booking_code: b.id,
        month_key: month,
        date_booked: b.dateBooked || null,
        guest: b.guest || '',
        apartment: b.apartment || '',
        checkin: b.checkin || null,
        checkout: b.checkout || null,
        total: Number(b.total) || 0,
        host_share: Number(b.hostShare) || 0,
        commission: Number(b.commission) || 0,
        amount_paid: Number(b.amountPaid) || 0,
        remaining: Number(b.remaining) || 0,
        host_paid: b.hostPaid || '',
        status: b.status || '',
      });
    });
  });

  log(`Found ${bookingRows.length} bookings across ${Object.keys(bookings).length} months. Uploading…`);
  const { error: bookingsError } = await sb.from('bookings').insert(bookingRows);
  if (bookingsError) {
    log('❌ Failed to upload bookings: ' + bookingsError.message);
    migrateBtn.disabled = false;
    return;
  }
  log(`✅ Uploaded ${bookingRows.length} bookings.`);

  const customHosts = readLegacyJsonArray('urbanhomes-custom-hosts-v1');
  if (customHosts.length) {
    const hostRows = customHosts.map(h => ({ user_id: userId, key: h.key, name: h.name, icon: h.icon, keywords: h.keywords || [] }));
    const { error } = await sb.from('custom_hosts').insert(hostRows);
    log(error ? '❌ Failed to upload custom hosts: ' + error.message : `✅ Uploaded ${hostRows.length} custom host(s).`);
  } else {
    log('No custom hosts to migrate.');
  }

  const hiddenHosts = readLegacyJsonArray('urbanhomes-hidden-hosts-v1');
  if (hiddenHosts.length) {
    const hiddenRows = hiddenHosts.map(key => ({ user_id: userId, key }));
    const { error } = await sb.from('hidden_hosts').insert(hiddenRows);
    log(error ? '❌ Failed to upload hidden hosts: ' + error.message : `✅ Uploaded ${hiddenRows.length} hidden host(s).`);
  } else {
    log('No hidden hosts to migrate.');
  }

  log('\nDone! Go check the Bookings/Host/Finances pages — then delete migrate.html and migrate.js from the site.');
  migrateBtn.disabled = false;
});
