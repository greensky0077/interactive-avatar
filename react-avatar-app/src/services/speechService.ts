/**
 * @fileoverview Speech-to-text service using Web Speech API
 */

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface SpeechServiceState {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

export class SpeechService {
  private recognition: any = null;
  private state: SpeechServiceState = {
    isSupported: false,
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
    error: null
  };
  private listeners: ((state: SpeechServiceState) => void)[] = [];

  constructor() {
    this.initializeSpeechRecognition();
  }

  /**
   * @description Initialize speech recognition
   */
  private initializeSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.updateState({ 
        isSupported: false, 
        error: 'Speech recognition not supported in this browser' 
      });
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupEventListeners();
    this.updateState({ isSupported: true });
  }

  /**
   * @description Setup speech recognition event listeners
   */
  private setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.updateState({ 
        isListening: true, 
        isProcessing: false,
        error: null 
      });
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      this.updateState({
        transcript,
        confidence,
        isProcessing: false
      });
    };

    this.recognition.onerror = (event: any) => {
      this.updateState({
        isListening: false,
        isProcessing: false,
        error: `Speech recognition error: ${event.error}`
      });
    };

    this.recognition.onend = () => {
      this.updateState({ 
        isListening: false,
        isProcessing: false
      });
    };
  }

  /**
   * @description Start speech recognition
   */
  startListening(options: SpeechRecognitionOptions = {}) {
    if (!this.recognition) {
      this.updateState({ 
        error: 'Speech recognition not supported' 
      });
      return;
    }

    if (this.state.isListening) {
      return;
    }

    try {
      this.recognition.lang = options.language || 'en-US';
      this.recognition.continuous = options.continuous || false;
      this.recognition.interimResults = options.interimResults || true;
      this.recognition.maxAlternatives = options.maxAlternatives || 1;

      this.updateState({ 
        isProcessing: true,
        transcript: '',
        error: null 
      });

      this.recognition.start();
    } catch (error) {
      this.updateState({
        error: `Failed to start speech recognition: ${error}`,
        isProcessing: false
      });
    }
  }

  /**
   * @description Stop speech recognition
   */
  stopListening() {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * @description Abort speech recognition
   */
  abortListening() {
    if (this.recognition && this.state.isListening) {
      this.recognition.abort();
    }
  }

  /**
   * @description Get current state
   */
  getState(): SpeechServiceState {
    return { ...this.state };
  }

  /**
   * @description Subscribe to state changes
   */
  subscribe(listener: (state: SpeechServiceState) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * @description Update state and notify listeners
   */
  private updateState(updates: Partial<SpeechServiceState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * @description Check if speech recognition is supported
   */
  isSupported(): boolean {
    return this.state.isSupported;
  }

  /**
   * @description Get available languages
   */
  getSupportedLanguages(): string[] {
    // Common languages supported by most browsers
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA',
      'es-ES', 'es-MX', 'es-AR',
      'fr-FR', 'fr-CA',
      'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
      'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN'
    ];
  }
}

// Export singleton instance
export const speechService = new SpeechService();
