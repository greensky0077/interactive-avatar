# Streaming Avatar Demo

NEW: We have an SDK now! The SDK is an NPM package that you can easily add to your website and use for Streaming Avatar functionality. Please check it out at https://www.npmjs.com/package/@heygen/streaming-avatar

We also have an example React app demonstrating the SDK's functionality. That is located at: https://github.com/HeyGen-Official/StreamingAvatarTSDemo

## Introduction

This HeyGen Streaming Avatar demo is a starting point from which developers can adapt and build streaming sessions into their own websites and experiences.

Below, we have outlined a few questions that frequently pop up when users first try out this demo. Below that FAQ, you will find directions for installing and running this demo.

## Getting Started FAQ

### How do I get an API Key?

Either an an API Key or Trial Token from HeyGen is required to run this Streaming API demo. API Keys are reserved for Enterprise customers, whereas both Creator and Teams plan users can activate and use a Trial token. You can retrieve either the API Key or Trial Token by logging in to HeyGen and navigating to this page in your settings: https://app.heygen.com/settings?nav=API

### Which Avatars can I use with this project?

By default, there are several Public Avatars that can be used in Streaming. (AKA Streaming Avatars.) You can find the Avatar IDs for these Public Avatars by navigating to app.heygen.com/streaming-avatar and clicking 'Select Avatar'.

In order to use a private Avatar created under your own account in Streaming, it must be upgraded to be a Streaming Avatar. Only 1. Finetune Instant Avatars and 2. Studio Avatars are able to be upgraded to Streaming Avatars. This upgrade is a one-time fee and can be purchased by navigating to app.heygen.com/streaming-avatar and clicking 'Select Avatar'.

Photo Avatars are not compatible with Streaming and cannot be used.

### Which voices can I use?

Most of HeyGen's AI Voices can be used with the Streaming API. To find the Voice IDs that you can use, please use the List Voices v2 endpoint from HeyGen: https://docs.heygen.com/reference/list-voices-v2

### Why am I encountering issues with testing?

Most likely, you are hitting your concurrent session limit. While testing the Streaming API, your account is limited to 3 concurrent sessions. Please endeavor to close unused Streaming sessions with the Close Session endpoint when they are no longer being used; they will automatically close after some minutes.

You can check how many active sessions you have open with the List Sessions endpoint: https://docs.heygen.com/reference/list-sessions

## Installing the Demo

1. Clone the repository.

   ```
   git clone https://github.com/HeyGen-Official/StreamingAvatar.git
   ```

2. Open the `index.js` file and replace `'YourApiKey'` with your API key:

   ```
   "apiKey": "YourApiKey";
   ```
3. (optional) Open the `server.js` file and set your OpenAI API key to use talk mode:
   ```
   const openai = new OpenAI({
     apiKey: "<your openai api key>",
   });
   ```

4. open a terminal in the folder and then install the express and run the server.js:

   ```
   npm install express
   node server.js
   ```

5. you will see `App is listening on port 3000!`.

## Using the Demo

1. Open the web browser and enter the `http://localhost:3000`to start the demo.
2. Click the "New" button to create a new session. The status updates will be displayed on the screen.
3. After the session is created successfully, click the "Start" button to start streaming the avatar.
4. To send a task to the avatar, type the text in the provided input field and click the "Repeat Text" button.
5. In order to use Talk mode, set your **OpenAI** key in **server.js** before starting the server and click "Talk" button
6. Once done, click the "Close Connection" button to close the session.

Remember, this is a demo and should be modified according to your needs and preferences. Happy coding!

## Troubleshooting

In case you face any issues while running the demo or have any questions, feel free to raise an issue in this repository or contact our support team.

Please note, if you encounter a "Server Error", it could be due to the server being offline. In such cases, please contact the service provider.

# Streaming Avatar API Documentation

## Base URL
```
http://localhost:3000
```

## API Endpoints

### 1. Persona Management

#### 1.1 Get Persona Details
```
GET /persona
```
**Description:** Retrieves the complete persona information including name, education, technical skills, and personality traits.

**Response:**
```json
{
  "name": "string",        // Persona's name
  "title": "string",      // Persona's title
  "education": {
    "degree": "string",   // Educational degree
    "year": "string",     // Year of study
    "institution": "string" // Educational institution
  },
  "technical": {
    "languages": ["string"], // Programming languages
    "webStack": ["string"], // Web development stack
    "projects": ["string"]  // Project descriptions
  },
  "personality": {
    "style": "string",    // Communication style
    "interests": ["string"], // Areas of interest
    "goals": ["string"]   // Current goals
  },
  "traits": ["string"]    // Personality traits
}
```

#### 1.2 Update Persona Details
```
POST /persona
```
**Description:** Updates basic persona information.

