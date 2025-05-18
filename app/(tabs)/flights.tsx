import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, Platform } from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Card,
  Title,
  ActivityIndicator,
  List,
  Divider,
  RadioButton,
  Subheading,
  Caption,
  Avatar,
  Chip,
  Switch,
  SegmentedButtons,
  Portal,
  Dialog,
  Paragraph,
} from 'react-native-paper';
import { FlightSearchParams, SerpApiFlightsResponse, FlightOffer, FlightSegment, Layover } from '../../types/flights';
import { searchFlights } from '../../core/api/serpapiFlightsService';
import { getIataCodeForCity } from '../../core/api/geminiService'; // Import Gemini service for IATA
import DateTimePickerModal from "react-native-modal-datetime-picker"; // Assuming you'll install this
import { useAuth } from '../../core/auth/AuthContext';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format Date object to YYYY-MM-DD string
const formatDate = (date: Date | undefined): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ListHeaderProps {
  departureCity: string;
  setDepartureCity: (text: string) => void;
  arrivalCity: string;
  setArrivalCity: (text: string) => void;
  departureId: string;
  arrivalId: string;
  tripType: '1' | '2';
  setTripType: (type: '1' | '2') => void;
  outboundDate: Date | undefined;
  returnDate: Date | undefined;
  allowLayovers: boolean;
  setAllowLayovers: (allow: boolean) => void;
  isGettingIata: boolean;
  isLoading: boolean;
  searchResults: SerpApiFlightsResponse | null;
  getAndSetIata: (city: string, type: 'departure' | 'arrival') => Promise<void>;
  showOutboundDatePicker: () => void;
  showReturnDatePicker: () => void;
  handleSearchFlights: () => void;
  isOutboundDatePickerVisible: boolean;
  hideOutboundDatePicker: () => void;
  handleOutboundConfirm: (date: Date) => void;
  isReturnDatePickerVisible: boolean;
  hideReturnDatePicker: () => void;
  handleReturnConfirm: (date: Date) => void;
}

