/**
 * Creates two loginable test accounts on the remote Supabase project:
 *   sender:  test.sender@wasali.test  / Wasali123!
 *   driver:  test.driver@wasali.test  / Wasali123!
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your_key> node scripts/seed-test-users.mjs
 */

const SUPABASE_URL = 'https://cxlxlisfvbfqtysgnklu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_ROLE_KEY env var before running this script.');
  console.error('   Get it from: Supabase dashboard → Project Settings → API → service_role');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function upsertUser({ email, password, role, fullName, phone }) {
  // Check if user already exists
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers }
  );
  const listData = await listRes.json();
  const existing = listData.users?.find((u) => u.email === email);

  let userId;

  if (existing) {
    console.log(`↩  ${email} already exists — updating password`);
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password, email_confirm: true }),
    });
    const updated = await updateRes.json();
    if (updated.error) throw new Error(updated.error.message ?? JSON.stringify(updated));
    userId = existing.id;
  } else {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, full_name: fullName },
      }),
    });
    const created = await createRes.json();
    if (created.error) throw new Error(created.error.message ?? JSON.stringify(created));
    userId = created.id;
    console.log(`✅  Created ${email} (${userId})`);
  }

  // Upsert profile row
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, full_name: fullName, phone, role }),
  });
  if (!profileRes.ok) {
    const body = await profileRes.text();
    console.warn(`⚠  Profile upsert for ${email}: ${body}`);
  } else {
    console.log(`   Profile set — role: ${role}`);
  }
}

await upsertUser({
  email: 'test.sender@wasali.test',
  password: 'Wasali123!',
  role: 'sender',
  fullName: 'Test Sender',
  phone: '+49 170 0000001',
});

await upsertUser({
  email: 'test.driver@wasali.test',
  password: 'Wasali123!',
  role: 'driver',
  fullName: 'Test Driver',
  phone: '+49 170 0000002',
});

console.log('\nDone. Credentials:');
console.log('  Sender:  test.sender@wasali.test  /  Wasali123!');
console.log('  Driver:  test.driver@wasali.test  /  Wasali123!');
