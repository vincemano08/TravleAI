# AI Travel Planner App — Developer Specification

## 🧭 Overview

This mobile application serves as a personalized travel assistant, enabling users to:

- Input a desired travel destination.
- Upload images that reflect their travel preferences or inspirations (for immediate AI processing, not persistent storage by the app).
- Discover affordable flights using the Skyscanner API.
- Receive AI-generated travel itineraries tailored to their inputs.
- Engage in a conversational interface to refine and customize their travel plans (only textual parts of the chat are saved).
- Save and revisit previous itineraries and chat histories through a dedicated menu.

## 🛠️ Tech Stack

-   **Frontend:** React Native with TypeScript, Expo, and Expo Router
-   **UI Framework:** React Native Paper
-   **Authentication & Backend:** Supabase (Auth, Database for textual data, Storage for avatars)
-   **AI Processing:** Google AI Studio API (Gemini Models)
-   **Flight Search:** Skyscanner Flights Live Prices API

## 🖥️ User Interface (UI) Flow

### 1. Welcome Screen

**Components:**

-   **Destination Input Field:** Allows users to specify their desired travel location.
-   **Image Upload Section:** Enables users to upload photos for AI analysis to capture travel preferences. These images are not stored by the application.
-   **"Plan My Trip" Button:** Initiates the AI-driven itinerary generation process using destination and any uploaded image data.
-   **"Find Cheap Flights" Button:** Triggers a search for the most affordable flights departing from Budapest.

### 2. User Authentication

**Process:**

-   Upon launching the app, users are prompted to sign in or sign up using Supabase Auth.
-   Authentication methods can include email/password, magic links, or third-party providers.
-   Upon successful authentication, the user's profile is created in the `public.profiles` table in Supabase.

**Implementation Notes:**

-   Utilize Supabase's client libraries to handle authentication flows.
-   Store user metadata (e.g., name, preferences) in the `public.profiles` table.

### 3. Flight Search Results

**Functionality:**

-   Upon clicking the "Find Cheap Flights" button, the app queries the Skyscanner API to retrieve a list of the most economical flights based on predefined criteria.

**Search Parameters:**

-   **Market:** Hungary
-   **Currency:** HUF
-   **Locale:** en-GB
-   **Origin:** Budapest
-   **Adults:** 1

**Flight Details Displayed:**

-   Destination
-   Price
-   Airline
-   Departure and Arrival Times
-   Booking Links
-   **"Select This Flight" Option:** Allows users to choose a flight, which then sets the destination for itinerary planning.

### 4. AI-Generated Itinerary

**Process:**

-   Once a destination is selected—either manually or via flight selection—the app compiles the user's inputs (destination and data from any uploaded images) and sends them to the AI model.
-   The AI processes this information to generate a personalized travel itinerary, considering the user's preferences and inspirations.

**Itinerary Details May Include:**

-   Recommended attractions and activities
-   Suggested accommodations
-   Local dining options
-   Cultural tips and travel advice

### 5. Interactive Chat Interface

**Features:**

-   Post-itinerary generation, users can engage in a chat interface to further refine their travel plans.
-   Users can ask questions, request modifications, or seek additional recommendations.
-   The AI responds in real-time, adjusting the itinerary as per user feedback.
-   Only textual content of the chat is saved to Supabase. Image data exchanged in chat (if any) is not persisted by the app.

### 6. Save Itinerary Feature

**Functionality:**

-   After finalizing the itinerary, users have the option to save their travel plan and associated textual chat history.
-   Saved itineraries (textual data, structured information, potentially URLs to external images/resources) and textual chat histories are stored in Supabase's cloud database. Uploaded inspiration images are not re-saved here.

### 7. Saved Itineraries Menu

**Access:**

-   A dedicated menu accessible from the bottom navigation bar allows users to view all previously saved itineraries.

**Features:**

-   List of saved trips with key details (e.g., destination, dates).
-   Ability to open and review the full itinerary and chat history.
-   Options to delete or rename saved itineraries.

## 🧠 AI Integration

### Google AI Studio API (Gemini Models)

**Capabilities:**

-   **Multimodal Input Processing:** Handles both text and image inputs to understand user preferences comprehensively.
-   **Contextual Understanding:** Interprets the mood, style, and themes from uploaded images to align recommendations accordingly.
-   **Conversational Interaction:** Supports dynamic conversations, allowing users to iteratively refine their itineraries.

