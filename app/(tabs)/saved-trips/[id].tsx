import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Subheading, Divider, List, ActivityIndicator, Appbar, Icon } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SavedTrip, GettingAroundDetails, DailyPlan, Activity } from '../../../types/itinerary';

const SAVED_TRIPS_KEY = 'saved_travel_trips';

export default function SavedTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadTripDetails = async () => {
      if (!id) {
        Alert.alert("Error", "Trip ID is missing.");
        setIsLoading(false);
        if(router.canGoBack()) router.back();
        return;
      }
      setIsLoading(true);
      try {
        const tripsJson = await SecureStore.getItemAsync(SAVED_TRIPS_KEY);
        if (tripsJson) {
          const allTrips: SavedTrip[] = JSON.parse(tripsJson);
          const foundTrip = allTrips.find(t => t.id === id);
          if (foundTrip) {
            setTrip(foundTrip);
          } else {
            Alert.alert("Error", "Saved trip not found.");
            if(router.canGoBack()) router.back();
          }
        } else {
          Alert.alert("Error", "No saved trips found.");
          if(router.canGoBack()) router.back();
        }
      } catch (error) {
        console.error("Error loading trip details:", error);
        Alert.alert("Error", "Could not load trip details.");
        if(router.canGoBack()) router.back();
      } finally {
        setIsLoading(false);
      }
    };
    loadTripDetails();
  }, [id, router]);

  const handleAccordionPress = (accordionId: string) => {
    setExpandedAccordions(prev => ({ ...prev, [accordionId]: !prev[accordionId] }));
  };

  // Reusable function to render information items (similar to home.tsx but adapted)
  const renderInfoItem = (title: string, content?: string | string[] | GettingAroundDetails, accordionId?: string) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;

    let displayContent;
    const accordionIcon = getIconForTitle(title);
    const chipItemIconName = getChipIconName(title); // Get the icon name (string)

    if (typeof content === 'string') {
      displayContent = <Paragraph style={styles.paragraphContent}>{content}</Paragraph>;
    } else if (Array.isArray(content)) {
      displayContent = (
        <View style={styles.chipContainerInAccordion}>
          {content.map((item, index) => (
            <View key={index} style={styles.customChip}>
              {chipItemIconName && (
                <Icon
                  source={chipItemIconName}
                  size={18} // Adjust size as desired for the icon in the chip
                />
              )}
              <Text style={styles.customChipText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    } else if (typeof content === 'object') { // For GettingAroundDetails
        displayContent = Object.entries(content).map(([key, value]) => {
            if (!value) return null;
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return <List.Item key={key} title={`${formattedKey}:`} description={value} descriptionNumberOfLines={5} titleStyle={styles.listItemTitle}/>;
        });
    }

    if (accordionId) {
        return (
            <List.Accordion
                title={title}
                id={accordionId}
                expanded={expandedAccordions[accordionId]}
                onPress={() => handleAccordionPress(accordionId)}
                left={props => <List.Icon {...props} icon={accordionIcon} />}
            >
                {displayContent}
            </List.Accordion>
        );
    }

    return (
        <List.Section>
            <Subheading style={styles.subheading}>{title}</Subheading>
            {displayContent}
            <Divider style={{marginTop: 10, marginBottom: 5}}/>
        </List.Section>
    );
  };
  
  // Helper to get icons for accordion titles (customize as needed)
  const getIconForTitle = (title: string) => {
    if (title.includes("Documents")) return "file-document-outline";
    if (title.includes("Around")) return "train-car";
    if (title.includes("Accommodation")) return "bed-outline";
    if (title.includes("Itinerary")) return "calendar-check";
    if (title.includes("Food")) return "food-variant";
    if (title.includes("Note")) return "note-text-outline";
    if (title.includes("Advice")) return "lightbulb-on-outline";
    if (title.includes("Adjustments")) return "shuffle-variant";
    return "information-outline"; 
  };

  // Helper to get simpler, more reliable icons specifically for Chips
  const getChipIconName = (title: string) => {
    if (title.includes("Documents")) return "file"; // Simpler version
    if (title.includes("Around")) return "train";    // Simpler version
    if (title.includes("Accommodation")) return "bed";   // Simpler version
    if (title.includes("Food")) return "food";        // Simpler version
    if (title.includes("Note")) return "clipboard-text"; // Simpler, often available
    if (title.includes("Advice")) return "lightbulb"; // Simpler version
    if (title.includes("Adjustments")) return "cog"; // Simpler (cogs for settings/adjustments)
    return "information"; // Simpler version
  };


  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator animating={true} size="large" /><Text>Loading trip...</Text></View>;
  }

  if (!trip) {
    return <View style={styles.centered}><Text>Trip not found or could not be loaded.</Text></View>;
  }

  // Dynamically set the title of the screen
  // Note: For Expo Router v3, Stack.Screen options might need to be in _layout.tsx for full effect
  // or use router.setOptions for more dynamic scenarios if title depends on loaded `trip` data.

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Stack.Screen options={{ title: trip.tripTitle || 'Trip Details' }} />
        <Card style={styles.card}>
            <Card.Content>
                <Title style={styles.mainTitle}>{trip.tripTitle}</Title>
                <Paragraph style={styles.savedDate}>Saved on: {new Date(trip.savedAt).toLocaleString()}</Paragraph>
                <Divider style={styles.divider}/>

                {renderInfoItem("Duration", trip.duration)}
                {renderInfoItem("Best Time to Travel", trip.bestTimeToTravel)}
                {renderInfoItem("Budget", trip.budget)}
                {renderInfoItem("Currency", trip.currency)}
                {renderInfoItem("Language", trip.language)}

                <List.AccordionGroup>
                    {renderInfoItem("Essential Documents", trip.essentialDocuments, "docs")}
                    {renderInfoItem("Getting Around", trip.gettingAround, "around")}
                    {renderInfoItem("Accommodation Suggestions", trip.accommodationSuggestions, "accom")}

                    {trip.dailyItinerary && trip.dailyItinerary.length > 0 && (
                        <List.Accordion 
                            title={`Daily Itinerary (${trip.dailyItinerary.length} Days)`} 
                            id="daily" 
                            expanded={expandedAccordions["daily"]} 
                            onPress={() => handleAccordionPress("daily")} 
                            left={props => <List.Icon {...props} icon="calendar-check" />}
                        >
                        {trip.dailyItinerary.map((dayPlan: DailyPlan) => (
                            <Card key={dayPlan.day} style={styles.dayCard}>
                            <Card.Content>
                                <Title style={styles.dayTitle}>Day {dayPlan.day}: {dayPlan.title}</Title>
                                {dayPlan.activities.map((activity: Activity, index: number) => (
                                <List.Item 
                                    key={index} 
                                    title={`${activity.time}: ${activity.description}`} 
                                    titleNumberOfLines={4} 
                                    left={() => <List.Icon icon="circle-small" style={{marginRight:-10}}/>}
                                    style={styles.activityItem}
                                />
                                ))}
                            </Card.Content>
                            </Card>
                        ))}
                        </List.Accordion>
                    )}

                    {renderInfoItem("Food & Drink Recommendations", trip.foodAndDrinkRecommendations, "food")}
                    {renderInfoItem("Things To Note", trip.thingsToNote, "notes")}
                    {renderInfoItem("General Travel Advice", trip.generalTravelAdvice, "advice")}
                    {renderInfoItem("Possible Adjustments", trip.possibleAdjustments, "adjust")}
                </List.AccordionGroup>
            </Card.Content>
        </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    elevation: 2,
  },
  mainTitle: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 5,
  },
  savedDate: {
    fontSize: 12,
    textAlign: 'center',
    color: 'gray',
    marginBottom: 15,
  },
  divider: {
    marginBottom: 15,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  paragraphContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  chipContainerInAccordion: { // This container holds our custom chips
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
    alignItems: 'flex-start', // Align items to the start if they wrap to new lines
  },
  customChip: {
    flexDirection: 'row',    // Align icon and text horizontally
    alignItems: 'center',    // Vertically center icon with the text block
    backgroundColor: '#e0e0e0', // Chip background color
    borderRadius: 16,        // Rounded corners for chip look
    paddingVertical: 8,      // Vertical padding inside the chip
    paddingHorizontal: 12,   // Horizontal padding inside the chip
    margin: 4,               // Margin around each chip
  },
  customChipText: {
    fontSize: 13,
    lineHeight: 18,          // Line height for readability
    color: 'rgba(0,0,0,0.87)', // Default text color, adjust as needed
    flexShrink: 1, 
    marginLeft: 6, // Added marginLeft to create space from icon
  },
  listItemTitle: {
    fontWeight: 'bold',
  },
  dayCard: {
    marginVertical: 8,
    marginHorizontal: 0,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  activityItem: {
    paddingVertical: 2,
    paddingLeft: 0,
  },
});