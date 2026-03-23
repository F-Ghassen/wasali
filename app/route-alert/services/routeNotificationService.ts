import { supabase } from '@/lib/supabase';

/**
 * Triggers the route alert notification process when a new route is published.
 * This invokes the notify-route-alert edge function which:
 * 1. Finds all matching route alerts
 * 2. Sends emails to non-signed-in users
 * 3. Creates in-app notifications for signed-in users
 */
export async function notifyRouteAlerts(routeId: string) {
  try {
    const response = await supabase.functions.invoke('notify-route-alert', {
      body: { routeId },
    });

    if (!response.data) {
      throw new Error('No response from notification service');
    }

    console.log('Route alerts notification sent:', response.data);

    return response.data;
  } catch (error) {
    console.error('Failed to notify route alerts:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to send route alert notifications'
    );
  }
}

/**
 * Test function to verify the notification service is working
 */
export async function testNotifyRouteAlerts(routeId: string) {
  try {
    const result = await notifyRouteAlerts(routeId);
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
