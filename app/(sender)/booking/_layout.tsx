import React from 'react';
import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="bookingCreation/index" />
      <Stack.Screen name="bookingDetail/[id]" />
    </Stack>
  );
}
