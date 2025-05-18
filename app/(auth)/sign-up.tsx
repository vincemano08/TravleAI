import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../core/auth/AuthContext';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUpWithEmail } = useAuth();
  const router = useRouter();

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      Alert.alert('Sign Up Failed', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await signUpWithEmail(email, password);
      if (signUpError) {
        setError(signUpError.message);
        Alert.alert('Sign Up Failed', signUpError.message);
      } else if (data.user) {
        // User is created, session might be active or require confirmation
        // AuthContext will handle navigation if session becomes active.
        // You might want to navigate to a "Please confirm your email" screen if applicable.
        Alert.alert('Sign Up Successful', 'Please check your email to confirm your account if required.');
        // If Supabase email confirmation is off, user is logged in, AuthContext navigates.
      } else if (data.session === null && !data.user && !signUpError) {
        // This case can happen if email confirmation is required.
        // The user object is in data.user, but session is null until confirmation.
        Alert.alert('Sign Up Successful', 'Please check your email to confirm your account.');
        router.replace('/(auth)/sign-in'); // Send to sign-in after showing confirmation message
      } else {
        setError('An unexpected error occurred during sign up.');
        Alert.alert('Sign Up Failed', 'An unexpected error occurred.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      Alert.alert('Sign Up Error', e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
      
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

      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
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
        onPress={handleSignUp} 
        loading={loading} 
        disabled={loading}
        style={styles.button}
      >
        Sign Up
      </Button>
      
      <View style={styles.linkContainer}>
        <Text>Already have an account? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Button mode="text">Sign In</Button>
        </Link>
      </View>
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