const MemoizedListHeader = React.memo(({
  departureCity, setDepartureCity, arrivalCity, setArrivalCity,
  departureId, arrivalId, tripType, setTripType,
  outboundDate, returnDate, allowLayovers, setAllowLayovers,
  isGettingIata, isLoading, searchResults,
  getAndSetIata, showOutboundDatePicker, showReturnDatePicker, handleSearchFlights,
  isOutboundDatePickerVisible, hideOutboundDatePicker, handleOutboundConfirm,
  isReturnDatePickerVisible, hideReturnDatePicker, handleReturnConfirm
}: ListHeaderProps) => {
  // console.log('ListHeader rendering'); // For debug
  return (
    <>
      <Card style={styles.searchCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>Search Flights</Title>
          
          <View style={styles.inputRow}>
            <TextInput
              key="departure-city-input"
              label="Departure City"
              value={departureCity}
              onChangeText={setDepartureCity}
              style={styles.inputFlex}
              mode="outlined"
              disabled={isGettingIata}
            />
            <Button onPress={() => getAndSetIata(departureCity, 'departure')} mode="contained-tonal" style={styles.iataButton} loading={isGettingIata} disabled={isGettingIata || !departureCity.trim()}>Get Code</Button>
          </View>
          {departureId && <Text style={styles.iataText}>Departure Airport: {departureId}</Text>}

          <View style={styles.inputRow}>
            <TextInput
              key="arrival-city-input"
              label="Arrival City"
              value={arrivalCity}
              onChangeText={setArrivalCity}
              style={styles.inputFlex}
              mode="outlined"
              disabled={isGettingIata}
            />
            <Button onPress={() => getAndSetIata(arrivalCity, 'arrival')} mode="contained-tonal" style={styles.iataButton} loading={isGettingIata} disabled={isGettingIata || !arrivalCity.trim()}>Get Code</Button>
          </View>
          {arrivalId && <Text style={styles.iataText}>Arrival Airport: {arrivalId}</Text>}

          <SegmentedButtons
            value={tripType}
            onValueChange={setTripType}
            buttons={[
              { value: '1', label: 'Round Trip' },
              { value: '2', label: 'One-way' },
            ]}
            style={styles.segmentedButton}
          />

          <Button icon="calendar" onPress={showOutboundDatePicker} mode="outlined" style={styles.dateButton}>
            Outbound: {outboundDate ? formatDate(outboundDate) : 'Select Date'}
          </Button>
          {tripType === '1' && (
            <Button icon="calendar" onPress={showReturnDatePicker} mode="outlined" style={styles.dateButton}>
              Return: {returnDate ? formatDate(returnDate) : 'Select Date'}
            </Button>
          )}

          <DateTimePickerModal
            isVisible={isOutboundDatePickerVisible}
            mode="date"
            onConfirm={handleOutboundConfirm}
            onCancel={hideOutboundDatePicker}
            minimumDate={new Date()} 
          />
          <DateTimePickerModal
            isVisible={isReturnDatePickerVisible}
            mode="date"
            onConfirm={handleReturnConfirm}
            onCancel={hideReturnDatePicker}
            minimumDate={outboundDate || new Date()} 
          />

          <View style={styles.switchContainer}>
            <Text>Allow Layovers?</Text>
            <Switch value={allowLayovers} onValueChange={setAllowLayovers} />
          </View>

          <Button 
            mode="contained" 
            onPress={handleSearchFlights} 
            loading={isLoading || isGettingIata}
            disabled={isLoading || isGettingIata || !departureId || !arrivalId}
            style={styles.searchButton}
            icon="airplane-search"
          >
            Search Flights
          </Button>
        </Card.Content>
      </Card>

      {isLoading && <ActivityIndicator animating={true} size="large" style={styles.loader} />}

      {searchResults && searchResults.error && (
          <Card style={styles.resultsCard}><Card.Content><Text style={styles.errorText}>{searchResults.error}</Text></Card.Content></Card>
      )}
      
      {searchResults && searchResults.best_flights && searchResults.best_flights.length > 0 && !searchResults.error && !isLoading && (
        <Title style={styles.resultsTitle}>Flight Results</Title>
      )}
    </>
  );
});

interface ListEmptyProps {
  isLoading: boolean;
  searchResults: SerpApiFlightsResponse | null;
}

const MemoizedListEmpty = React.memo(({ isLoading, searchResults }: ListEmptyProps) => {
  // console.log('ListEmpty rendering'); // For debug
  if (!isLoading && searchResults && !searchResults.error && (!searchResults.best_flights || searchResults.best_flights.length === 0)) {
    return (
      <Card style={styles.resultsCard}><Card.Content><Text style={styles.infoText}>No flights found for your criteria.</Text></Card.Content></Card>
    );
  }
  return null; 
});

export default function FlightsScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingIata, setIsGettingIata] = useState(false);
  const [searchResults, setSearchResults] = useState<SerpApiFlightsResponse | null>(null);

  // Search Form State
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [departureId, setDepartureId] = useState(''); // IATA code
  const [arrivalId, setArrivalId] = useState('');     // IATA code
  const [tripType, setTripType] = useState<'1' | '2'>('1'); // '1' Round trip, '2' One-way
  const [outboundDate, setOutboundDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default return 7 days later
    return date;
  });
  const [allowLayovers, setAllowLayovers] = useState(true); // true = '0' (any stops), false = '1' (nonstop)

  // Date Picker State
  const [isOutboundDatePickerVisible, setOutboundDatePickerVisibility] = useState(false);
  const [isReturnDatePickerVisible, setReturnDatePickerVisibility] = useState(false);

  const showOutboundDatePicker = useCallback(() => setOutboundDatePickerVisibility(true), []);
  const hideOutboundDatePicker = useCallback(() => setOutboundDatePickerVisibility(false), []);
  const handleOutboundConfirm = useCallback((date: Date) => {
    setOutboundDate(date);
    if (tripType === '1' && returnDate && date > returnDate) {
      const newReturnDate = new Date(date);
      newReturnDate.setDate(date.getDate() + 1);
      setReturnDate(newReturnDate);
    }
    hideOutboundDatePicker();
  }, [tripType, returnDate, hideOutboundDatePicker]);

  const showReturnDatePicker = useCallback(() => setReturnDatePickerVisibility(true), []);
  const hideReturnDatePicker = useCallback(() => setReturnDatePickerVisibility(false), []);
  const handleReturnConfirm = useCallback((date: Date) => {
    setReturnDate(date);
    hideReturnDatePicker();
  }, [hideReturnDatePicker]);
  
  const getAndSetIata = useCallback(async (city: string, type: 'departure' | 'arrival') => {
    if (!city.trim()) return;
    setIsGettingIata(true);
    try {
      const iata = await getIataCodeForCity(city);
      if (iata) {
        if (type === 'departure') setDepartureId(iata);
        else setArrivalId(iata);
      } else {
        Alert.alert("IATA Not Found", `Could not find an airport code for ${city}. Please try a major city or check spelling.`);
        if (type === 'departure') setDepartureId('');
        else setArrivalId('');
      }
    } catch (error) {
      Alert.alert("IATA Error", "Failed to fetch airport code.");
    } finally {
      setIsGettingIata(false);
    }
  }, []);

  const handleSearchFlights = useCallback(async () => {
    if (!departureId) {
      Alert.alert('Missing Information', 'Please provide and confirm a departure city/airport code.');
      return;
    }
    if (!arrivalId) {
      Alert.alert('Missing Information', 'Please provide and confirm an arrival city/airport code.');
      return;
    }
    if (!outboundDate) {
      Alert.alert('Missing Information', 'Please select an outbound date.');
      return;
    }
    if (tripType === '1' && !returnDate) {
      Alert.alert('Missing Information', 'Please select a return date for a round trip.');
      return;
    }
    if (tripType === '1' && returnDate && outboundDate && returnDate < outboundDate) {
        Alert.alert('Invalid Dates', 'Return date cannot be before outbound date.');
        return;
    }

    setIsLoading(true);
    setSearchResults(null);

    const params: FlightSearchParams = {
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: formatDate(outboundDate),
      return_date: tripType === '1' && returnDate ? formatDate(returnDate) : undefined,
      type: tripType,
      stops: allowLayovers ? '0' : '1', 
      currency: 'HUF', 
      adults: 1, 
    };

    const results = await searchFlights(params);
    setSearchResults(results);
    setIsLoading(false);
  }, [departureId, arrivalId, outboundDate, returnDate, tripType, allowLayovers]);

  const renderFlightSegment = (segment: FlightSegment, index: number) => {
    let legroomDisplay = null;
    const hasApiProvidedLegroomExtension = segment.extensions?.some(ext => ext.toLowerCase().includes('legroom'));

    if (segment.legroom && !hasApiProvidedLegroomExtension) {
      const legroomValue = String(segment.legroom).match(/(\d+(\.\d+)?)/);
      if (legroomValue && legroomValue[1]) {
        legroomDisplay = <Chip icon="seat-recline-normal" style={styles.chip}>Legroom: {legroomValue[1]} cm</Chip>;
      } else if (typeof segment.legroom === 'string' && segment.legroom.trim() !== "") {
        legroomDisplay = <Chip icon="seat-recline-normal" style={styles.chip}>{segment.legroom}</Chip>;
      }
    }

    const processedExtensionChips = segment.extensions?.map((extText, i) => {
      let currentText = extText;
      const inchUnitPattern = /(\d+(?:\.\d+)?)\s*(in(?:ch(?:es)?)?|")/gi;
      
      currentText = currentText.replace(inchUnitPattern, (match, numberPart, unitPart) => {
        return `${numberPart} cm`; 
      });
      return <Chip key={`ext-${i}`} style={styles.chip}>{currentText}</Chip>;
    }) || [];

    return (
    <View key={index} style={styles.segmentContainer}>
      <View style={styles.segmentHeader}>
        <Avatar.Image size={24} source={{ uri: segment.airline_logo }} style={styles.airlineLogo} onError={() => console.log("Error loading image")}/>
        <Text style={styles.airlineName}>{segment.airline}</Text>
        <Text style={styles.flightInfo}>{segment.flight_number} ({segment.airplane})</Text>
      </View>
      <View style={styles.airportInfoContainer}>
        <View style={styles.airportDetail}>
          <Text style={styles.airportCode}>{segment.departure_airport.id}</Text>
          <Text>{segment.departure_airport.name}</Text>
          <Text style={styles.timeText}>Departs: {segment.departure_airport.time || 'N/A'}</Text>
        </View>
        <List.Icon icon="arrow-right-thin" style={styles.arrowIcon} />
        <View style={styles.airportDetailRight}>
          <Text style={styles.airportCode}>{segment.arrival_airport.id}</Text>
          <Text textBreakStrategy='simple'>{segment.arrival_airport.name}</Text>
          <Text style={styles.timeText}>Arrives: {segment.arrival_airport.time || 'N/A'}</Text>
        </View>
      </View>
      <Paragraph>Duration: {Math.floor(segment.duration / 60)}h {segment.duration % 60}m. Class: {segment.travel_class || 'N/A'}</Paragraph>
      {legroomDisplay}
      {processedExtensionChips}
    </View>
  )};

  const renderLayover = (layover: Layover, index: number) => (
    <View key={`layover-${index}`} style={styles.layoverContainer}>
      <List.Icon icon="clock-outline" />
      <Text style={styles.layoverText}>Layover at {layover.name} ({layover.id}) for {Math.floor(layover.duration / 60)}h {layover.duration % 60}m</Text>
      {layover.overnight && <Chip icon="weather-night" style={[styles.chip, styles.overnightChip]}>Overnight</Chip>}
    </View>
  );

  const renderFlightOffer = ({ item }: { item: FlightOffer }) => {
    // Log the flights array for round trip offers to debug
    if (item.type && item.type.toLowerCase().includes('round')) { 
      console.log(`[Round Trip Offer - Flights Array for offer with price ${item.price}]:`, JSON.stringify(item.flights, null, 2));
    }

    const isRoundTrip = item.type && item.type.toLowerCase().includes('round');
    let foundReturnJourneyStart = false; // Flag to ensure "Return Flight" header is printed only once

    return (
    <Card style={styles.offerCard}>
      <Card.Content>
        <Title>Price: {item.price.toLocaleString()} HUF</Title>
        <Paragraph>Total Duration: {Math.floor(item.total_duration / 60)}h {item.total_duration % 60}m</Paragraph>
        
        {/* Conditionally render "Outbound Flight" header only for round trips with flights */}
        {isRoundTrip && item.flights && item.flights.length > 0 && (
            <Subheading style={styles.segmentTitle}>Outbound Flight</Subheading>
        )}
        {/* For one-way trips, segments will list without special "Outbound/Return" headers */}

        {item.flights.map((segment, index) => {
          let showReturnHeaderForThisSegment = false;

          // Check for the start of the return journey
          if (isRoundTrip && !foundReturnJourneyStart) {
            // `departureId` and `arrivalId` are from the FlightsScreen state,
            // representing the overall trip's origin and destination.
            if (segment.departure_airport.id === arrivalId && 
                segment.arrival_airport.id === departureId) {
              showReturnHeaderForThisSegment = true;
              foundReturnJourneyStart = true; // Mark that we've found and will label the return journey
            }
          }

          return (
            <React.Fragment key={`segment-frag-${index}-${segment.flight_number || segment.departure_airport.id}`}>
              {showReturnHeaderForThisSegment && (
                <>
                  <Divider style={styles.segmentDivider} />
                  <Subheading style={styles.segmentTitle}>Return Flight</Subheading>
                </>
              )}
              {renderFlightSegment(segment, index)}
              {/* A layover at item.layovers[index] is after flights[index] and before flights[index+1] */}
              {item.layovers && item.layovers[index] && renderLayover(item.layovers[index], index)}
            </React.Fragment>
          );
        })}
        
        {/* The primary loop now handles layovers correctly based on their index relative to flight segments. 
            The "extra layover" block has been removed to simplify and fix a linter error,
            assuming layovers are consistently "sandwiched" as per API documentation.
        */}

        {item.carbon_emissions && (
          <Text style={styles.carbonInfo}>
            Carbon Emissions: {typeof item.carbon_emissions.this_flight === 'number' ? (item.carbon_emissions.this_flight / 1000).toFixed(1) + 'kg' : 'N/A'} 
            (Typical: {typeof item.carbon_emissions.typical_for_this_route === 'number' ? (item.carbon_emissions.typical_for_this_route / 1000).toFixed(1) + 'kg' : 'N/A'}, 
            Diff: {item.carbon_emissions.difference_percent}%)
          </Text>
        )}
        {item.extensions && item.extensions.map((ext, i) => <Chip key={`offer-ext-${i}`} style={styles.chip}>{ext}</Chip>)}
      </Card.Content>
    </Card>
  )};

  // Use useMemo for the props objects to further stabilize them if needed,
  // but individual props passed to memoized children should be sufficient if callbacks are memoized.
  const listHeaderProps = {
    departureCity, setDepartureCity, arrivalCity, setArrivalCity,
    departureId, arrivalId, tripType, setTripType,
    outboundDate, returnDate, allowLayovers, setAllowLayovers,
    isGettingIata, isLoading, searchResults,
    getAndSetIata, showOutboundDatePicker, showReturnDatePicker, handleSearchFlights,
    isOutboundDatePickerVisible, hideOutboundDatePicker, handleOutboundConfirm,
    isReturnDatePickerVisible, hideReturnDatePicker, handleReturnConfirm
  };

  const listEmptyProps = {
    isLoading, searchResults
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      data={searchResults?.best_flights || []}
      renderItem={renderFlightOffer}
      keyExtractor={(item, index) => `flight-${index}-${item.booking_token || item.departure_token}`}
      ListHeaderComponent={<MemoizedListHeader {...listHeaderProps} />}
      ListEmptyComponent={<MemoizedListEmpty {...listEmptyProps} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 10,
  },
  searchCard: {
    marginBottom: 20,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputFlex: {
    flex: 1,
    marginRight: 8,
  },
  iataButton: {
    justifyContent: 'center',
  },
  iataText: {
    marginLeft: 10,
    marginBottom: 10,
    fontSize: 12,
    color: 'grey',
  },
  segmentedButton: {
    marginVertical: 10,
  },
  dateButton: {
    marginVertical: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginVertical: 5,
  },
  searchButton: {
    marginTop: 15,
    paddingVertical: 5,
  },
  loader: {
    marginVertical: 20,
  },
  resultsCard: {
      marginTop: 10,
  },
  resultsTitle: {
    margin: 15,
    textAlign: 'center',
  },
  offerCard: {
    marginVertical: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  segmentContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  airlineLogo: {
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  airlineName: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  flightInfo: {
    fontSize: 12,
    color: 'grey',
  },
  airportInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  airportDetail: {
    flex:1,
  },
  airportDetailRight:{
      flex:1,
      alignItems:'flex-end'
  },
  airportCode: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeText: {
    fontSize: 12,
  },
  arrowIcon: {
    marginHorizontal: 0,
  },
  layoverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'wrap',
  },
  layoverText: {
    flexShrink: 1,
    marginRight: 5,
  },
  segmentTitle: {
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 16,
  },
  segmentDivider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: '#ccc',
  },
  overnightChip: {
    marginLeft: 5,
  },
  carbonInfo: {
    fontSize: 12,
    color: 'grey',
    marginTop: 10,
  },
  errorText: {
      color: 'red',
      textAlign: 'center',
      padding: 10,
  },
  infoText: {
      textAlign: 'center',
      padding: 10,
  },
  chip: {
    margin: 2,
    alignSelf: 'flex-start',
  },
}); 