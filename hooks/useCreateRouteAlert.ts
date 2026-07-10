import { useState } from 'react';
import { format } from 'date-fns';
import { createRouteAlert, createAlertNotification } from '@/app/route-alert/services/routeAlertService';

interface CreateAlertParams {
  userId: string;
  fromCity: string;
  fromCityId: string | null;
  toCity: string;
  toCityId: string | null;
  dateFrom: Date | null;
}

export function useCreateRouteAlert() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (params: CreateAlertParams) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createRouteAlert({
        userId: params.userId,
        email: '',
        originCity: params.fromCity,
        originCityId: params.fromCityId,
        destinationCity: params.toCity,
        destinationCityId: params.toCityId,
        dateFrom: params.dateFrom ? format(params.dateFrom, 'yyyy-MM-dd') : null,
      });
      const dateLabel = params.dateFrom ? ` from ${format(params.dateFrom, 'MMM d, yyyy')}` : '';
      await createAlertNotification({
        userId: params.userId,
        message: `Alert saved: you'll be notified when a ${params.fromCity} → ${params.toCity} route is published${dateLabel}.`,
      });
      setSubmitted(true);
    } catch {
      setError('Could not save alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setError(null);
  };

  return { submit, reset, isSubmitting, submitted, error };
}
