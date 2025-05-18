import { Alert } from 'react-native';
import { FlightSearchParams, SerpApiFlightsResponse, FlightOffer } from '../../types/flights';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';
const serpApiKey = process.env.EXPO_PUBLIC_SERPAPI_API_KEY;

if (!serpApiKey) {
  console.error("SerpApi API Key is not set. Please update it in .env file (EXPO_PUBLIC_SERPAPI_API_KEY).");
}

// This function now fetches flights for a single, specific set of parameters
async function fetchSingleFlightSearch(
  params: FlightSearchParams
): Promise<SerpApiFlightsResponse | null> {
  if (!serpApiKey) {
    console.error("SerpApi API Key is not set.");
    Alert.alert("API Key Error", "Flights API Key is missing. Flight search will not work.");
    return null; 
  }

  const queryParamsObj: Record<string, string | undefined> = {
    engine: 'google_flights',
    api_key: serpApiKey,
    hl: params.hl || "en",
    gl: params.gl || "us",
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    outbound_date: params.outbound_date,
    // return_date is only added if it's a round trip and the date is provided
    return_date: params.type === '1' && params.return_date ? params.return_date : undefined,
    adults: (params.adults || 1).toString(),
    children: (params.children || 0).toString(),
    travel_class: (params.travel_class || '1').toString(),
    currency: params.currency || "HUF",
    type: params.type, // '1' for Round trip, '2' for One-way
    sort_by: "2", // Sort by price
    stops: params.stops, // '0' for Any, '1' for Nonstop (direct only)
  };

  // Remove undefined keys to prevent them from being added as empty query params
  Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

  const queryParams = new URLSearchParams(queryParamsObj as Record<string, string>).toString();
  const searchUrl = `${SERPAPI_BASE_URL}?${queryParams}`;
  console.log('[SerpApiFlightsService] Requesting flights:', searchUrl);

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      let errorBody: { error?: string } | null = null;
      try {
        errorBody = await response.json();
      } catch (e) { /* Ignore */ }
      console.error('[SerpApiFlightsService] Request failed:', response.status, errorBody);
      Alert.alert("Search Error", `Flight search failed with status: ${response.status}. ${errorBody?.error || 'Please try again.'}`);
      return null;
    }
    const data: SerpApiFlightsResponse = await response.json();
    if (data.error) {
      console.error('[SerpApiFlightsService] API returned an error:', data.error);
      Alert.alert("API Error", `Flight search API returned an error: ${data.error}`);
      // Return data even if there's an error string, as it might contain partial info or search_metadata
    }
    return data;
  } catch (error) {
    console.error('[SerpApiFlightsService] Error during flight search:', error);
    Alert.alert("Network Error", "An error occurred while searching for flights. Please check your connection.");
    return null;
  }
}

export async function searchFlights(params: FlightSearchParams): Promise<SerpApiFlightsResponse | null> {
  if (!serpApiKey) {
    // This check is a bit redundant as fetchSingleFlightSearch also checks, but good for early exit.
    Alert.alert("API Key Missing", "The API key for flight searches is not configured.");
    return null;
  }

  if (!params.departure_id || params.departure_id.trim() === "") {
    Alert.alert("Missing Information", "Please provide a departure airport code.");
    return null;
  }
  if (!params.arrival_id || params.arrival_id.trim() === "") {
    Alert.alert("Missing Information", "Please provide an arrival airport code.");
    return null;
  }
  if (!params.outbound_date || params.outbound_date.trim() === "") {
    Alert.alert("Missing Information", "Please provide an outbound travel date.");
    return null;
  }
  if (params.type === '1' && (!params.return_date || params.return_date.trim() === "")) {
    Alert.alert("Missing Information", "Please provide a return travel date for a round trip.");
    return null;
  }

  console.log('[SerpApiFlightsService] searchFlights called with params:', params);

  const result = await fetchSingleFlightSearch(params);

  if (result && (result.best_flights?.length || result.other_flights?.length)) {
    // Combine best_flights and other_flights from the single call
    const allFlights = [...(result.best_flights || []), ...(result.other_flights || [])];
    
    // Optional: Deduplicate if necessary, though a single API call is less likely to have duplicates
    const uniqueOffers = Array.from(new Map(allFlights.map(offer => [JSON.stringify(offer.flights) + offer.price, offer])).values());
    uniqueOffers.sort((a, b) => a.price - b.price);

    return {
        ...result, // Keep other fields like search_metadata, price_insights if present
        best_flights: uniqueOffers, // API usually returns best_flights sorted, but we ensure our combined list is
        other_flights: [] // We've combined them into best_flights
    };
  } else if (result && !result.error) {
    // Result exists, no error message from API, but no flights found
    Alert.alert("No Flights Found", "No flights were found matching your criteria.");
    return result; // Return the result which might have metadata but no flights
  } else if (!result && !params.currency) {
    // If result is null (likely due to API key error or network error handled in fetchSingleFlightSearch)
    // and no alert has been shown by fetchSingleFlightSearch specifically for currency issue
    // This specific path may not be hit if fetchSingleFlightSearch alerts first.
  }
  
  return result; // Return null or result with error message
} 