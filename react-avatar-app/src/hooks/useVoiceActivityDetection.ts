/**
 * @fileoverview Voice Activity Detection hook for microphone input
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface VADOptions {
  threshold?: number;
  minSilenceDuration?: number;
  minSpeechDuration?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

interface VADState {
  isListening: boolean;
  isSpeaking: boolean;
  hasPermission: boolean;
  micAvailable?: boolean;
  error: string | null;
}

export const useVoiceActivityDetection = (options: VADOptions = {}) => {
  const {
    threshold = 0.01,
    minSilenceDuration = 1000,
    minSpeechDuration = 500,
    onSpeechStart,
    onSpeechEnd,
    onError
  } = options;

  const [state, setState] = useState<VADState>({
    isListening: false,
    isSpeaking: false,
    hasPermission: false,
    micAvailable: undefined,
    error: null
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  /**
   * @description Initialize audio context and analyser
   */
  const initializeAudioContext = useCallback(async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      return { audioContext, analyser };
    } catch (error) {
      throw new Error(`Failed to initialize audio context: ${error}`);
    }
  }, []);

  /**
   * @description Get microphone permission and stream
   */
  const getMicrophonePermission = useCallback(async () => {
    try {
      // Cross-browser getUserMedia compatibility
      const getUserMediaCompat = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
        const nav: any = navigator as any;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(constraints);
        }
        const legacyGetUserMedia = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia;
        if (legacyGetUserMedia) {
          return new Promise((resolve, reject) => legacyGetUserMedia.call(nav, constraints, resolve, reject));
        }
        if ((window as any).isSecureContext === false) {
          throw new Error('Browser blocked microphone on non-HTTPS origin. Please use HTTPS or localhost.');
        }
        throw new Error('MediaDevices.getUserMedia is not supported in this browser.');
      };

      const stream = await getUserMediaCompat({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaStreamRef.current = stream;
      setState(prev => ({ ...prev, hasPermission: true, micAvailable: true, error: null }));
      
      return stream;
    } catch (error) {
      const errorMessage = `Microphone permission denied: ${error}`;
      setState(prev => ({ ...prev, micAvailable: false, error: errorMessage }));
      onError?.(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }, [onError]);

  /**
   * @description Preflight: detect mic availability without prompting
   */
  const checkMicAvailability = useCallback(async () => {
    try {
      const nav: any = navigator as any;
      const supported = !!(navigator.mediaDevices?.getUserMedia || nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia);
      if (!supported) {
        const msg = (window as any).isSecureContext === false
          ? 'Microphone requires HTTPS or localhost.'
          : 'getUserMedia is not supported in this browser.';
        setState(prev => ({ ...prev, micAvailable: false, error: msg }));
        return false;
      }
      setState(prev => ({ ...prev, micAvailable: true, error: null }));
      return true;
    } catch (e) {
      setState(prev => ({ ...prev, micAvailable: false }));
      return false;
    }
  }, []);

  /**
   * @description Analyze audio levels for voice activity
   */
  const analyzeAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    const now = Date.now();
    const isCurrentlySpeaking = normalizedLevel > threshold;

    setState(prev => {
      const newState = { ...prev };
      
      if (isCurrentlySpeaking && !prev.isSpeaking) {
        // Speech started
        speechStartRef.current = now;
        silenceStartRef.current = null;
        newState.isSpeaking = true;
        onSpeechStart?.();
      } else if (!isCurrentlySpeaking && prev.isSpeaking) {
        // Speech might be ending
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        } else if (now - silenceStartRef.current >= minSilenceDuration) {
          // Speech has ended
          const speechDuration = speechStartRef.current ? now - speechStartRef.current : 0;
          
          if (speechDuration >= minSpeechDuration) {
            // Create audio blob from recorded chunks
            if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
              onSpeechEnd?.(audioBlob);
            }
          }
          
          newState.isSpeaking = false;
          speechStartRef.current = null;
          silenceStartRef.current = null;
          audioChunksRef.current = [];
        }
      } else if (isCurrentlySpeaking && prev.isSpeaking) {
        // Reset silence timer if still speaking
        silenceStartRef.current = null;
      }
      
      return newState;
    });
  }, [threshold, minSilenceDuration, minSpeechDuration, onSpeechStart, onSpeechEnd]);

  /**
   * @description Start voice activity detection
   */
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Get microphone permission
      const stream = await getMicrophonePermission();
      
      // Initialize audio context
      const { audioContext, analyser } = await initializeAudioContext();
      
      // Connect microphone to analyser
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      microphoneRef.current = microphone;
      
      // Set up media recorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      // Start audio analysis
      const analyze = () => {
        analyzeAudioLevel();
        animationFrameRef.current = requestAnimationFrame(analyze);
      };
      analyze();
      
      setState(prev => ({ ...prev, isListening: true }));
      
    } catch (error) {
      const errorMessage = `Failed to start listening: ${error}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(new Error(errorMessage));
    }
  }, [getMicrophonePermission, initializeAudioContext, analyzeAudioLevel, onError]);

  /**
   * @description Stop voice activity detection
   */
  const stopListening = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Reset refs
    analyserRef.current = null;
    microphoneRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    speechStartRef.current = null;
    silenceStartRef.current = null;
    
    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      isSpeaking: false 
    }));
  }, []);

  /**
   * @description Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    checkMicAvailability
  };
};
