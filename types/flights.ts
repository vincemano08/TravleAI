export interface AirportInfo {
  name: string;
  id: string; // Airport code
  time?: string; // Departure/Arrival time
}

export interface FlightSegment {
  departure_airport: AirportInfo;
  arrival_airport: AirportInfo;
  duration: number; // in minutes
  airplane?: string;
  airline: string;
  airline_logo?: string;
  travel_class?: string;
  flight_number?: string;
  extensions?: string[];
  ticket_also_sold_by?: string[];
  legroom?: string;
  overnight?: boolean;
  often_delayed_by_over_30_min?: boolean;
  plane_and_crew_by?: string;
}

export interface Layover {
  duration: number; // in minutes
  name: string; // Airport name for layover
  id: string; // Airport code for layover
  overnight?: boolean;
}

export interface CarbonEmissions {
  this_flight?: number;
  typical_for_this_route?: number;
  difference_percent?: number;
}

export interface FlightOffer {
  flights: FlightSegment[];
  layovers?: Layover[];
  total_duration: number; // Total minutes of all flights and layovers
  carbon_emissions?: CarbonEmissions;
  price: number; // Price in selected currency
  type: string; // e.g., "Round trip", "One way"
  airline_logo?: string; // Overall logo if mixed airlines
  extensions?: string[];
  departure_token?: string; // For round trips
  booking_token?: string; // For booking options
}

export interface PriceInsights {
  lowest_price?: number;
  price_level?: string;
  typical_price_range?: [number, number];
  price_history?: [number, number][]; // Array of [timestamp, price]
}

// This will be the main structure of the API response we care about
export interface SerpApiFlightsResponse {
  search_metadata?: { // General info about the search itself
    id?: string;
    status?: string;
    json_endpoint?: string;
    created_at?: string;
    processed_at?: string;
    google_flights_url?: string;
    raw_html_file?: string;
    total_time_taken?: number;
  };
  search_parameters?: { // Parameters used for the search
    engine?: string;
    departure_id?: string;
    arrival_id?: string;
    outbound_date?: string;
    return_date?: string;
    currency?: string;
    type?: string;
    // ... other search params
  };
  best_flights?: FlightOffer[];
  other_flights?: FlightOffer[];
  price_insights?: PriceInsights;
  // airports data can also be added if needed for display
  error?: string; // SerpApi often includes an error message at the root on failure
}

// Interface for flight search parameters we'll use in our app
export interface FlightSearchParams {
  departure_id: string; // User-provided IATA code
  arrival_id: string;   // User-provided IATA code
  outbound_date: string; // YYYY-MM-DD from user
  return_date?: string; // YYYY-MM-DD from user, optional for one-way
  adults?: number;
  children?: number;
  travel_class?: '1' | '2' | '3' | '4'; // Economy, Premium Economy, Business, First
  currency?: string; // e.g., USD, EUR, HUF
  hl?: string; // language
  gl?: string; // country
  type: '1' | '2'; // 1 for Round trip, 2 for One-way - Now mandatory from UI
  stops?: '0' | '1'; // Optional: 0-Any (allow layovers), 1-Nonstop (direct only)
} 