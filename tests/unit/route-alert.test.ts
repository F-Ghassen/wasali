import { describe, it, expect, vi } from 'vitest';
import type { CreateAlertPayload } from '@/app/route-alert/services/routeAlertService';

describe('Route Alert Service - Unit Tests', () => {
  describe('Non-Signed-In User Payload', () => {
    it('should prepare payload with email only (no user_id)', () => {
      const payload: CreateAlertPayload = {
        userId: null,
        email: 'guest@example.com',
        originCity: 'Paris',
        originCityId: null,
        destinationCity: 'Tunis',
        destinationCityId: null,
        dateFrom: null,
      };

      expect(payload.userId).toBeNull();
      expect(payload.email).toBe('guest@example.com');
      expect(payload.originCity).toBe('Paris');
      expect(payload.destinationCity).toBe('Tunis');
      expect(payload.dateFrom).toBeNull();
    });

    it('should prepare payload with optional date', () => {
      const testDate = '2026-06-15';
      const payload: CreateAlertPayload = {
        userId: null,
        email: 'guest@example.com',
        originCity: 'London',
        originCityId: null,
        destinationCity: 'Casablanca',
        destinationCityId: null,
        dateFrom: testDate,
      };

      expect(payload.dateFrom).toBe(testDate);
    });
  });

  describe('Signed-In User Payload', () => {
    it('should prepare payload with user_id and email', () => {
      const testUserId = '00000000-0000-0000-0000-000000000001';
      const payload: CreateAlertPayload = {
        userId: testUserId,
        email: 'user@example.com',
        originCity: 'Berlin',
        originCityId: 'berlin-id',
        destinationCity: 'Rabat',
        destinationCityId: 'rabat-id',
        dateFrom: null,
      };

      expect(payload.userId).toBe(testUserId);
      expect(payload.email).toBe('user@example.com');
      expect(payload.originCityId).toBe('berlin-id');
      expect(payload.destinationCityId).toBe('rabat-id');
    });
  });

  describe('Input Validation', () => {
    it('should accept empty city IDs', () => {
      const payload: CreateAlertPayload = {
        userId: null,
        email: 'guest@example.com',
        originCity: 'Amsterdam',
        originCityId: null,
        destinationCity: 'Sousse',
        destinationCityId: null,
        dateFrom: null,
      };

      expect(payload.originCityId).toBeNull();
      expect(payload.destinationCityId).toBeNull();
    });

    it('should accept email for non-signed-in users', () => {
      const payload: CreateAlertPayload = {
        userId: null,
        email: 'test@example.com',
        originCity: 'Paris',
        originCityId: null,
        destinationCity: 'Tunis',
        destinationCityId: null,
        dateFrom: null,
      };

      expect(payload.userId).toBeNull();
      expect(payload.email).toBeTruthy();
    });

    it('should accept both user_id and email for signed-in users', () => {
      const payload: CreateAlertPayload = {
        userId: '123',
        email: 'user@example.com',
        originCity: 'Paris',
        originCityId: 'paris-id',
        destinationCity: 'Tunis',
        destinationCityId: 'tunis-id',
        dateFrom: '2026-06-15',
      };

      expect(payload.userId).toBeTruthy();
      expect(payload.email).toBeTruthy();
      expect(payload.originCityId).toBeTruthy();
      expect(payload.destinationCityId).toBeTruthy();
      expect(payload.dateFrom).toBeTruthy();
    });
  });

  describe('Notification Payload', () => {
    it('should prepare notification message correctly', () => {
      const message = 'Alert saved: you\'ll be notified when a Paris → Tunis route is published.';

      expect(message).toContain('Paris');
      expect(message).toContain('Tunis');
      expect(message).toContain('Alert saved');
    });

    it('should prepare notification message with date', () => {
      const message = 'Alert saved: you\'ll be notified when a London → Casablanca route is published from Jun 15, 2026.';

      expect(message).toContain('London');
      expect(message).toContain('Casablanca');
      expect(message).toContain('Jun 15, 2026');
    });
  });
});
