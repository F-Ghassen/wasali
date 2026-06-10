import type { BookingStatus } from '@/constants/bookingStatus';
import type { StepState } from '../types/index';

export function stepState(stepKey: BookingStatus, currentStatus: BookingStatus): StepState {
  const order: BookingStatus[] = ['pending', 'confirmed', 'in_transit', 'delivered'];
  const stepIdx    = order.indexOf(stepKey);
  const currentIdx = order.indexOf(currentStatus);
  if (stepIdx < currentIdx)  return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}