**Request Body:**
```json
{
  "name": "string",        // New name
  "title": "string",      // New title
  "education": {
    "degree": "string",   // New degree
    "year": "string",     // New year
    "institution": "string" // New institution
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Persona details updated successfully",
  "persona": {
    // Updated persona object
  }
}
```

#### 1.3 Get Persona Configuration
```
GET /persona/config
```
**Description:** Retrieves the complete persona configuration (same as Get Persona Details).

**Response:** Same as Get Persona Details

#### 1.4 Update Persona Configuration
```
POST /persona/update
```
**Description:** Updates the complete persona configuration including all aspects of the persona.

**Request Body:**
```json
{
  "name": "string",
  "title": "string",
  "education": {
    "degree": "string",
    "year": "string",
    "institution": "string"
  },
  "technical": {
    "languages": ["string"],
    "webStack": ["string"],
    "projects": ["string"]
  },
  "personality": {
    "style": "string",
    "interests": ["string"],
    "goals": ["string"]
  },
  "traits": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Persona configuration updated successfully",
  "data": {
    // Updated persona object
  }
}
```

### 2. HeyGen Integration

#### 2.1 Initialize HeyGen Bot
```
POST /persona/heygen/init
```
**Description:** Initializes the HeyGen bot with a welcome message.

**Response:**
```json
{
  "success": true,
  "message": "Bot initialized successfully",
  "data": {
    "text": "string"  // Welcome message
  }
}
```

#### 2.2 Create HeyGen Session
```
POST /persona/heygen/session/create
```
**Description:** Creates a new HeyGen streaming session.

**Request Body:**
```json
{
  "avatar_name": "string",  // Name of the avatar to use
  "voice_id": "string"      // ID of the voice to use
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    // Session information
  }
}
```

#### 2.3 Start HeyGen Session
```
POST /persona/heygen/session/start
```
**Description:** Starts the HeyGen streaming session with WebRTC.

**Request Body:**
```json
{
  "session_id": "string",  // ID of the session to start
  "sdp": "string"         // WebRTC SDP offer
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session started successfully",
  "data": {
    // Session start response
  }
}
```

#### 2.4 Send Text to HeyGen
```
POST /persona/heygen/text
```
**Description:** Sends text to be spoken by the HeyGen avatar, optionally with AI response generation.

**Request Body:**
```json
{
  "session_id": "string",         // ID of the active session
  "text": "string",              // Text to be spoken
  "generate_ai_response": boolean // Whether to generate AI response
}
```

**Response:**
```json
{
  "success": true,
  "message": "Text sent successfully",
  "data": {
    // Response data
  },
  "ai_response": "string",       // Generated AI response if requested
  "speaking_duration": number    // Estimated speaking duration in seconds
}
```

#### 2.5 Handle ICE Candidate
```
POST /persona/heygen/ice
```
**Description:** Handles WebRTC ICE candidate exchange.

**Request Body:**
```json
{
  "session_id": "string",  // ID of the active session
  "candidate": {
    "candidate": "string",
    "sdpMid": "string",
    "sdpMLineIndex": number
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "ICE candidate handled successfully",
  "data": {
    // ICE handling response
  }
}
```

#### 2.6 Stop HeyGen Session
```
POST /persona/heygen/session/stop
```
**Description:** Stops the HeyGen streaming session.

**Request Body:**
```json
{
  "session_id": "string"  // ID of the session to stop
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session stopped successfully",
  "data": {
    // Session stop response
  }
}
```

### 3. Chat Integration

#### 3.1 Initialize Chat Bot
```
POST /openai
```
**Description:** Initializes the AI chat service.

**Response:**
```json
{
  "success": true,
  "message": "AI service initialized successfully",
  "text": "string"  // Initialization message
}
```

#### 3.2 Get Chat Response
```
POST /openai/complete
```
**Description:** Gets a response from the AI chat bot using the persona's style.

**Request Body:**
```json
{
  "prompt": "string"  // User's message
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI response generated successfully",
  "text": "string"  // AI's response
}
```

## Error Handling

All endpoints may return errors in this format:
```json
{
  "success": false,
  "message": "string",  // Error message
  "error": "string"     // Detailed error information
}
```

Common error codes:
- `400`: Bad Request (missing or invalid parameters)
- `500`: Internal Server Error

## Environment Variables

The server requires the following environment variables:

```env
PORT=3000
# Add other required environment variables
```

## Rate Limiting

Currently, there are no rate limits implemented. This may change in future versions.

## CORS

The API supports CORS and can be accessed from any origin. This may be restricted in production environments.

## WebSocket Support

Some endpoints may establish WebSocket connections for real-time communication. These will be documented in future versions.
