'use client';

import { useState, useEffect, useRef } from 'react';

interface CallAudioProps {
  isMuted: boolean;
  onSpeechResult?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  className?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface SpeechMetrics {
  firstByteTime: number;
  processingTime: number;
  audioGaps: number[];
}

export function CallAudio({
  isMuted,
  onSpeechResult,
  onAIResponse,
  className
}: CallAudioProps) {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const metricsRef = useRef<SpeechMetrics>({
    firstByteTime: 0,
    processingTime: 0,
    audioGaps: []
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;
          
          if (result.isFinal && onSpeechResult && !isProcessing) {
            setIsProcessing(true);
            metricsRef.current.processingTime = performance.now();
            onSpeechResult(transcriptText);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            restartRecognition(recognition);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (!isMuted && !isProcessing) {
            restartRecognition(recognition);
          }
        };

        setRecognition(recognition);
      }
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, [onSpeechResult, isMuted, isProcessing]);

  const restartRecognition = (recognition: SpeechRecognition) => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
    recognitionTimeoutRef.current = setTimeout(() => {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to restart recognition:', error);
      }
    }, 100);
  };

  useEffect(() => {
    if (recognition) {
      if (isMuted && isListening) {
        recognition.stop();
      } else if (!isMuted && !isListening && !isProcessing) {
        restartRecognition(recognition);
      }
    }
  }, [isMuted, recognition, isListening, isProcessing]);

  const createChunkedUtterance = (text: string): SpeechSynthesisUtterance[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(sentence => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      return utterance;
    });
  };

  const speakAIResponse = async (text: string) => {
    if (!text) return;

    try {
      // Ensure speech synthesis is ready
      if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported');
        return;
      }

      // Stop any ongoing speech and recognition
      window.speechSynthesis.cancel();
      if (isListening && recognition) {
        recognition.stop();
      }
      setIsProcessing(true);
      metricsRef.current.firstByteTime = performance.now();

      // Wait for the complete response
      await new Promise(resolve => setTimeout(resolve, 100));

      const utterances = createChunkedUtterance(text);
      let lastEndTime = performance.now();

      for (let i = 0; i < utterances.length; i++) {
        await new Promise<void>((resolve, reject) => {
          const utterance = utterances[i];
          
          // Set voice to ensure consistent playback
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find(voice => voice.lang.includes('en-US'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          }

          utterance.onend = () => {
            const currentTime = performance.now();
            metricsRef.current.audioGaps.push(currentTime - lastEndTime);
            lastEndTime = currentTime;
            resolve();
          };

          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            resolve();
          };

          speechSynthesisRef.current = utterance;
          
          window.speechSynthesis.speak(utterance);
        });

        // Add a small pause between sentences for more natural speech
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    } finally {
      speechSynthesisRef.current = null;
      setIsProcessing(false);

      if (!isMuted && recognition) {
        restartRecognition(recognition);
      }
    }
  };

  useEffect(() => {
    if (onAIResponse) {
      speakAIResponse(onAIResponse).catch(console.error);
    }
  }, [onAIResponse]);

  return null;
}
