import { Alert } from 'react-native';
import { FlightSearchParams, SerpApiFlightsResponse } from '../../types/flights';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';
const serpApiKey = process.env.EXPO_PUBLIC_SERPAPI_API_KEY;

if (!serpApiKey) {
  console.error("SerpApi API Key is not set. Please check your .env file (for local dev) or EAS secrets (for builds).");
}

// This function now fetches flights for a single, specific set of parameters
async function fetchSingleFlightSearch(
  params: FlightSearchParams
): Promise<SerpApiFlightsResponse | null> {
  if (!serpApiKey) {

    console.error("SerpApi API Key is not available at runtime.");
    Alert.alert("API Key Error", "Flights API Key is missing. Flight search will not work. Please contact support if this is a production build.");
    return null;
  }

  const queryParamsObj: Record<string, string | undefined> = {
    engine: 'google_flights',
    api_key: serpApiKey, // The key is used here
    hl: params.hl || "en",
    gl: params.gl || "us",
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    outbound_date: params.outbound_date,
    return_date: params.type === '1' && params.return_date ? params.return_date : undefined,
    adults: (params.adults || 1).toString(),
    children: (params.children || 0).toString(),
    travel_class: (params.travel_class || '1').toString(),
    currency: params.currency || "HUF",
    type: params.type,
    sort_by: "2",
    stops: params.stops,
  };

  Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

  const queryParams = new URLSearchParams(queryParamsObj as Record<string, string>).toString();
  const searchUrl = `${SERPAPI_BASE_URL}?${queryParams}`;
  console.log('[SerpApiFlightsService] Requesting flights:', searchUrl); // Be mindful of logging URLs with API keys in production logs

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
    Alert.alert("API Key Missing", "The API key for flight searches is not configured. Please contact support.");
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
    const allFlights = [...(result.best_flights || []), ...(result.other_flights || [])];
    const uniqueOffers = Array.from(new Map(allFlights.map(offer => [JSON.stringify(offer.flights) + offer.price, offer])).values());
    uniqueOffers.sort((a, b) => a.price - b.price);

    return {
        ...result,
        best_flights: uniqueOffers,
        other_flights: []
    };
  } else if (result && !result.error) {
    Alert.alert("No Flights Found", "No flights were found matching your criteria.");
    return result;
  }
  // If result is null, an error alert would have been shown by fetchSingleFlightSearch
  return result;
}