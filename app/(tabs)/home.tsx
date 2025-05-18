import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, TextInput, Card, Title, Avatar, ActivityIndicator, List, Chip, Paragraph, Subheading, Divider, IconButton } from 'react-native-paper';
import { useAuth } from '../../core/auth/AuthContext';
import { Link, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { generateMultimodalContent, imageUriToBase64 } from '../../core/api/geminiService';
import { Part } from '@google/generative-ai';
import { ParsedItinerary, DailyPlan, Activity, GettingAroundDetails, SavedTrip } from '../../types/itinerary';

const SAVED_TRIPS_KEY = 'saved_travel_trips';

export default function HomeScreen() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [aiResponse, setAiResponse] = useState<ParsedItinerary | string | null>(null);
  const [rawResponseForDebug, setRawResponseForDebug] = useState<string | null>(null);
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [isCurrentTripSaved, setIsCurrentTripSaved] = useState(false);

  const handleAccordionPress = (id: string) => {
    setExpandedAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePlanMyTrip = async () => {
    if (!destination.trim()) {
      Alert.alert('Missing Information', 'Please enter a destination.');
      return;
    }
    console.log('[HomeScreen] Starting trip planning for destination:', destination);
    setIsPlanning(true);
    setAiResponse(null);
    setRawResponseForDebug(null);
    setExpandedAccordions({});
    setIsCurrentTripSaved(false);

    let imageBase64: string | null = null;
    if (selectedImage && selectedImage.uri) {
      console.log('[HomeScreen] Processing selected image...');
      imageBase64 = await imageUriToBase64(selectedImage.uri);
      if (!imageBase64) {
        console.log('[HomeScreen] Failed to process image, aborting trip planning');
        setIsPlanning(false);
        return;
      }
      console.log('[HomeScreen] Image processed successfully');
    }

    const jsonStructurePrompt = `
Respond with a JSON object only. The JSON object should conform to the following TypeScript interface structure:

export interface Activity {
  time: string; // e.g., "Morning", "Afternoon", "Evening" or specific times
  description: string;
}

export interface DailyPlan {
  day: number;
  title: string;
  activities: Activity[];
}

export interface GettingAroundDetails {
  airport?: string;
  metro?: string;
  busesAndTrams?: string;
  taxis?: string;
  walking?: string;
}

export interface ParsedItinerary {
  tripTitle: string;
  duration?: string;
  bestTimeToTravel?: string;
  budget?: string;
  essentialDocuments?: string[];
  currency?: string;
  language?: string;
  gettingAround?: GettingAroundDetails;
  accommodationSuggestions?: string[];
  dailyItinerary: DailyPlan[]; // This is a required field
  foodAndDrinkRecommendations?: string[];
  thingsToNote?: string[];
  generalTravelAdvice?: string[];
  possibleAdjustments?: string[];
}

Ensure the output is a single, valid JSON object string without any surrounding text or explanations. DailyItinerary must be present.
`;

    const mainPrompt = `Plan a comprehensive travel itinerary to ${destination}. Include details such as duration, best time to travel, budget considerations, essential documents, currency, language, getting around (airport, metro, buses, taxis, walking), accommodation suggestions, a detailed daily itinerary with activities (morning, afternoon, evening), food and drink recommendations, things to note, general travel advice, and possible adjustments. ${imageBase64 ? "Consider the style and themes from the provided image for your recommendations." : "Focus on popular attractions and general travel advice."}`;

    const fullPrompt = `${mainPrompt}

${jsonStructurePrompt}`;

    console.log('[HomeScreen] Preparing prompt parts...');
    const promptParts: Part[] = [
      { text: fullPrompt },
    ];

    if (imageBase64 && selectedImage) {
      console.log('[HomeScreen] Adding image to prompt parts...');
      let mimeType = selectedImage.mimeType || 'image/jpeg';
      if (selectedImage.uri.endsWith('.png')) mimeType = 'image/png';
      else if (selectedImage.uri.endsWith('.webp')) mimeType = 'image/webp';

      promptParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      });
    }

    console.log('[HomeScreen] Sending to Gemini with structured JSON request...', {
      promptLength: fullPrompt.length,
      hasImage: !!imageBase64,
      totalParts: promptParts.length
    });

    try {
      const responseText = await generateMultimodalContent(promptParts);
      console.log('[HomeScreen] Received response from Gemini:', {
        hasResponse: !!responseText,
        responseLength: responseText?.length || 0
      });
      
      setRawResponseForDebug(responseText);

      if (responseText) {
        console.log("Raw Gemini Response:", responseText);
        try {
          const cleanedResponseText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');
          const parsed = JSON.parse(cleanedResponseText) as ParsedItinerary;
          
          if (parsed && parsed.tripTitle && Array.isArray(parsed.dailyItinerary)) {
            setAiResponse(parsed);
          } else {
            console.error("Parsed JSON does not match expected structure:", parsed);
            setAiResponse('Failed to parse AI response into a valid itinerary. Check console for raw response.');
            Alert.alert('AI Response Error', 'The AI response was not in the expected format.');
          }
        } catch (parseError) {
          console.error("Error parsing JSON response from Gemini:", parseError);
          console.error("Raw response was:", responseText);
          setAiResponse('Failed to parse the AI response. Please check the console.');
          Alert.alert('AI Response Error', 'Could not understand the AI response structure.');
        }
      } else {
        setAiResponse('Failed to get a response from AI. Please try again.');
        Alert.alert('AI Error', 'Failed to get a response from AI. Please try again.');
      }
    } catch (error) {
      console.error("Error in handlePlanMyTrip calling Gemini:", error);
      setAiResponse('An error occurred while contacting the AI.');
      Alert.alert('AI Error', 'An error occurred while contacting the AI.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSaveTrip = async () => {
    if (typeof aiResponse !== 'object' || !aiResponse) {
      Alert.alert("Error", "No trip to save.");
      return;
    }
    setIsSavingTrip(true);
    try {
      const newTripToSave: SavedTrip = {
        ...(aiResponse as ParsedItinerary), // Ensure aiResponse is treated as ParsedItinerary
        id: uuidv4(),
        savedAt: new Date().toISOString(),
      };

      const existingTripsJson = await SecureStore.getItemAsync(SAVED_TRIPS_KEY);
      let allTrips: SavedTrip[] = [];
      if (existingTripsJson) {
        allTrips = JSON.parse(existingTripsJson);
      }
      allTrips.unshift(newTripToSave); 

      await SecureStore.setItemAsync(SAVED_TRIPS_KEY, JSON.stringify(allTrips));
      Alert.alert("Success!", "Trip saved successfully. You can view it in 'Saved Trips'.");
      setIsCurrentTripSaved(true); // Correct: This is inside the 'try' block
    } catch (error) { 
      console.error("Error saving trip:", error);
      Alert.alert("Save Error", "Could not save the trip. Please try again.");
    } finally {
      setIsSavingTrip(false); // Correct: This is the only line in 'finally'
    }
  };

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
      setAiResponse(null); 
      setRawResponseForDebug(null);
      setExpandedAccordions({});
      setIsCurrentTripSaved(false);
    } 
  };

  const renderInfoItem = (title: string, content?: string | string[] | GettingAroundDetails) => {
    if (!content) return null;
    let displayContent;
    if (typeof content === 'string') {
      displayContent = <Paragraph>{content}</Paragraph>;
    } else if (Array.isArray(content)) {
      displayContent = (
        <View style={styles.chipContainer}>
          {content.map((item, index) => <Chip key={index} style={styles.chip} icon="information-outline">{item}</Chip>)}
        </View>
      );
    } else if (typeof content === 'object') {
        displayContent = Object.entries(content).map(([key, value]) => {
            if (!value) return null;
            return <List.Item key={key} title={`${key.charAt(0).toUpperCase() + key.slice(1)}:`} description={value} descriptionNumberOfLines={5} titleStyle={styles.listItemTitle}/>;
        });
    }

    return (
        <List.Section>
            <Subheading style={styles.subheading}>{title}</Subheading>
            {displayContent}
            <Divider style={{marginTop: 5}}/>
        </List.Section>
    );
  };

  const renderItinerary = () => {
    if (typeof aiResponse === 'string') {
      return <Text selectable>{aiResponse}</Text>;
    }
    if (!aiResponse || typeof aiResponse !== 'object') return null;

    const { 
        tripTitle, duration, bestTimeToTravel, budget, essentialDocuments, 
        currency, language, gettingAround, accommodationSuggestions, dailyItinerary, 
        foodAndDrinkRecommendations, thingsToNote, generalTravelAdvice, possibleAdjustments 
    } = aiResponse;

    return (
      <View style={styles.itineraryContainer}>
        <View style={styles.tripTitleContainer}>
            <Title style={styles.tripTitleStyle}>{tripTitle}</Title>
            {typeof aiResponse === 'object' && aiResponse !== null && (
                <IconButton
                    icon={isCurrentTripSaved ? "check-circle" : "content-save-outline"}
                    size={28}
                    onPress={isCurrentTripSaved ? undefined : handleSaveTrip}
                    disabled={isSavingTrip || isCurrentTripSaved || isPlanning}
                    style={styles.saveIcon}
                />
            )}
        </View>
        <Divider style={{marginBottom:10}}/>

        {renderInfoItem("Duration", duration)}
        {renderInfoItem("Best Time to Travel", bestTimeToTravel)}
        {renderInfoItem("Budget", budget)}
        {renderInfoItem("Currency", currency)}
        {renderInfoItem("Language", language)}

        <List.AccordionGroup>
          {essentialDocuments && essentialDocuments.length > 0 && (
            <List.Accordion title="Essential Documents" id="docs" expanded={expandedAccordions["docs"]} onPress={() => handleAccordionPress("docs")} left={props => <List.Icon {...props} icon="file-document-outline" />}>
              <View style={styles.chipContainerInAccordion}>
                {essentialDocuments.map((doc, index) => <Chip key={index} style={styles.chip} icon="file-check-outline">{doc}</Chip>)}
              </View>
            </List.Accordion>
          )}

          {gettingAround && Object.keys(gettingAround).length > 0 && (
            <List.Accordion title="Getting Around" id="around" expanded={expandedAccordions["around"]} onPress={() => handleAccordionPress("around")} left={props => <List.Icon {...props} icon="train-car" />}>
                {renderInfoItem("", gettingAround)} 
            </List.Accordion>
          )}
          
          {accommodationSuggestions && accommodationSuggestions.length > 0 && (
            <List.Accordion title="Accommodation Suggestions" id="accom" expanded={expandedAccordions["accom"]} onPress={() => handleAccordionPress("accom")} left={props => <List.Icon {...props} icon="bed-outline" />}>
               <View style={styles.chipContainerInAccordion}>
                {accommodationSuggestions.map((sug, index) => <Chip key={index} style={styles.chip} icon="home-city-outline">{sug}</Chip>)}
              </View>
            </List.Accordion>
          )}

          {dailyItinerary && dailyItinerary.length > 0 && (
            <List.Accordion title={`Daily Itinerary (${dailyItinerary.length} Days)`} id="daily" expanded={expandedAccordions["daily"]} onPress={() => handleAccordionPress("daily")} left={props => <List.Icon {...props} icon="calendar-check" />}>
              {dailyItinerary.map((dayPlan: DailyPlan) => (
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

          {foodAndDrinkRecommendations && foodAndDrinkRecommendations.length > 0 && (
            <List.Accordion title="Food & Drink" id="food" expanded={expandedAccordions["food"]} onPress={() => handleAccordionPress("food")} left={props => <List.Icon {...props} icon="food-variant" />}>
              <View style={styles.chipContainerInAccordion}>
                {foodAndDrinkRecommendations.map((item, index) => <Chip key={index} style={styles.chip} icon="silverware-fork-knife">{item}</Chip>)}
              </View>
            </List.Accordion>
          )}

          {thingsToNote && thingsToNote.length > 0 && (
            <List.Accordion title="Things To Note" id="notes" expanded={expandedAccordions["notes"]} onPress={() => handleAccordionPress("notes")} left={props => <List.Icon {...props} icon="note-text-outline" />}>
              {thingsToNote.map((note, index) => <List.Item key={index} title={note} titleNumberOfLines={3} left={() => <List.Icon icon="alert-circle-outline" />} />)}
            </List.Accordion>
          )}
          
          {generalTravelAdvice && generalTravelAdvice.length > 0 && (
            <List.Accordion title="General Travel Advice" id="advice" expanded={expandedAccordions["advice"]} onPress={() => handleAccordionPress("advice")} left={props => <List.Icon {...props} icon="lightbulb-on-outline" />}>
              {generalTravelAdvice.map((adv, index) => <List.Item key={index} title={adv} titleNumberOfLines={3} left={() => <List.Icon icon="information-outline" />} />)}
            </List.Accordion>
          )}

          {possibleAdjustments && possibleAdjustments.length > 0 && (
            <List.Accordion title="Possible Adjustments" id="adjust" expanded={expandedAccordions["adjust"]} onPress={() => handleAccordionPress("adjust")} left={props => <List.Icon {...props} icon="shuffle-variant" />}>
              {possibleAdjustments.map((adj, index) => <List.Item key={index} title={adj} titleNumberOfLines={3} left={() => <List.Icon icon="cogs" />} />)}
            </List.Accordion>
          )}
        </List.AccordionGroup>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text variant="headlineMedium">Welcome, {user?.email ? user.email.split('@')[0] : 'Traveler'}!</Text>
          <Button 
            icon="logout"
            mode="text" 
            onPress={signOut} 
            disabled={authLoading}
            compact
          >
            Sign Out
          </Button>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Plan Your Next Adventure</Title>
            <TextInput
              label="Where to? (e.g., Paris, Tokyo)"
              value={destination}
              onChangeText={setDestination}
              mode="outlined"
              style={styles.input}
              disabled={isPlanning}
            />
            
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Avatar.Image size={80} source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <Button onPress={() => {
                    setSelectedImage(null); 
                    setAiResponse(null); 
                    setRawResponseForDebug(null); 
                    setExpandedAccordions({}); 
                    setIsCurrentTripSaved(false);
                }} compact disabled={isPlanning}>Clear Image</Button>
              </View>
            )}

            <Button 
              icon={selectedImage ? "image-edit" : "image-plus"}
              mode="outlined" 
              onPress={handleImageUpload} 
              style={styles.uploadButton}
              disabled={isPlanning}
            >
              {selectedImage ? 'Change Inspiration Image' : 'Upload Inspiration Image'}
            </Button>
            
            <Button 
              icon="map-search-outline"
              mode="contained" 
              onPress={handlePlanMyTrip} 
              loading={isPlanning}
              disabled={isPlanning || !destination.trim() || authLoading}
              style={styles.actionButton}
            >
              Plan My Trip
            </Button>
          </Card.Content>
        </Card>

        {isPlanning && <ActivityIndicator animating={true} size="large" style={styles.loader} />}

        {(aiResponse || rawResponseForDebug) && (
          <Card style={styles.cardItineraryOutput}>
            <Card.Content>
              {typeof aiResponse === 'object' && aiResponse !== null ? (
                 <View>
                   {renderItinerary()}
                 </View>
              ) : typeof aiResponse === 'string' ? (
                <View>
                  <Title style={styles.cardTitle}>AI Response (Error/Raw):</Title>
                  <Text selectable>{aiResponse}</Text>
                </View>
              ) : rawResponseForDebug ? (
                <View>
                    <Title style={styles.cardTitle}>Raw AI Response (Debug):</Title>
                    <Text selectable>{rawResponseForDebug}</Text>
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Explore Options</Title>
            <Link href="/(tabs)/flights" asChild>
              <Button icon="airplane-search" mode="elevated" style={styles.linkButton} disabled={isPlanning}>Find Cheap Flights</Button>
            </Link>
            <Link href="/(tabs)/saved-trips" asChild>
              <Button icon="briefcase-check-outline" mode="elevated" style={styles.linkButton} disabled={isPlanning}>View Saved Trips</Button>
            </Link>
          </Card.Content>
        </Card>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 5, 
  },
  card: {
    width: '100%',
    marginBottom: 20,
  },
  cardItineraryOutput: { width: '100%', marginBottom: 20, backgroundColor: '#f9f9f9' },
  cardTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  uploadButton: {
    marginBottom: 15,
  },
  actionButton:{
    paddingVertical: 5,
    marginBottom: 10,
  },
  saveButton: {
    marginTop: 15,
    paddingVertical: 5,
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 3,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreview: {
    marginBottom: 5,
    backgroundColor: '#eee', 
  },
  loader: {
    marginVertical: 20,
  },
  itineraryContainer: { paddingHorizontal: 5 },
  tripTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 0,
  },
  tripTitleStyle: { 
    flex: 1,
    textAlign: 'center', 
    marginBottom: 10, 
    fontSize: 24 
  },
  saveIcon: {
  },
  subheading: { fontSize: 18, marginTop: 10, fontWeight: 'bold' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 5 },
  chipContainerInAccordion: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  chip: { margin: 4, backgroundColor: '#e0e0e0' },
  dayCard: { marginVertical: 8, elevation: 2 },
  dayTitle: { fontSize: 16 },
  activityItem: { paddingVertical: 2 },
  listItemTitle: { fontWeight: 'bold'}
}); 