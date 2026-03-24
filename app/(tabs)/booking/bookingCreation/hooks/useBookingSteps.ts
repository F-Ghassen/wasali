import { useState, useEffect, useMemo } from 'react';
import type { FetchedStop, FetchedService } from '@/hooks/useRouteData';

interface City {
  id: string;
  name: string;
}

interface UseBookingStepsParams {
  cities: City[];
  collectionStops: FetchedStop[];
  dropoffStops: FetchedStop[];
  collectionServicesForStop: (stopId: string) => FetchedService[];
  deliveryServices: FetchedService[];
  fs: any;
  setField: (fields: any) => void;
  resetLogistics: () => void;
  resetSenderAddress: () => void;
  hasDraft: boolean;
}

export function useBookingSteps({
  cities,
  collectionStops,
  dropoffStops,
  collectionServicesForStop,
  deliveryServices,
  fs,
  setField,
  resetLogistics,
  resetSenderAddress,
  hasDraft,
}: UseBookingStepsParams) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const getCityName = useMemo(
    () => (cityId: string) => cities.find((c) => c.id === cityId)?.name || cityId,
    [cities],
  );

  const stopServices = fs.collectionStopId
    ? collectionServicesForStop(fs.collectionStopId)
    : [];

  // Show draft prompt once when draft detected
  useEffect(() => {
    if (hasDraft) setShowDraftPrompt(true);
  }, [hasDraft]);

  // Auto-select single collection stop
  useEffect(() => {
    if (collectionStops.length === 1 && !fs.collectionStopId) {
      handleSelectCollectionStop(collectionStops[0]);
    }
  }, [collectionStops.length]);

  // Auto-select single dropoff stop
  useEffect(() => {
    if (dropoffStops.length === 1 && !fs.dropoffStopId) {
      handleSelectDropoffStop(dropoffStops[0]);
    }
  }, [dropoffStops.length]);

  // Lock senderAddressCity to collectionStopCity
  useEffect(() => {
    if (fs.collectionStopCity && fs.senderAddressCity !== fs.collectionStopCity) {
      setField({ senderAddressCity: fs.collectionStopCity });
    }
  }, [fs.collectionStopCity, fs.senderAddressCity]);

  // Lock recipientAddressCity to dropoffStopCity
  useEffect(() => {
    if (fs.dropoffStopCity && fs.recipientAddressCity !== fs.dropoffStopCity) {
      setField({ recipientAddressCity: fs.dropoffStopCity });
    }
  }, [fs.dropoffStopCity, fs.recipientAddressCity]);

  // Auto-select single collection service
  useEffect(() => {
    if (stopServices.length === 1 && !fs.collectionServiceId) {
      setField({
        collectionServiceId: stopServices[0].id,
        collectionServiceType: stopServices[0].service_type,
        collectionServicePrice: stopServices[0].price_eur,
      });
    }
  }, [fs.collectionStopId, stopServices.length]);

  // Auto-select single delivery service
  useEffect(() => {
    if (deliveryServices.length === 1 && !fs.deliveryServiceId) {
      setField({
        deliveryServiceId: deliveryServices[0].id,
        deliveryServiceType: deliveryServices[0].service_type,
        deliveryServicePrice: deliveryServices[0].price_eur,
      });
    }
  }, [deliveryServices.length]);

  function handleSelectCollectionStop(stop: FetchedStop) {
    const prevStopId = fs.collectionStopId;
    const cityName = getCityName(stop.city_id);
    setField({
      collectionStopId: stop.id,
      collectionStopCity: cityName,
      collectionStopDate: stop.arrival_date ?? '',
      collectionStopLocationName: stop.location_name,
      collectionStopLocationAddress: stop.location_address,
      senderAddressCity: cityName,
    });
    if (prevStopId && prevStopId !== stop.id) resetLogistics();
  }

  function handleSelectDropoffStop(stop: FetchedStop) {
    const cityName = getCityName(stop.city_id);
    setField({
      dropoffStopId: stop.id,
      dropoffStopCity: cityName,
      dropoffStopDate: stop.arrival_date ?? '',
      dropoffStopLocationName: stop.location_name,
      dropoffStopLocationAddress: stop.location_address,
      recipientAddressCity: cityName,
    });
  }

  function handleSelectCollectionService(id: string) {
    const svc = stopServices.find((s) => s.id === id);
    const prevType = fs.collectionServiceType;
    setField({
      collectionServiceId: id,
      collectionServiceType: svc?.service_type ?? null,
      collectionServicePrice: svc?.price_eur ?? 0,
    });
    if (prevType === 'driver_pickup' && svc?.service_type !== 'driver_pickup') {
      resetSenderAddress();
    }
  }

  function handleSelectDeliveryService(id: string) {
    const svc = deliveryServices.find((s) => s.id === id);
    setField({
      deliveryServiceId: id,
      deliveryServiceType: svc?.service_type ?? null,
      deliveryServicePrice: svc?.price_eur ?? 0,
    });
  }

  return {
    currentStep,
    setCurrentStep,
    showDraftPrompt,
    setShowDraftPrompt,
    stopServices,
    handleSelectCollectionStop,
    handleSelectDropoffStop,
    handleSelectCollectionService,
    handleSelectDeliveryService,
  };
}
