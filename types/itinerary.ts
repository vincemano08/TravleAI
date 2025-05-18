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
  dailyItinerary: DailyPlan[];
  foodAndDrinkRecommendations?: string[];
  thingsToNote?: string[];
  generalTravelAdvice?: string[];
  possibleAdjustments?: string[];
}

// Added interface for SavedTrip
export interface SavedTrip extends ParsedItinerary {
  id: string;
  savedAt: string;
} 