**Implementation Notes:**

-   **API Key Management:** The API key is embedded directly into the application code.
-   **Prompt Engineering:** Design prompts that effectively combine user inputs (text, image data) and preferences to elicit meaningful responses from the AI.
-   **Image Handling:** Ensure image data (e.g., from user uploads) is appropriately processed (e.g., base64 encoded, or passed as URIs if supported by the client library for Gemini) and formatted to be compatible with the AI's input requirements for multimodal queries. **User-uploaded inspiration images are not stored by the application in Supabase Storage; they are used transiently for AI queries.**

## ✈️ Flight Search Integration

### Skyscanner Flights Live Prices API

**Search Parameters:**

-   **Market:** Hungary
-   **Currency:** HUF
-   **Locale:** en-GB
-   **Origin:** Budapest
-   **Adults:** 1

**API Workflow:**

-   **Create Session:**
    -   **Endpoint:** `/apiservices/v3/flights/live/search/create`
    -   **Purpose:** Initiates a flight search session with the specified parameters.
-   **Poll Results:**
    -   **Endpoint:** `/apiservices/v3/flights/live/search/poll/{sessionToken}`
    -   **Purpose:** Retrieves the search results using the session token obtained from the create session step.

**Implementation Notes:**

-   **API Key Management:** The API key is embedded directly into the application code.
-   **Data Handling:** Parse and display the flight data in a user-friendly format, highlighting key details such as price and departure times.
-   **Error Handling:** Implement robust error handling to manage API response issues or data inconsistencies.

## 💾 Data Storage with Supabase

### Authentication

**User Sign-Up/Sign-In:**

-   Utilize Supabase Auth for handling user authentication flows.
-   Support various authentication methods, including email/password and third-party providers.

### Database Schema

**Profiles Table:**

-   **Table Name:** `public.profiles`
-   **Fields:**
    -   `id` (UUID, Primary Key, references `auth.users`)
    -   `email` (Text)
    -   Additional user metadata fields as needed

**Itineraries Table:**

-   **Table Name:** `public.itineraries`
-   **Fields:**
    -   `id` (UUID, Primary Key)
    -   `user_id` (UUID, references `auth.users`)
    -   `destination` (Text)
    -   `dates` (Date Range)
    -   `activities` (JSON)
    -   `inspiration_image_themes` (TEXT[]) - Stores textual descriptions or themes derived from inspiration images used for AI query, not direct image references.

**Chat History Table:**

-   **Table Name:** `public.chat_histories`
-   **Fields:**
    -   `id` (UUID, Primary Key)
    -   `itinerary_id` (UUID, references `public.itineraries`)
    -   `timestamp` (Timestamp)
    -   `sender` (Enum: 'user', 'ai')
    -   `message` (Text) - Only textual messages are stored.

### Security Measures:

**Row Level Security (RLS):**

-   Implement RLS policies to ensure users can only access their own data.
-   Example policy for `public.itineraries`:
    ```sql
    CREATE POLICY "Users can access their own itineraries"
    ON public.itineraries
    FOR ALL
    USING (user_id = auth.uid());
    ```

**Data Encryption:**

-   Ensure sensitive data is encrypted at rest and in transit.

## 💾 Full Database Schema (Supabase PostgreSQL)

This schema expands on the previous definitions and includes additional tables and considerations for a robust travel planning application.

### Enums (Custom Types)

It's good practice to define enums for fields with a fixed set of values.

```sql
CREATE TYPE public.sender_type AS ENUM ('user', 'ai');
CREATE TYPE public.message_content_type AS ENUM ('text', 'image_prompt', 'flight_details', 'itinerary_suggestion', 'user_feedback');
CREATE TYPE public.itinerary_item_type AS ENUM ('activity', 'accommodation', 'dining', 'travel', 'note', 'flight');
```

### Tables

1.  **`public.profiles`**
    *   Stores user-specific information, linked to `auth.users`.
    ```sql
    CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT, -- URL to avatar image in Supabase Storage
        preferences JSONB -- User preferences (e.g., travel style, budget)
    );
    -- RLS: Users can only access/modify their own profile.
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage their own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);
    -- Trigger to update updated_at timestamp
    CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);
    ```

