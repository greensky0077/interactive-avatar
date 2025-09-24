import dotenv from 'dotenv';
dotenv.config();

// Debug: Log environment variable

export const config = {
  heygen: {
    apiKey: process.env.HEYGEN_APIKEY,
    serverUrl: process.env.HEYGEN_SERVER_URL,
    defaultQuality: 'low',
    defaultAvatarName: '1727404227',
    defaultVoiceId: '73c0b6a2e29d4d38aca41454bf58c955',
  },
  openai: {
    apiKey: process.env.OPENAI_APIKEY || process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    config: {
      temperature: 0.9,
      max_tokens: 2048,
      top_p: 0.1,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
  },
};
