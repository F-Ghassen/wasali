/**
 * tests/helpers.ts
 *
 * Shared test utilities for Wasali integration tests.
 * Uses the Supabase service-role key so tests can bypass RLS.
 *
 * Usage:
 *   import { createTestUser, cleanupUser, adminClient, TEST_ROUTE } from './helpers';
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { UserRole } from '../types/models';

// ─── Clients ──────────────────────────────────────────────────────────────────

const LOCAL_URL =
  process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  // Local dev default (supabase start default service-role JWT)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0';

const LOCAL_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  // Local dev default (supabase start default anon JWT)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.UZBKN53oO-hcH6q6YJVJVKDgJp1vmBt2g1MWVQkmCco';

/** Admin client (bypasses RLS). Never expose to the app bundle. */
export const adminClient = createClient<Database>(LOCAL_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── createTestUser ───────────────────────────────────────────────────────────

export interface TestUser {
  userId: string;
  email: string;
  password: string;
  /** Supabase client pre-authenticated as this user */
  client: ReturnType<typeof createClient<Database>>;
}

/**
 * Creates a confirmed user in the local Supabase instance and returns a
 * Supabase client that is already signed-in as that user.
 *
 * @param role  'sender' | 'driver'  — stored in user_metadata.role and used
 *              by the handle_new_user trigger to populate profiles.role
 */
export async function createTestUser(role: UserRole): Promise<TestUser> {
  const email = `test-${role}-${Date.now()}@wasali-test.com`;
  const password = 'Test1234!';

  // Create a pre-confirmed user via the admin API
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${role}`, role },
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);

  // Sign in with email/password to get a real session (no email flow since user is pre-confirmed)
  const userClient = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error: signInError } =
    await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);

  return { userId: data.user.id, email, password, client: signInData.user ? userClient : userClient };
}

// ─── cleanupUser ──────────────────────────────────────────────────────────────

/**
 * Deletes the auth user (cascades to profiles via FK) and removes any
 * orphaned rows created during the test.
 */
export async function cleanupUser(userId: string): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(`deleteUser failed: ${error.message}`);
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

/**
 * Inserts a route owned by `driverUserId` and returns the route id.
 * Relies on the driver already having a profile row (created by the
 * handle_new_user trigger after createTestUser).
 */
export async function seedRoute(
  driverUserId: string,
  overrides: Partial<typeof TEST_ROUTE> = {},
): Promise<string> {
  const payload = { ...TEST_ROUTE, payment_methods: [...TEST_ROUTE.payment_methods], driver_id: driverUserId, status: 'active', ...overrides };
  const { data, error } = await adminClient
    .from('routes')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(`seedRoute failed: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Removes a route and all its bookings (admin-level, ignores RLS).
 */
export async function cleanupRoute(routeId: string): Promise<void> {
  // bookings FK has ON DELETE CASCADE from routes in schema.sql,
  // so deleting the route is sufficient
  await adminClient.from('routes').delete().eq('id', routeId);
}

// ─── Fixture data ─────────────────────────────────────────────────────────────

export const TEST_ROUTE = {
  origin_city: 'Berlin',
  origin_country: 'DE',
  destination_city: 'Tunis',
  destination_country: 'TN',
  departure_date: '2026-06-01',
  estimated_arrival_date: '2026-06-05',
  available_weight_kg: 50,
  min_weight_kg: 1,
  price_per_kg_eur: 8,
  notes: 'Test route — created by test helpers',
  payment_methods: ['cash', 'bank_transfer'] as string[],
};

export const TEST_BOOKING_DRAFT = {
  package_weight_kg: 5,
  package_category: 'general',
  package_photos: [] as string[],
  declared_value_eur: null as number | null,
  pickup_type: 'sender_dropoff' as string,
  pickup_address: null as string | null,
  dropoff_type: 'home_delivery' as string,
  dropoff_address: '12 Rue de la Liberté, Tunis',
  recipient_name: 'Fatma Test',
  recipient_phone: '+21698765432',
  driver_notes: null as string | null,
  price_eur: 40 as number,
  status: 'pending' as string,
  payment_status: 'pending' as string,
};