2.  **`public.itineraries`**
    *   Stores the main details for each travel plan.
    ```sql
    CREATE TABLE public.itineraries (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        destination TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        title TEXT, -- User-defined title for the trip
        notes TEXT, -- General notes about the trip
        cover_image_url TEXT, -- URL to an *external* cover image or AI-suggested image, not an app-stored user upload
        inspiration_image_themes TEXT[], -- Textual descriptions or themes derived from inspiration images used for AI query
        CONSTRAINT check_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
    );
    -- RLS: Users can only access/modify their own itineraries.
    ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage their own itineraries"
    ON public.itineraries FOR ALL
    USING (auth.uid() = user_id);
    -- Indexes
    CREATE INDEX idx_itineraries_user_id ON public.itineraries(user_id);
    -- Trigger to update updated_at timestamp
    CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.itineraries
    FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);
    ```

3.  **`public.itinerary_items`**
    *   Stores individual items within an itinerary (activities, bookings, etc.).
    ```sql
    CREATE TABLE public.itinerary_items (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
        day_number INTEGER, -- Optional, for multi-day itineraries
        start_time TIMETZ,
        end_time TIMETZ,
        item_type public.itinerary_item_type NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location_name TEXT,
        location_address TEXT,
        location_latitude DOUBLE PRECISION,
        location_longitude DOUBLE PRECISION,
        cost DECIMAL(10, 2),
        currency CHAR(3), -- e.g., 'HUF', 'USD'
        booking_reference TEXT,
        attachments JSONB, -- Array of URLs to *external* images/documents or textual notes, not app-stored user uploads
        CONSTRAINT check_times CHECK (start_time IS NULL OR end_time IS NULL OR start_time <= end_time)
    );
    -- RLS: Users can manage items for their own itineraries.
    ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage items for their own itineraries"
    ON public.itinerary_items FOR ALL
    USING (auth.uid() = (SELECT user_id FROM public.itineraries WHERE id = itinerary_id));
    -- Indexes
    CREATE INDEX idx_itinerary_items_itinerary_id ON public.itinerary_items(itinerary_id);
    ```

4.  **`public.chat_messages`** (Renamed from `chat_histories` for clarity in full schema)
    *   Stores messages for the interactive chat feature, linked to an itinerary. Only textual content is persisted.
    ```sql
    CREATE TABLE public.chat_messages (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, 
        sender public.sender_type NOT NULL,
        content_type public.message_content_type DEFAULT 'text'::public.message_content_type NOT NULL, -- Primarily 'text'
        message_text TEXT, -- Stores the textual content of the message
        image_prompt_data JSONB, -- Stores textual description of an image used as a prompt, if any. Not the image itself.
        flight_details_data JSONB, -- For structured textual flight info
        itinerary_suggestion_data JSONB, -- For structured textual itinerary changes
        metadata JSONB -- Any other relevant textual or structured data (no binary image data)
    );
    -- RLS: Users can access messages for their own itineraries.
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can access messages for their own itineraries"
    ON public.chat_messages FOR ALL
    USING (auth.uid() = user_id AND auth.uid() = (SELECT user_id FROM public.itineraries WHERE id = itinerary_id));
    -- Indexes
    CREATE INDEX idx_chat_messages_itinerary_id ON public.chat_messages(itinerary_id);
    CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
    ```

### Supabase Storage

*   **`itinerary_attachments`**: For files/images attached to specific itinerary items, **if these are externally referenced URLs or non-inspiration files not directly uploaded by the user for AI query.** The primary mode of image interaction (user inspiration images) does not use this bucket for storage.
*   **`profile_avatars`**: For user profile pictures.
    *   Permissions: Users can upload (insert) their own avatar. Public read access might be okay, or restricted to authenticated users.

## 📂 Optimal Folder Structure (React Native with Expo & Expo Router)

This structure promotes modularity, scalability, and separation of concerns.

