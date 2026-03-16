// Web stub for @stripe/stripe-react-native — native module, not available on web.
// Metro resolves this file instead of the real package when bundling for web.
import React from 'react';
import { View } from 'react-native';

export const StripeProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, { style: { flex: 1 } }, children);

export const useStripe = () => ({
  confirmPayment: async () => ({ error: { message: 'Stripe not available on web' } }),
  initPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
  handleURLCallback: async () => false,
  createToken: async () => ({ error: { message: 'Stripe not available on web' } }),
  createPaymentMethod: async () => ({ error: { message: 'Stripe not available on web' } }),
  retrievePaymentIntent: async () => ({ error: { message: 'Stripe not available on web' } }),
  confirmSetupIntent: async () => ({ error: { message: 'Stripe not available on web' } }),
});

export const usePaymentSheet = () => ({
  loading: false,
  initPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
});

export const CardField = () => null;
export const CardForm = () => null;
export const AddToWalletButton = () => null;
export const AuBECSDebitForm = () => null;
export const ApplePayButton = () => null;
export const GooglePayButton = () => null;
