#!/usr/bin/env npx tsx
/**
 * tests/seed-test-data.ts
 *
 * Seeds a test driver and a test sender in the local Supabase instance,
 * publishes a route, and prints credentials as shell-env-var exports so they
 * can be passed to Maestro via --env.
 *
 * Run:
 *   npx tsx tests/seed-test-data.ts
 *
 * Then copy the printed exports into your shell before running Maestro:
 *   export DRIVER_EMAIL=...
 *   export DRIVER_PASSWORD=...
 *   ...
 *   maestro test .maestro/01_driver_create_route.yaml
 *
 * Or use Maestro's --env flag:
 *   maestro test --env DRIVER_EMAIL=... --env DRIVER_PASSWORD=... .maestro/
 */

import { createTestUser, seedRoute, TEST_ROUTE } from './helpers';

async function main() {
  console.log('Seeding test data into local Supabase (http://127.0.0.1:54321)...\n');

  // 1. Create driver
  console.log('Creating test driver...');
  const driver = await createTestUser('driver');
  console.log(`  driver userId : ${driver.userId}`);
  console.log(`  driver email  : ${driver.email}`);

  // 2. Create sender
  console.log('Creating test sender...');
  const sender = await createTestUser('sender');
  console.log(`  sender userId : ${sender.userId}`);
  console.log(`  sender email  : ${sender.email}`);

  // 3. Seed a published route owned by the driver
  console.log('Seeding test route...');
  const routeId = await seedRoute(driver.userId, {
    departure_date: '2026-06-01',
    available_weight_kg: 50,
    price_per_kg_eur: 8,
  });
  console.log(`  route id      : ${routeId}`);

  // 4. Print shell exports
  console.log('\n─── Copy-paste these env vars into your shell ────────────────────────────\n');
  console.log(`export DRIVER_EMAIL="${driver.email}"`);
  console.log(`export DRIVER_PASSWORD="${driver.password}"`);
  console.log(`export DRIVER_USER_ID="${driver.userId}"`);
  console.log(`export SENDER_EMAIL="${sender.email}"`);
  console.log(`export SENDER_PASSWORD="${sender.password}"`);
  console.log(`export SENDER_USER_ID="${sender.userId}"`);
  console.log(`export TEST_ROUTE_ID="${routeId}"`);
  console.log('\n──────────────────────────────────────────────────────────────────────────');
  console.log('\nOr use Maestro --env flags:');
  const flags = [
    `DRIVER_EMAIL=${driver.email}`,
    `DRIVER_PASSWORD=${driver.password}`,
    `SENDER_EMAIL=${sender.email}`,
    `SENDER_PASSWORD=${sender.password}`,
    `TEST_ROUTE_ID=${routeId}`,
  ]
    .map((kv) => `  --env ${kv}`)
    .join(' \\\n');
  console.log(`maestro test \\\n${flags} \\\n  .maestro/`);
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
