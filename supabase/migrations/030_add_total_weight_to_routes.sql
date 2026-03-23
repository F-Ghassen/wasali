-- Migration 030: Add total_weight_kg to routes table
-- Represents the original total capacity; available_weight_kg tracks what's left

ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_weight_kg decimal NOT NULL DEFAULT 0;

-- Backfill: set total_weight_kg = available_weight_kg for existing routes
-- (since no bookings have been confirmed yet in most cases)
UPDATE routes SET total_weight_kg = available_weight_kg WHERE total_weight_kg = 0;
