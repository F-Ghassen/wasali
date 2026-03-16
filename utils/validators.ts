import { z } from 'zod';

export const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const phoneSchema = z.object({
  phone: z.string().min(8, 'Invalid phone number'),
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const packageDetailsSchema = z.object({
  weight: z
    .number()
    .min(0.1, 'Weight must be at least 0.1 kg')
    .max(200, 'Weight cannot exceed 200 kg'),
  category: z.string().min(1, 'Please select a category'),
  declaredValue: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const logisticsSchema = z.object({
  pickupType: z.enum(['driver_pickup', 'sender_dropoff']),
  pickupAddress: z.string().optional(),
  dropoffType: z.enum(['home_delivery', 'recipient_pickup']),
  dropoffAddress: z.string().optional(),
});

export const savedAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().optional(),
});

export const shippingRequestSchema = z.object({
  originCity: z.string().min(1, 'Origin city is required'),
  originCountry: z.string().min(1, 'Origin country is required'),
  destinationCity: z.string().min(1, 'Destination city is required'),
  destinationCountry: z.string().min(1, 'Destination country is required'),
  packageWeightKg: z.number().min(0.1).max(200),
  packageCategory: z.string().min(1),
  maxBudgetEur: z.number().min(1).optional(),
  desiredDateFrom: z.string().optional(),
  desiredDateTo: z.string().optional(),
});

export const ratingSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const disputeSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().min(20, 'Please provide a detailed description'),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PackageDetailsData = z.infer<typeof packageDetailsSchema>;
export type LogisticsData = z.infer<typeof logisticsSchema>;
export type SavedAddressData = z.infer<typeof savedAddressSchema>;
export type ShippingRequestData = z.infer<typeof shippingRequestSchema>;
export type RatingData = z.infer<typeof ratingSchema>;
export type DisputeData = z.infer<typeof disputeSchema>;
