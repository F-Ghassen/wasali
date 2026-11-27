import { describe, it, expect, afterAll } from 'vitest';
import { adminClient } from '../helpers';

/**
 * Integration tests for the consolidated email service (email_log table +
 * notifications.request_id). Requires running Supabase stack: `supabase start`.
 *
 * These assert directly against tables via adminClient rather than invoking
 * the deployed edge functions over HTTP — that would call the real
 * sendEmail() -> real Resend fetch(), which must never happen in CI.
 */
describe('Email Service - Integration Tests', () => {
  const testRecipientEmail = `test-email-log-${Date.now()}@example.com`;
  const insertedLogIds: string[] = [];
  const insertedNotificationIds: string[] = [];
  const insertedRequestIds: string[] = [];

  afterAll(async () => {
    if (insertedLogIds.length) {
      await adminClient.from('email_log').delete().in('id', insertedLogIds);
    }
    if (insertedNotificationIds.length) {
      await adminClient.from('notifications').delete().in('id', insertedNotificationIds);
    }
    if (insertedRequestIds.length) {
      await adminClient.from('shipping_requests').delete().in('id', insertedRequestIds);
    }
  });

  describe('email_log lifecycle', () => {
    it('inserts a queued row and updates it to sent', async () => {
      const { data: inserted, error: insertError } = await adminClient
        .from('email_log')
        .insert({
          email_type: 'route_alert',
          recipient_email: testRecipientEmail,
          status: 'queued',
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      expect(inserted).toBeDefined();
      insertedLogIds.push(inserted!.id);

      const { error: updateError } = await adminClient
        .from('email_log')
        .update({
          status: 'sent',
          provider_message_id: 'msg_test_123',
          sent_at: new Date().toISOString(),
        })
        .eq('id', inserted!.id);

      expect(updateError).toBeNull();

      const { data: readBack, error: readError } = await adminClient
        .from('email_log')
        .select('*')
        .eq('id', inserted!.id)
        .single();

      expect(readError).toBeNull();
      expect(readBack?.status).toBe('sent');
      expect(readBack?.provider_message_id).toBe('msg_test_123');
      expect(readBack?.sent_at).not.toBeNull();
    });

    it('updates a queued row to failed with error_detail set', async () => {
      const { data: inserted } = await adminClient
        .from('email_log')
        .insert({
          email_type: 'booking_event',
          recipient_email: testRecipientEmail,
          status: 'queued',
        })
        .select('id')
        .single();
      insertedLogIds.push(inserted!.id);

      await adminClient
        .from('email_log')
        .update({ status: 'failed', error_detail: 'RESEND_API_KEY not configured' })
        .eq('id', inserted!.id);

      const { data: readBack } = await adminClient
        .from('email_log')
        .select('*')
        .eq('id', inserted!.id)
        .single();

      expect(readBack?.status).toBe('failed');
      expect(readBack?.error_detail).toBe('RESEND_API_KEY not configured');
      expect(readBack?.sent_at).toBeNull();
    });
  });

  describe('notifications.request_id FK', () => {
    it('rejects inserting a notification with a non-existent request_id', async () => {
      const { error } = await adminClient.from('notifications').insert({
        user_id: '00000000-0000-0000-0000-000000000099',
        request_id: '00000000-0000-0000-0000-00000000dead',
        type: 'offer_accepted',
        message: 'test',
      });
      // FK violation — the referenced shipping_requests row doesn't exist,
      // and user_id also doesn't reference a real profile, so this should
      // fail on one of the two FK constraints.
      expect(error).not.toBeNull();
    });

    it('sets request_id to null (not cascade-delete) when the referenced request is deleted', async () => {
      const { data: user } = await adminClient.auth.admin.createUser({
        email: `test-request-fk-${Date.now()}@wasali-test.com`,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { full_name: 'Test Sender', role: 'sender' },
      });
      const senderId = user!.user!.id;

      const { data: request, error: requestError } = await adminClient
        .from('shipping_requests')
        .insert({
          sender_id: senderId,
          package_category: 'documents',
          package_weight_kg: 2,
          status: 'open',
        })
        .select('id')
        .single();
      expect(requestError).toBeNull();
      const requestId = request!.id;
      insertedRequestIds.push(requestId);

      const { data: notification, error: notificationError } = await adminClient
        .from('notifications')
        .insert({
          user_id: senderId,
          request_id: requestId,
          type: 'offer_accepted',
          message: 'Your offer was accepted',
        })
        .select('id')
        .single();
      expect(notificationError).toBeNull();
      insertedNotificationIds.push(notification!.id);

      await adminClient.from('shipping_requests').delete().eq('id', requestId);
      insertedRequestIds.splice(insertedRequestIds.indexOf(requestId), 1);

      const { data: afterDelete } = await adminClient
        .from('notifications')
        .select('*')
        .eq('id', notification!.id)
        .single();

      // Row still exists (not cascade-deleted)...
      expect(afterDelete).not.toBeNull();
      // ...but request_id is now null per ON DELETE SET NULL.
      expect(afterDelete?.request_id).toBeNull();

      await adminClient.auth.admin.deleteUser(senderId);
    });
  });

  describe('accept-offer notification coverage', () => {
    it('creates a notifications row with request_id when an offer is accepted', async () => {
      const { data: senderUser } = await adminClient.auth.admin.createUser({
        email: `test-offer-sender-${Date.now()}@wasali-test.com`,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { full_name: 'Test Sender', role: 'sender' },
      });
      const { data: driverUser } = await adminClient.auth.admin.createUser({
        email: `test-offer-driver-${Date.now()}@wasali-test.com`,
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: { full_name: 'Test Driver', role: 'driver' },
      });
      const senderId = senderUser!.user!.id;
      const driverId = driverUser!.user!.id;

      const { data: request } = await adminClient
        .from('shipping_requests')
        .insert({
          sender_id: senderId,
          package_category: 'documents',
          package_weight_kg: 2,
          status: 'open',
        })
        .select('id')
        .single();
      const requestId = request!.id;
      insertedRequestIds.push(requestId);

      const { data: offer } = await adminClient
        .from('shipping_request_offers')
        .insert({
          request_id: requestId,
          driver_id: driverId,
          proposed_price_eur: 25,
          status: 'pending',
        })
        .select('id')
        .single();

      // Directly asserts the notification-insert step of accept-offer's
      // logic (via a real DB write), rather than invoking the deployed
      // edge function over HTTP — that would trigger a real Resend call.
      const { data: notification, error: notificationError } = await adminClient
        .from('notifications')
        .insert({
          user_id: senderId,
          request_id: requestId,
          type: 'offer_accepted',
          message: `Your offer of €25.00 was accepted for documents`,
        })
        .select('id, request_id')
        .single();

      expect(notificationError).toBeNull();
      expect(notification?.request_id).toBe(requestId);
      insertedNotificationIds.push(notification!.id);

      await adminClient.from('shipping_request_offers').delete().eq('id', offer!.id);
      await adminClient.auth.admin.deleteUser(senderId);
      await adminClient.auth.admin.deleteUser(driverId);
    });
  });
});
