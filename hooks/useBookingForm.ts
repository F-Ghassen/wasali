import { useReducer, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FetchedRoute, FetchedService } from './useRouteData';

// ─── State ────────────────────────────────────────────────────────────────────

export interface BookingFormState {
  // ── Step 0: Itinerary ────────────────────────────────────────────────────────
  collectionStopId:              string | null;
  collectionStopCity:            string;
  collectionStopDate:            string;
  collectionStopLocationName:    string | null;
  collectionStopLocationAddress: string | null;
  dropoffStopId:                 string | null;
  dropoffStopCity:               string;
  dropoffStopDate:               string;
  dropoffStopLocationName:       string | null;
  dropoffStopLocationAddress:    string | null;

  // ── Step 1: Logistics ────────────────────────────────────────────────────────
  collectionServiceId:    string | null;
  collectionServiceType:  string | null;
  collectionServicePrice: number;
  deliveryServiceId:      string | null;
  deliveryServiceType:    string | null;
  deliveryServicePrice:   number;
  estimatedCollectionDate: string;

  // ── Step 2: Sender ───────────────────────────────────────────────────────────
  senderMode:              'own' | 'behalf';
  senderName:              string;
  senderCC:                string;
  senderPhone:             string;
  senderWhatsapp:          boolean;
  updateMyProfile:         boolean;
  behalfName:              string;
  behalfCC:                string;
  behalfPhone:             string;
  behalfWhatsapp:          boolean;
  saveBehalfToContacts:    boolean;
  senderAddressStreet:     string;
  senderAddressCity:       string;
  senderAddressPostalCode: string;

  // ── Step 3: Recipient ────────────────────────────────────────────────────────
  recipientName:               string;
  recipientCC:                 string;
  recipientPhone:              string;
  recipientWhatsapp:           boolean;
  recipientAddressStreet:      string;
  recipientAddressCity:        string;
  recipientAddressPostalCode:  string;
  saveRecipient:               boolean;
  driverNotes:                 string;

  // ── Step 4: Package ──────────────────────────────────────────────────────────
  weight:       string;
  packageTypes: string[];
  otherDesc:    string;
  packageDesc:  string;
  photos:       string[];

