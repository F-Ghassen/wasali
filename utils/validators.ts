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

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
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
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientPhoneCC: z.string(),
  recipientPhone: z.string().min(6, 'Phone number is required'),
  recipientPhoneIsWhatsapp: z.boolean(),
  driverNotes: z.string().max(500).optional(),
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

export const routeStopSchema = z.object({
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  arrival_date: z.string().optional(),
  is_pickup_available: z.boolean(),
  is_dropoff_available: z.boolean(),
});

export const createRouteSchema = z.object({
  origin_city: z.string().min(1, 'Origin city is required'),
  origin_country: z.string().min(1, 'Origin country is required'),
  destination_city: z.string().min(1, 'Destination city is required'),
  destination_country: z.string().min(1, 'Destination country is required'),
  departure_date: z.string().min(1, 'Departure date is required').refine(
    (d) => new Date(d) >= new Date(new Date().toDateString()),
    'Departure date must be today or in the future'
  ),
  estimated_arrival_date: z.string().optional(),
  available_weight_kg: z
    .number()
    .min(1, 'Minimum 1 kg')
    .max(200, 'Maximum 200 kg'),
  price_per_kg_eur: z
    .number()
    .min(0.5, 'Minimum €0.50/kg')
    .max(100, 'Maximum €100/kg'),
  notes: z.string().max(500).optional(),
  stops: z.array(routeStopSchema).optional(),
});

export type CreateRouteData = z.infer<typeof createRouteSchema>;
export type RouteStopData = z.infer<typeof routeStopSchema>;

export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type PackageDetailsData = z.infer<typeof packageDetailsSchema>;
export type LogisticsData = z.infer<typeof logisticsSchema>;
export type SavedAddressData = z.infer<typeof savedAddressSchema>;
export type ShippingRequestData = z.infer<typeof shippingRequestSchema>;
export type RatingData = z.infer<typeof ratingSchema>;
export type DisputeData = z.infer<typeof disputeSchema>;
