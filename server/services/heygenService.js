import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class HeygenService {
  constructor() {
    this.apiKey = config.heygen.apiKey;
    this.serverUrl = config.heygen.serverUrl;
  }

  async createSession(avatar_name, voice_id) {
    // Debug: Log the API key being used
    logger.info('HeygenService', 'API Key Debug', { 
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'undefined',
      serverUrl: this.serverUrl
    });
    
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your_heygen_api_key_here') {
      throw new Error('HEYGEN_APIKEY is missing. Please set it in your server environment.');
    }

    try {
      const requestBody = {
        quality: config.heygen.defaultQuality,
        avatar_name,
        disable_idle_timeout: true,
      };
      
      // Only add voice if voice_id is provided and not empty
      if (voice_id && voice_id.trim() !== '') {
        requestBody.voice = { voice_id };
      }
      
      const response = await fetch(`${this.serverUrl}/v1/streaming.new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (!response.ok) {
        logger.error('HeygenService', 'API Response Error', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          requestBody: requestBody
        });
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!data.data) {
        throw new Error('Invalid response format: missing data field');
      }
      
      return data.data;
    } catch (error) {
      logger.error('HeygenService', 'Session creation failed', { error: error.message });
      throw new Error(`HeyGen API error: ${error.message}`);
    }
  }

  async startSession(session_id, sdp) {
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'your_heygen_api_key_here') {
      logger.warn('HeygenService', 'API key not configured, returning mock start response');
      return { success: true, message: 'Mock session started' };
    }

    try {
      const response = await fetch(`${this.serverUrl}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({ session_id, sdp }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Failed to start session`);
      }
      
      return data.data || { success: true };
    } catch (error) {
      logger.error('HeygenService', 'Session start failed', { error: error.message });
      throw new Error(`HeyGen API error: ${error.message}`);
    }
  }

  async handleICE(session_id, candidate) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.ice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id, candidate }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to handle ICE candidate');
    }
    return data;
  }

  async sendText(session_id, text) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id, text }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to send text');
    }
    return data.data;
  }

  async stopSession(session_id) {
    const response = await fetch(`${this.serverUrl}/v1/streaming.stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: JSON.stringify({ session_id }),
    });

    const data = await response.json();
    if (response.status === 500) {
      throw new Error('Failed to stop session');
    }
    return data.data;
  }
}

export const heygenService = new HeygenService();