```
/my-travel-app
├── app/                      # Expo Router: Files/directories here define routes
│   ├── (auth)/               # Group for authentication screens (layout without a tab)
│   │   ├── _layout.tsx       # Layout for the auth stack (e.g., simple stack navigator)
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/               # Group for main tab-navigated screens
│   │   ├── _layout.tsx       # Layout for the tab navigator (React Native Paper BottomNavigation)
│   │   ├── home.tsx          # Welcome Screen: Destination Input, Image Upload
│   │   ├── plan/             # Screens related to planning a new trip
│   │   │   ├── index.tsx       # Initial planning screen (could be same as home or step 2)
│   │   │   └── [id].tsx        # Itinerary view & chat for a specific *new* or *active* plan
│   │   ├── flights.tsx       # Flight Search & Results Screen
│   │   └── saved-trips/
│   │       ├── _layout.tsx   # Optional layout for this section
│   │       ├── index.tsx     # List of saved itineraries
│   │       └── [id].tsx      # View a specific saved itinerary and its chat history
│   ├── _layout.tsx           # Root layout (Global providers: Auth, Theme, QueryClient)
│   ├── modal.tsx             # Example of a global modal screen
│   └── not-found.tsx         # Catch-all for unmatched routes
│
├── assets/                   # Static assets
│   ├── fonts/                # Custom fonts
│   ├── images/               # App images (logos, placeholders)
│   └── icons/                # Custom icons
│
├── components/               # Reusable UI components (presentational)
│   ├── auth/                 # Components specific to authentication screens
│   ├── common/               # Generic components (Button, Card, InputField, LoadingIndicator)
│   ├── flights/              # Components for flight display (FlightCard, FlightList)
│   ├── itinerary/            # Components for itinerary display (ActivityItem, DayView)
│   ├── layout/               # Components for screen layout (Header, TabBarIcon)
│   └── core/                 # Core UI elements, e.g. styled text, containers
│
├── constants/                # Application-wide constants
│   ├── Colors.ts             # Color palette
│   ├── Layout.ts             # Device dimensions, spacing units
│   ├── Strings.ts            # Localized strings or general UI text
│   └── Theme.ts              # React Native Paper theme configuration
│
├── contexts/                 # React Context API for global state management (if not using a dedicated library)
│   ├── AuthContext.tsx       # Manages user authentication state
│   ├── ThemeContext.tsx      # Manages app theme (dark/light mode)
│
├── core/                     # Core application logic, services, and types (non-UI)
│   ├── api/                  # API client setup and service calls
│   │   ├── geminiService.ts  # Google AI Studio (Gemini) API interactions
│   │   ├── skyscannerService.ts # Skyscanner API interactions
│   │   └── supabaseClient.ts # Supabase client instance
│   ├── auth/                 # Authentication logic (wrapping Supabase Auth)
│   │   └── authService.ts
│   ├── services/             # Other business logic services
│   │   ├── itineraryService.ts # Logic for managing itineraries (CRUD with Supabase)
│   │   └── chatService.ts    # Logic for managing chat messages
│   ├── storage/              # Utilities for interacting with Supabase Storage (e.g., for avatars)
│   │   └── fileUploader.ts   # May be used for avatar uploads
│   └── utils/                # General utility functions (date formatters, validators)
│
├── hooks/                    # Custom React Hooks
│   ├── useAuth.ts            # Hook to access auth context/status
│   ├── useSupabaseQuery.ts   # Hook for easy data fetching from Supabase (e.g., with react-query)
│   ├── useForm.ts            # Generic form handling hook
│   └── useDebounce.ts
│
├── navigation/               # Types and configurations if extending Expo Router's capabilities
│   └── types.ts              # TypeScript definitions for route params
│
├── store/                    # Global state management (e.g., Zustand, Redux Toolkit) - if needed
│   ├── userStore.ts
│   └── itineraryStore.ts
│
├── types/                    # Global TypeScript definitions and interfaces
│   ├── api.ts                # Types for API request/response payloads
│   ├── data.ts               # Core data model types (Itinerary, Profile, etc.)
│   └── supabase.ts           # Auto-generated types from Supabase schema (using \`supabase gen types typescript\`)
│
├── .vscode/                  # VS Code specific settings
│   └── settings.json
├── .env.example              # Example for environment variables
├── .env                      # Actual environment variables (GIT_IGNORED!) - SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, SKYSCANNER_API_KEY
├── .eslintrc.js              # ESLint configuration
├── app.config.ts             # Expo app configuration (plugins, splash screen, etc.)
├── babel.config.js           # Babel configuration
├── eas.json                  # EAS Build & Submit configuration
├── package.json
├── tsconfig.json             # TypeScript configuration
└── README.md