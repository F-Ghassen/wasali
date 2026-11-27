import { z } from 'zod';
import { CASH_PAYMENT_TYPES } from '@/constants/paymentMethods';
import { normalizePhoneNumber } from '@/utils/phone';
import { isKnownCountryCode, isKnownCountryIso } from '@/utils/phoneCountries';

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

const passwordField = z.string().min(8, 'Password must be at least 8 characters');

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const changeEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * A national number, typed without the country code (that is picked separately).
 * 6–12 digits once spaces, dashes and brackets are dropped.
 */
export const phoneNumberSchema = z
  .string()
  .trim()
  .refine((v) => !v.startsWith('+'), 'Leave out the country code, pick it on the left')
  .refine((v) => /^[0-9 ()-]+$/.test(v), 'Invalid phone number')
  .refine((v) => {
    const digits = normalizePhoneNumber(v).length;
    return digits >= 6 && digits <= 12;
  }, 'Invalid phone number');

export const profileSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    countryCode: z.string(),
    phoneNumber: z.union([z.literal(''), phoneNumberSchema]),
    /** Residence country (ISO alpha-2). Empty means not set yet. */
    countryIso: z.union([z.literal(''), z.string()]),
  })
  .refine((d) => d.phoneNumber === '' || isKnownCountryCode(d.countryCode), {
    message: 'Choose a country code',
    path: ['countryCode'],
  })
  .refine((d) => d.countryIso === '' || isKnownCountryIso(d.countryIso), {
    message: 'Choose a country',
    path: ['countryIso'],
  });

export type ProfileFormData = z.infer<typeof profileSchema>;

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

/**
 * A contact is a person. The address is optional, but once any part of it is
 * typed the street and city are both required.
 */
export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    countryCode: z.string(),
    phoneNumber: phoneNumberSchema,
    whatsappEnabled: z.boolean(),
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
  })
  .refine((d) => isKnownCountryCode(d.countryCode), {
    message: 'Choose a country code',
    path: ['countryCode'],
  })
  .refine((d) => !(d.street || d.city || d.postalCode) || (d.street && d.city), {
    message: 'Street and city are required for an address',
    path: ['street'],
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

// ─────────────────────────────────────────
// Route Wizard step schemas
// ─────────────────────────────────────────

export const wizardStep1Schema = z.object({
  origin_city: z.string().min(1, 'Origin city is required'),
  origin_country: z.string().min(1, 'Origin country is required'),
  destination_city: z.string().min(1, 'Destination city is required'),
  destination_country: z.string().min(1, 'Destination country is required'),
  departure_date: z.string().min(1, 'Departure date is required').refine(
    (d) => new Date(d) >= new Date(new Date().toDateString()),
    'Departure date must be today or in the future'
  ),
  estimated_arrival_date: z.string().optional(),
}).refine(
  (data) => {
    if (!data.estimated_arrival_date) return true;
    return new Date(data.estimated_arrival_date) >= new Date(data.departure_date);
  },
  { message: 'Estimated arrival must be on or after departure date', path: ['estimated_arrival_date'] }
);

export const collectionStopSchema = z.object({
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  collection_date: z.string().optional(),
  meeting_point_url: z.string().url().optional().or(z.literal('')),
});

export const dropoffStopSchema = z.object({
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  estimated_arrival_date: z.string().optional(),
  meeting_point_url: z.string().url().optional().or(z.literal('')),
});

export const wizardStep4Schema = z
  .object({
    available_weight_kg: z.number().min(1, 'Minimum 1 kg').max(200, 'Maximum 200 kg'),
    min_weight_kg: z.number().min(0).max(200).optional(),
    max_single_package_kg: z.number().min(0).max(200).optional(),
    price_per_kg_eur: z.number().min(0.5, 'Minimum €0.50/kg').max(100, 'Maximum €100/kg'),
    notes: z.string().max(500).optional(),
    promo_enabled: z.boolean(),
    promo_discount_pct: z.number().min(1).max(99).optional(),
    promo_expires_at: z.string().optional(),
    promo_label: z.string().max(30).optional(),
    payment_methods: z.array(z.string()).min(1, 'At least one payment method required'),
    save_as_template: z.boolean(),
    template_name: z.string().max(60).optional(),
  })
  .refine((v) => v.min_weight_kg == null || v.min_weight_kg <= v.available_weight_kg, {
    message: 'Minimum weight cannot exceed available capacity',
    path: ['min_weight_kg'],
  })
  .refine((v) => v.max_single_package_kg == null || v.max_single_package_kg <= v.available_weight_kg, {
    message: 'Max single package cannot exceed available capacity',
    path: ['max_single_package_kg'],
  });

/**
 * Sender booking submit — single schema parsed at submit time, consolidating the
 * ad-hoc per-step checks. Cross-field rules that depend on the route (capacity,
 * prohibited items, accepted payment methods) are validated in the store against
 * the fetched route, not here. See the blueprint §3b.
 *
 * Launch: only cash payment types are accepted; card/PayPal is "Coming soon".
 * CASH_PAYMENT_TYPES lives in constants/paymentMethods.ts (single source of
 * truth for the payment-method catalogue) — imported above.
 */
export const bookingSubmitSchema = z.object({
  route_id: z.string().min(1),
  collection_stop_id: z.string().min(1, 'Select a collection point'),
  dropoff_stop_id: z.string().min(1, 'Select a drop-off point'),
  collection_service_id: z.string().min(1, 'Select a collection option'),
  delivery_service_id: z.string().min(1, 'Select a delivery option'),
  sender_name: z.string().min(1, 'Sender name is required'),
  sender_phone: z.string().min(5, 'Valid phone required'),
  recipient_name: z.string().min(1, 'Recipient name is required'),
  recipient_phone: z.string().min(5, 'Valid phone required'),
  package_weight_kg: z.number().min(0.1, 'Weight must be at least 0.1 kg').max(200, 'Maximum 200 kg'),
  package_category: z.string().min(1, 'Select a package type'),
  // Full multi-select category list — package_category (singular) only ever
  // held the first selection, silently dropping the rest (migration 054).
  package_categories: z.array(z.string()).min(1, 'Select a package type'),
  // Launch: cash only. Card/PayPal rejected until the future card phase.
  payment_type: z.enum(CASH_PAYMENT_TYPES, {
    message: 'Card and PayPal are coming soon — please choose a cash option',
  }),
  total_price: z.number().min(0.01),
});

export type WizardStep1Values = z.infer<typeof wizardStep1Schema>;
export type CollectionStop = z.infer<typeof collectionStopSchema>;
export type DropoffStop = z.infer<typeof dropoffStopSchema>;
export type WizardStep4Values = z.infer<typeof wizardStep4Schema>;
export type BookingSubmitValues = z.infer<typeof bookingSubmitSchema>;

export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type PackageDetailsData = z.infer<typeof packageDetailsSchema>;
export type LogisticsData = z.infer<typeof logisticsSchema>;
export type SavedAddressData = z.infer<typeof savedAddressSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type ShippingRequestData = z.infer<typeof shippingRequestSchema>;
export type RatingData = z.infer<typeof ratingSchema>;
export type DisputeData = z.infer<typeof disputeSchema>;