  // ── Step 5: Payment ──────────────────────────────────────────────────────────
  paymentType: 'cash_on_collection' | 'cash_on_delivery' | 'credit_debit_card' | 'paypal';
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET';               payload: Partial<BookingFormState> }
  | { type: 'RESET' }
  | { type: 'RESET_LOGISTICS' }
  | { type: 'RESET_SENDER_ADDRESS' }
  | { type: 'LOAD_DRAFT';        state: BookingFormState };

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitial(profileName?: string, profilePhone?: string): BookingFormState {
  return {
    collectionStopId:              null,
    collectionStopCity:            '',
    collectionStopDate:            '',
    collectionStopLocationName:    null,
    collectionStopLocationAddress: null,
    dropoffStopId:                 null,
    dropoffStopCity:               '',
    dropoffStopDate:               '',
    dropoffStopLocationName:       null,
    dropoffStopLocationAddress:    null,

    collectionServiceId:    null,
    collectionServiceType:  null,
    collectionServicePrice: 0,
    deliveryServiceId:      null,
    deliveryServiceType:    null,
    deliveryServicePrice:   0,
    estimatedCollectionDate: '',

    senderMode:              'own',
    senderName:              profileName ?? '',
    senderCC:                '+49',
    senderPhone:             profilePhone ?? '',
    senderWhatsapp:          false,
    updateMyProfile:         true,
    behalfName:              '',
    behalfCC:                '+49',
    behalfPhone:             '',
    behalfWhatsapp:          false,
    saveBehalfToContacts:    true,
    senderAddressStreet:     '',
    senderAddressCity:       '',
    senderAddressPostalCode: '',

    recipientName:               '',
    recipientCC:                 '+216',
    recipientPhone:              '',
    recipientWhatsapp:           false,
    recipientAddressStreet:      '',
    recipientAddressCity:        '',
    recipientAddressPostalCode:  '',
    saveRecipient:               true,
    driverNotes:                 '',

    weight:       '',
    packageTypes: [],
    otherDesc:    '',
    packageDesc:  '',
    photos:       [],

    paymentType: 'cash_on_collection',
  };
}

function reducer(state: BookingFormState, action: Action): BookingFormState {
  switch (action.type) {
    case 'SET':
      return { ...state, ...action.payload };

    case 'RESET':
      return makeInitial();

    case 'RESET_LOGISTICS':
      return {
        ...state,
        collectionServiceId:    null,
        collectionServiceType:  null,
        collectionServicePrice: 0,
        deliveryServiceId:      null,
        deliveryServiceType:    null,
        deliveryServicePrice:   0,
        estimatedCollectionDate: '',
      };

    case 'RESET_SENDER_ADDRESS':
      return {
        ...state,
        senderAddressStreet:     '',
        senderAddressCity:       '',
        senderAddressPostalCode: '',
      };

    case 'LOAD_DRAFT':
      return action.state;

    default:
      return state;
  }
}

// ─── Draft helpers ────────────────────────────────────────────────────────────

function draftKey(routeId: string) {
  return `booking_draft_${routeId}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBookingForm(
  routeId: string | null,
  profileName?: string,
  profilePhone?: string,
) {
  const [state, dispatch] = useReducer(reducer, makeInitial(profileName, profilePhone));
  const [hasDraft, setHasDraft] = React.useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialised = useRef(false);

  // ── Load draft on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (!routeId || initialised.current) return;
    initialised.current = true;

    AsyncStorage.getItem(draftKey(routeId)).then((raw) => {
      if (!raw) return;
      try {
        const draft: BookingFormState = JSON.parse(raw);
        dispatch({ type: 'LOAD_DRAFT', state: draft });
        setHasDraft(true);
      } catch {
        // corrupted draft — ignore
      }
    });
  }, [routeId]);

  // ── Persist on every SET (debounced 500ms) ────────────────────────────────

  useEffect(() => {
    if (!routeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey(routeId), JSON.stringify(state));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, routeId]);

  // ── Public actions ────────────────────────────────────────────────────────

  const set = useCallback((payload: Partial<BookingFormState>) => {
    dispatch({ type: 'SET', payload });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const resetLogistics = useCallback(() => {
    dispatch({ type: 'RESET_LOGISTICS' });
  }, []);

  const resetSenderAddress = useCallback(() => {
    dispatch({ type: 'RESET_SENDER_ADDRESS' });
  }, []);

  const clearDraft = useCallback(() => {
    if (!routeId) return;
    setHasDraft(false);
    AsyncStorage.removeItem(draftKey(routeId));
  }, [routeId]);

  // ── Step validity ─────────────────────────────────────────────────────────

  const stepValidity: Record<0 | 1 | 2 | 3 | 4 | 5, boolean> = {
    0: !!state.collectionStopId && !!state.dropoffStopId,

    1: !!state.collectionServiceId
      && !!state.deliveryServiceId,

    2: (state.senderMode === 'own'
        ? state.senderName.trim().length > 0 && state.senderPhone.trim().length >= 5
        : state.behalfName.trim().length > 0 && state.behalfPhone.trim().length >= 5)
      && (state.collectionServiceType !== 'driver_pickup'
        || (state.senderAddressStreet.trim().length > 0
          && state.senderAddressCity.trim().length > 0
          && state.senderAddressPostalCode.trim().length > 0)),

    3: state.recipientName.trim().length > 0
      && state.recipientPhone.trim().length >= 5
      // Full street address only needed for door delivery; all other service types are optional
      && (state.deliveryServiceType !== 'driver_delivery'
        || (state.recipientAddressStreet.trim().length > 0
          && state.recipientAddressCity.trim().length > 0)),

    4: parseFloat(state.weight) > 0 && state.packageTypes.length > 0,

    5: true,
  };

  // ── Build submit payload ──────────────────────────────────────────────────

  function buildSubmitPayload(
    senderId: string,
    route: FetchedRoute,
    totalPrice: number,
  ) {
    const senderFullPhone = state.senderMode === 'own'
      ? `${state.senderCC}${state.senderPhone}`
      : `${state.behalfCC}${state.behalfPhone}`;

    const activeName = state.senderMode === 'own' ? state.senderName : state.behalfName;
    const activeWhatsapp = state.senderMode === 'own' ? state.senderWhatsapp : state.behalfWhatsapp;

    return {
      route_id:                      route.id,
      sender_id:                     senderId,
      collection_stop_id:            state.collectionStopId,
      dropoff_stop_id:               state.dropoffStopId,
      collection_service_id:         state.collectionServiceId,
      delivery_service_id:           state.deliveryServiceId,
      estimated_collection_date:     state.estimatedCollectionDate || null,
      sender_name:                   activeName,
      sender_phone:                  senderFullPhone,
      sender_whatsapp:               activeWhatsapp,
      sender_address_street:         state.senderAddressStreet || null,
      sender_address_city:           state.senderAddressCity || null,
      sender_address_postal_code:    state.senderAddressPostalCode || null,
      recipient_name:                state.recipientName,
      recipient_phone:               `${state.recipientCC}${state.recipientPhone}`,
      recipient_whatsapp:            state.recipientWhatsapp,
      recipient_address_street:      state.recipientAddressStreet,
      recipient_address_city:        state.recipientAddressCity,
      recipient_address_postal_code: state.recipientAddressPostalCode,
      package_weight_kg:             parseFloat(state.weight) || 0,
      package_category:              state.packageTypes[0] ?? 'general',
      package_photos:                state.photos,
      driver_notes:                  state.driverNotes || null,
      payment_type:                  state.paymentType,
      price_eur:                     totalPrice,
      total_price:                   totalPrice,
      pickup_type:                   state.collectionServiceType === 'driver_pickup' ? 'driver_pickup' : 'sender_dropoff',
      dropoff_type:                  state.deliveryServiceType === 'recipient_collects' ? 'recipient_pickup' : 'home_delivery',
      pickup_address:                state.senderAddressStreet
                                       ? `${state.senderAddressStreet}, ${state.senderAddressPostalCode} ${state.senderAddressCity}`
                                       : null,
      dropoff_address:               state.recipientAddressStreet
                                       ? `${state.recipientAddressStreet}, ${state.recipientAddressPostalCode} ${state.recipientAddressCity}`
                                       : null,
      status:          'pending',
      payment_status:  'unpaid',
    };
  }

  return {
    state,
    set,
    reset,
    resetLogistics,
    resetSenderAddress,
    stepValidity,
    hasDraft,
    clearDraft,
    buildSubmitPayload,
  };
}

// ─── Re-export helper ─────────────────────────────────────────────────────────

export function computeTotalPrice(
  weightKg: number,
  route: Pick<FetchedRoute, 'price_per_kg_eur' | 'promotion_active' | 'promotion_percentage'>,
  collectionServicePrice: number,
  deliveryServicePrice: number,
): number {
  const effectiveRate = route.promotion_active && route.promotion_percentage
    ? route.price_per_kg_eur * (1 - route.promotion_percentage / 100)
    : route.price_per_kg_eur;

  return Math.round(
    (weightKg * effectiveRate + collectionServicePrice + deliveryServicePrice) * 100,
  ) / 100;
}

// Need React for useState in the hook
import React from 'react';
