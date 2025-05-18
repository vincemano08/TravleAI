import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("Gemini API Key is not set. Please update it in .env file (EXPO_PUBLIC_GEMINI_API_KEY).");
  Alert.alert("API Key Error", "Gemini API Key is missing. Please configure it in your .env file.");
}

// Define request options with a timeout -- this was for the constructor attempt, removing if not used by constructor
// const requestOptions = { timeout: 30000 }; // 30 seconds in milliseconds 

const genAI = new GoogleGenerativeAI(apiKey || ''); // Reverted to original single-argument constructor

// User specified model
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash', 
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
    console.error('Error converting image URI to base64:', error);
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
    console.error("[GeminiService] API Key is missing. Cannot generate content.");
    Alert.alert("API Key Error", "Gemini API Key is missing. Cannot make requests.");
    return null;
  }

  console.log("[GeminiService] Starting request with:", {
    hasApiKey: !!apiKey,
    promptPartsCount: promptParts.length,
    firstPartType: promptParts[0]?.text ? 'text' : 'image',
    promptText: promptParts[0]?.text?.substring(0, 100) + '...' // Log first 100 chars of prompt
  });

  try {
    console.log("[GeminiService] Calling model.generateContent...");

    const result = await model.generateContent({ 
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig,
      safetySettings,
    });
    
    // If we reach here, the apiCallPromise completed
    console.log("[GeminiService] Got response from model");

    // Validate the structure of 'result' and 'result.response'
    if (!result || !result.response || typeof result.response.text !== 'function') {
        console.error('[GeminiService] Invalid response structure after API call or timeout did not behave as expected:', result);
        // It's possible that if timeoutPromise wins, 'result' would be the Error object itself if not caught by its own reject.
        // However, Promise.race should propagate the rejection of timeoutPromise, caught by the outer catch block.
        // This check is more for validating the structure of a successful API response.
        throw new Error('Invalid API response structure received from Gemini.');
    }

    const response = result.response;
    const text = response.text();
    console.log("[GeminiService] Response text length:", text.length);
    return text;

  } catch (error: any) {
    console.error('[GeminiService] Error details:', {
      name: error?.name || 'Unknown error',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace'
    });
    console.error('[GeminiService] Full error object (if timeout or other issue):', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    Alert.alert('AI Generation Failed', `Could not get a response from the AI. ${error.message || 'Please check the console for details.'}`);
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
    console.error("Gemini API Key is missing. Cannot generate content.");
    Alert.alert("API Key Error", "Gemini API Key is missing. Cannot make requests.");
    return null;
  }
  try {
    const result = await model.generateContent(promptText);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating text-only content with Gemini:', error);
    Alert.alert('AI Generation Failed', 'Could not get a response from the AI. Please check the console for details.');
    return null;
  }
}

/**
 * Gets the IATA airport code for a given city name using Gemini.
 * @param cityName The name of the city.
 * @returns A promise that resolves with the 3-letter IATA code or null if not found/error.
 */
export async function getIataCodeForCity(cityName: string): Promise<string | null> {
  if (!apiKey) {
    console.error("Gemini API Key is missing. Cannot get IATA code.");
    Alert.alert("API Key Error", "Gemini API Key is missing.");
    return null;
  }
  if (!cityName || cityName.trim() === "") {
    Alert.alert("Input Error", "City name cannot be empty.");
    return null;
  }

  const prompt = `What is the primary 3-letter IATA airport code for the city: "${cityName}"? Return only the 3-letter IATA code, nothing else. For example, for London, return LHR. If the city is ambiguous or not found, return "N/A".`;

  try {
    console.log(`[getIataCodeForCity] Requesting IATA for city: ${cityName}`);
    const responseText = await generateTextOnly(prompt);

    if (responseText) {
      const trimmedResponse = responseText.trim().toUpperCase();
      console.log(`[getIataCodeForCity] Gemini raw response: "${responseText}", Trimmed: "${trimmedResponse}"`);

      if (trimmedResponse === "N/A") {
        console.warn(`[getIataCodeForCity] Gemini indicated N/A for city: ${cityName}`);
        Alert.alert("City Not Found", `Could not determine an airport code for "${cityName}". Please check the city name or try a more specific one.`);
        return null;
      }

      // Validate if it's a 3-letter uppercase code
      if (/^[A-Z]{3}$/.test(trimmedResponse)) {
        console.log(`[getIataCodeForCity] Valid IATA code found: ${trimmedResponse} for city: ${cityName}`);
        return trimmedResponse;
      } else {
        console.warn(`[getIataCodeForCity] Invalid IATA code format from Gemini: "${trimmedResponse}" for city: ${cityName}`);
        Alert.alert("Airport Code Error", `Received an invalid airport code format for "${cityName}". AI response: "${trimmedResponse}"`);
        return null;
      }
    } else {
      console.warn(`[getIataCodeForCity] Gemini returned no response for city: ${cityName}`);
      Alert.alert("AI Error", `The AI returned no response for the city "${cityName}".`);
      return null;
    }
  } catch (error) {
    console.error(`[getIataCodeForCity] Error getting IATA code for ${cityName}:`, error);
    Alert.alert('AI Communication Error', 'Failed to communicate with the AI to get airport code.');
    return null;
  }
} 