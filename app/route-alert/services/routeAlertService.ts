import { supabase } from '@/lib/supabase';

export interface CreateAlertPayload {
  userId: string | null;
  email: string;
  originCity: string;
  originCityId: string | null;
  destinationCity: string;
  destinationCityId: string | null;
  dateFrom: string | null;
}

export async function createRouteAlert(payload: CreateAlertPayload) {
  const { error: dbError } = await supabase
    .from('route_alerts' as any)
    .insert({
      user_id: payload.userId,
      email: payload.email || null,
      origin_city: payload.originCity,
      origin_city_id: payload.originCityId,
      destination_city: payload.destinationCity,
      destination_city_id: payload.destinationCityId,
      date_from: payload.dateFrom,
    });

  if (dbError) throw dbError;
}

export interface CreateNotificationPayload {
  userId: string;
  message: string;
}

export async function createAlertNotification(payload: CreateNotificationPayload) {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: 'route_alert_created',
    message: payload.message,
  });

  if (error) throw error;
}
