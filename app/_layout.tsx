import React from 'react';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../core/auth/AuthContext'; // Path to your AuthContext

// Define your theme (optional, can be expanded)
const theme = {
  ...DefaultTheme,
  // Add custom colors, fonts, etc.
  colors: {
    ...DefaultTheme.colors,
    primary: 'tomato',
    accent: 'yellow',
  },
};

// This component will handle auth state to show Auth or App stacks
function RootNavigationLogic() {
  const { user, loading } = useAuth();

  // The redirection logic is now primarily within AuthProvider's useEffect.
  // This component just ensures the correct stack is rendered based on router state.
  // If loading, you might want to show a splash screen or loading indicator here,
  // but often the router handles this before AuthProvider hydration if structured well.

  return (
    <Stack initialRouteName="(auth)"> 
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <RootNavigationLogic />
      </PaperProvider>
    </AuthProvider>
  );
} 