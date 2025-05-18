import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../core/auth/AuthContext';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithEmail } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await signInWithEmail(email, password);
      if (signInError) {
        setError(signInError.message);
        Alert.alert('Sign In Failed', signInError.message);
      } else if (data.user) {
        // Navigation is handled by AuthContext, but you can add a success message if needed
        // router.replace('/(tabs)/home'); // AuthContext handles this
      } else {
        // Should not happen if signInError is not set and data.user is null
        setError('An unexpected error occurred during sign in.');
        Alert.alert('Sign In Failed', 'An unexpected error occurred.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      Alert.alert('Sign In Error', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Welcome Back!</Text>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        mode="outlined"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
      />

      {error && (
        <HelperText type="error" visible={!!error} style={styles.errorText}>
          {error}
        </HelperText>
      )}

      <Button 
        mode="contained" 
        onPress={handleSignIn} 
        loading={loading} 
        disabled={loading}
        style={styles.button}
      >
        Sign In
      </Button>
      
      <View style={styles.linkContainer}>
        <Text>Don't have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Button mode="text">Sign Up</Button>
        </Link>
      </View>

      {/* Optional: Forgot Password Link */}
      {/* 
      <View style={styles.linkContainer}>
        <Link href="/(auth)/forgot-password" asChild>
          <Button mode="text">Forgot Password?</Button>
        </Link>
      </View> 
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
  },
}); 