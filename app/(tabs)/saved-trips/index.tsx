import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SavedTrip } from '../../../types/itinerary'; // Adjusted path to types

const SAVED_TRIPS_KEY = 'saved_travel_trips'; // Make sure this matches home.tsx

export default function SavedTripsScreen() {
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const tripsJson = await SecureStore.getItemAsync(SAVED_TRIPS_KEY);
      if (tripsJson) {
        const trips: SavedTrip[] = JSON.parse(tripsJson);
        // Sort by savedAt date, newest first
        trips.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        setSavedTrips(trips);
      } else {
        setSavedTrips([]);
      }
    } catch (error) {
      console.error("Error loading saved trips:", error);
      Alert.alert("Error", "Could not load saved trips.");
      setSavedTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedTrips();
    }, [loadSavedTrips])
  );

  const handleDeleteTrip = async (tripId: string) => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const updatedTrips = savedTrips.filter(trip => trip.id !== tripId);
              await SecureStore.setItemAsync(SAVED_TRIPS_KEY, JSON.stringify(updatedTrips));
              setSavedTrips(updatedTrips);
              Alert.alert("Deleted", "Trip has been deleted successfully.");
            } catch (error) {
              console.error("Error deleting trip:", error);
              Alert.alert("Error", "Could not delete the trip.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderTripItem = ({ item }: { item: SavedTrip }) => (
    <Link href={`/(tabs)/saved-trips/${item.id}`} asChild>
      <Card style={styles.card} onPress={() => { /* Navigation handled by Link */ }}>
        <Card.Content>
          <View style={styles.cardHeaderContainer}>
            <Title style={styles.cardTitle}>{item.tripTitle}</Title>
            <IconButton
              icon="delete-outline"
              size={24}
              onPress={() => handleDeleteTrip(item.id)}
              // Consider adding accessibilityLabel="Delete trip"
            />
          </View>
          <Paragraph>Duration: {item.duration || 'N/A'}</Paragraph>
          <Paragraph>Saved: {new Date(item.savedAt).toLocaleDateString()}</Paragraph>
          {/* You can add a Link here to a detailed view if you create one later */}
          {/* <Link href={`/(tabs)/saved-trips/${item.id}`} asChild>
            <Button mode="outlined" style={{marginTop: 10}}>View Details</Button>
          </Link> */}
        </Card.Content>
      </Card>
    </Link>
  );

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{marginTop: 10}}>Loading saved trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {savedTrips.length > 0 ? (
        <FlatList
          data={savedTrips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={<View style={{height:20}}/>} // Add some padding at the bottom
          refreshing={isLoading} // For pull-to-refresh if you add it
          onRefresh={loadSavedTrips} // Enable pull-to-refresh
        />
      ) : (
        <View style={styles.centeredContainer}>
            <Text style={styles.info}>No saved trips yet.</Text>
            <Button mode="text" onPress={loadSavedTrips} icon="refresh">Refresh</Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: { // For loading and empty state
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 10,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 5, // Adjusted for potentially wider content
  },
  cardHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1, // Allow title to take up space before icon
    marginRight: 8, // Space between title and icon
  },
  info: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 15,
  },
});
