import { describe, it, expect } from 'vitest';

// Inline tracking step logic (mirrors tracking screen)
const STATUS_ORDER = ['confirmed', 'in_transit', 'delivered', 'rated'] as const;
type BookingStatus = typeof STATUS_ORDER[number] | 'pending';
type StepKey = typeof STATUS_ORDER[number];
type StepResult = 'done' | 'current' | 'pending';

function stepStatus(stepKey: StepKey, currentStatus: BookingStatus): StepResult {
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus as StepKey);
  if (currentStatus === 'pending') return 'pending';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

describe('stepStatus', () => {
  describe("when status is 'pending'", () => {
    it('confirmed → pending', () => expect(stepStatus('confirmed', 'pending')).toBe('pending'));
    it('in_transit → pending', () => expect(stepStatus('in_transit', 'pending')).toBe('pending'));
    it('delivered → pending', () => expect(stepStatus('delivered', 'pending')).toBe('pending'));
    it('rated → pending', () => expect(stepStatus('rated', 'pending')).toBe('pending'));
  });

  describe("when status is 'confirmed'", () => {
    it('confirmed → current', () => expect(stepStatus('confirmed', 'confirmed')).toBe('current'));
    it('in_transit → pending', () => expect(stepStatus('in_transit', 'confirmed')).toBe('pending'));
    it('delivered → pending', () => expect(stepStatus('delivered', 'confirmed')).toBe('pending'));
    it('rated → pending', () => expect(stepStatus('rated', 'confirmed')).toBe('pending'));
  });

  describe("when status is 'in_transit'", () => {
    it('confirmed → done', () => expect(stepStatus('confirmed', 'in_transit')).toBe('done'));
    it('in_transit → current', () => expect(stepStatus('in_transit', 'in_transit')).toBe('current'));
    it('delivered → pending', () => expect(stepStatus('delivered', 'in_transit')).toBe('pending'));
    it('rated → pending', () => expect(stepStatus('rated', 'in_transit')).toBe('pending'));
  });

  describe("when status is 'delivered'", () => {
    it('confirmed → done', () => expect(stepStatus('confirmed', 'delivered')).toBe('done'));
    it('in_transit → done', () => expect(stepStatus('in_transit', 'delivered')).toBe('done'));
    it('delivered → current', () => expect(stepStatus('delivered', 'delivered')).toBe('current'));
    it('rated → pending', () => expect(stepStatus('rated', 'delivered')).toBe('pending'));
  });

  describe("when status is 'rated'", () => {
    it('confirmed → done', () => expect(stepStatus('confirmed', 'rated')).toBe('done'));
    it('in_transit → done', () => expect(stepStatus('in_transit', 'rated')).toBe('done'));
    it('delivered → done', () => expect(stepStatus('delivered', 'rated')).toBe('done'));
    it('rated → current', () => expect(stepStatus('rated', 'rated')).toBe('current'));
  });
});
