import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// This console.error is useful during development if .env is not set up,
// or if there's an issue with the build process not inlining the key.
if (!apiKey) {
  console.error("Gemini API Key is not set. Please check your .env file (for local dev, EXPO_PUBLIC_GEMINI_API_KEY) or EAS secrets (for builds).");
  // Avoid Alert.alert at module scope as it can be disruptive during development hot-reloads.
  // The checks within each function will handle alerting the user if the key is missing at runtime.
}

// Initialize the GoogleGenerativeAI client.
// If apiKey is undefined (e.g., not set in .env or not inlined during build),
// an empty string is passed. The individual functions below also check for apiKey before making calls.
const genAI = new GoogleGenerativeAI(apiKey || '');

// Configuration for the model
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash', // As per your original code
});

const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Converts an image URI to a base64 encoded string.
 * @param imageUri The local URI of the image.
 * @returns A promise that resolves with the base64 string or null if an error occurs.
 */
export async function imageUriToBase64(imageUri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('[GeminiService] Error converting image URI to base64:', error);
    Alert.alert('Image Error', 'Could not process the image. Please try a different one.');
    return null;
  }
}

/**
 * Generates content using a multimodal prompt (text and optionally an image).
 * @param promptParts An array of Parts, which can be text or inlineData (for images).
 * @returns A promise that resolves with the generated text or null if an error occurs.
 */
export async function generateMultimodalContent(promptParts: Part[]): Promise<string | null> {
  if (!apiKey) {
    console.error("[GeminiService] API Key is missing. Cannot generate multimodal content.");
    Alert.alert("API Key Error", "Gemini API Key is missing. This feature is unavailable. Please contact support if this is a production build.");
    return null;
  }

  const textPart = promptParts.find(p => p.text);
  console.log("[GeminiService] Starting multimodal request with:", {
    promptPartsCount: promptParts.length,
    firstPartType: promptParts[0]?.text ? 'text' : (promptParts[0]?.inlineData ? 'image' : 'unknown'),
    promptTextPreview: textPart?.text?.substring(0, 100) + (textPart?.text && textPart.text.length > 100 ? '...' : '')
  });

  try {
    console.log("[GeminiService] Calling model.generateContent for multimodal...");

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig,
      safetySettings,
    });

    console.log("[GeminiService] Got response from multimodal model");

    if (!result || !result.response || typeof result.response.text !== 'function') {
        console.error('[GeminiService] Invalid response structure from multimodal API call:', result);
        throw new Error('Invalid API response structure received from Gemini.');
    }

    const response = result.response;
    const text = response.text();
    console.log("[GeminiService] Multimodal response text length:", text.length);
    return text;

  } catch (error: any) {
    const errorMessage = error?.message || 'An unknown error occurred during AI generation.';
    console.error('[GeminiService] Error during multimodal content generation:', {
        name: error?.name || 'UnknownError',
        message: errorMessage,
        // Using JSON.stringify with a replacer for better logging of complex error objects
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    Alert.alert('AI Generation Failed', `Could not get a response from the AI. ${errorMessage}`);
    return null;
  }
}

/**
 * Generates content using a text-only prompt.
 * @param promptText The text prompt.
 * @returns A promise that resolves with the generated text or null if an error occurs.
 */
export async function generateTextOnly(promptText: string): Promise<string | null> {
  if (!apiKey) {
    console.error("[GeminiService] API Key is missing. Cannot generate text-only content.");
    Alert.alert("API Key Error", "Gemini API Key is missing. This feature is unavailable. Please contact support if this is a production build.");
    return null;
  }

  console.log("[GeminiService] Starting text-only request with prompt preview:", promptText.substring(0,100) + (promptText.length > 100 ? "..." : ""));

  try {
    console.log("[GeminiService] Calling model.generateContent for text-only...");
    // Ensure generationConfig and safetySettings are applied consistently
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{text: promptText}] }],
        generationConfig,
        safetySettings,
    });

    console.log("[GeminiService] Got response from text-only model");

    if (!result || !result.response || typeof result.response.text !== 'function') {
        console.error('[GeminiService] Invalid response structure from text-only API call:', result);
        throw new Error('Invalid API response structure received from Gemini.');
    }

    const response = result.response;
    const text = response.text();
    console.log("[GeminiService] Text-only response text length:", text.length);
    return text;

  } catch (error: any) {
    const errorMessage = error?.message || 'An unknown error occurred during AI generation.';
    console.error('[GeminiService] Error generating text-only content with Gemini:', {
        name: error?.name || 'UnknownError',
        message: errorMessage,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    Alert.alert('AI Generation Failed', `Could not get a response from the AI. ${errorMessage}`);
    return null;
  }
}

/**
 * Gets the IATA airport code for a given city name using Gemini.
 * @param cityName The name of the city.
 * @returns A promise that resolves with the 3-letter IATA code or null if not found/error.
 */
export async function getIataCodeForCity(cityName: string): Promise<string | null> {
  if (!cityName || cityName.trim() === "") {
    Alert.alert("Input Error", "City name cannot be empty.");
    return null;
  }

  // The prompt is well-defined to ask for a specific format.
  const prompt = `What is the primary 3-letter IATA airport code for the city: "${cityName}"? Respond with only the 3-letter IATA code in uppercase. For example, for "London", return "LHR". If the city is ambiguous, has no major airport with an IATA code, or is not found, return "N/A".`;

  console.log(`[GeminiService - getIataCodeForCity] Requesting IATA for city: ${cityName}`);
  const responseText = await generateTextOnly(prompt); // This will handle API key check and basic AI errors

  if (responseText === null) {
    // An alert would have already been shown by generateTextOnly (e.g., API key, network, or internal AI error).
    console.warn(`[GeminiService - getIataCodeForCity] generateTextOnly returned null for city: ${cityName}. The previous alert should have informed the user.`);
    return null;
  }

  const trimmedResponse = responseText.trim().toUpperCase();
  console.log(`[GeminiService - getIataCodeForCity] Gemini raw response: "${responseText}", Trimmed: "${trimmedResponse}"`);

  if (trimmedResponse === "N/A") {
    console.warn(`[GeminiService - getIataCodeForCity] Gemini indicated N/A for city: ${cityName}`);
    Alert.alert("City Not Found", `Could not determine an airport code for "${cityName}". The AI indicated it's not available or the city is ambiguous. Please check the city name or try a more specific one.`);
    return null;
  }

  if (/^[A-Z]{3}$/.test(trimmedResponse)) {
    console.log(`[GeminiService - getIataCodeForCity] Valid IATA code found: ${trimmedResponse} for city: ${cityName}`);
    return trimmedResponse;
  } else {
    console.warn(`[GeminiService - getIataCodeForCity] Invalid IATA code format from Gemini: "${trimmedResponse}" for city: ${cityName}`);
    Alert.alert("Airport Code Error", `The AI returned an unexpected format for the airport code of "${cityName}". Received: "${trimmedResponse}". Expected a 3-letter code.`);
    return null;
  }
}