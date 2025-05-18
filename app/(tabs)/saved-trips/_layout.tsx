import React from 'react';
import { Stack } from 'expo-router';

export default function SavedTripsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Saved Trips' }} />
      <Stack.Screen 
        name="[id]" 
        options={{ title: 'Trip Details' }} // We can make this dynamic later if needed
      />
    </Stack>
  );
} 