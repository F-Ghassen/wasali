import { describe, it, expect, afterAll } from 'vitest';
import { createRouteAlert, createAlertNotification } from '@/app/route-alert/services/routeAlertService';
import { supabase } from '@/lib/supabase';

/**
 * Integration tests for Route Alert feature
 * Requires running Supabase stack: `supabase start`
 */
describe('Route Alert Service - Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    // Cleanup: remove test alerts
    await supabase.from('route_alerts').delete().eq('email', testEmail);
  });

  describe('Non-Signed-In User', () => {
    it('should create alert with email only (no user_id)', async () => {
      await createRouteAlert({
        userId: null,
        email: testEmail,
        originCity: 'Paris',
        originCityId: null,
        destinationCity: 'Tunis',
        destinationCityId: null,
        dateFrom: null,
      });

      // Verify the alert was created
      const { data, error } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('email', testEmail)
        .eq('origin_city', 'Paris')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBeNull();
      expect(data?.email).toBe(testEmail);
      expect(data?.origin_city).toBe('Paris');
      expect(data?.destination_city).toBe('Tunis');
    });

    it('should create alert with optional date', async () => {
      const testDate = '2026-06-15';

      await createRouteAlert({
        userId: null,
        email: testEmail,
        originCity: 'London',
        originCityId: null,
        destinationCity: 'Casablanca',
        destinationCityId: null,
        dateFrom: testDate,
      });

      // Verify the alert was created with date
      const { data } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('email', testEmail)
        .eq('origin_city', 'London')
        .single();

      expect(data?.date_from).toBe(testDate);
    });
  });

  describe('Signed-In User (mock)', () => {
    it('should create alert with user_id and email', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000001';

      await createRouteAlert({
        userId: testUserId,
        email: testEmail,
        originCity: 'Berlin',
        originCityId: null,
        destinationCity: 'Rabat',
        destinationCityId: null,
        dateFrom: null,
      });

      const { data } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('user_id', testUserId)
        .eq('origin_city', 'Berlin')
        .single();

      expect(data?.user_id).toBe(testUserId);
      expect(data?.email).toBe(testEmail);
    });

    it('should create notification for signed-in user', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000002';
      const message = 'Alert saved: you will be notified about Paris to Tunis routes.';

      await createAlertNotification({
        userId: testUserId,
        message,
      });

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId)
        .eq('type', 'route_alert_created')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      expect(data?.user_id).toBe(testUserId);
      expect(data?.type).toBe('route_alert_created');
      expect(data?.message).toBe(message);

      // Cleanup
      await supabase.from('notifications').delete().eq('user_id', testUserId);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty city IDs', async () => {
      await createRouteAlert({
        userId: null,
        email: testEmail,
        originCity: 'Amsterdam',
        originCityId: null,
        destinationCity: 'Sousse',
        destinationCityId: null,
        dateFrom: null,
      });

      const { data } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('email', testEmail)
        .eq('origin_city', 'Amsterdam')
        .single();

      expect(data?.origin_city_id).toBeNull();
      expect(data?.destination_city_id).toBeNull();
    });
  });
});
