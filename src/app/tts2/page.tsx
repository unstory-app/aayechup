'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { Play, Pause, RefreshCw } from 'lucide-react';

export default function TTS2Page() {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const words = text.trim().split(/\s+/);

  useEffect(() => {
    setHighlightedWordIndex(-1);
  }, [text]);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (!text) return;

    try {
      setIsPlaying(true);
      setHighlightedWordIndex(-1);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          rate: rate - 1, // Convert from 0.5-2 range to -0.5-1 range
          pitch: pitch - 1, // Convert from 0.5-2 range to -0.5-1 range
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      const audioUrl = data.audioUrl;
      setAudioUrl(audioUrl);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();

        // Word highlighting simulation
        const words = text.trim().split(/\s+/);
        const wordDuration = (audioRef.current.duration || 0) / words.length;
        let wordIndex = 0;

        const highlightInterval = setInterval(() => {
          if (wordIndex < words.length) {
            setHighlightedWordIndex(wordIndex);
            wordIndex++;
          } else {
            clearInterval(highlightInterval);
            setHighlightedWordIndex(-1);
          }
        }, wordDuration * 1000);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          setHighlightedWordIndex(-1);
          clearInterval(highlightInterval);
        };
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsPlaying(false);
      setHighlightedWordIndex(-1);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleResume = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setHighlightedWordIndex(-1);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-950 to-gray-950 flex flex-col items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white text-center">Text to Speech with Highlighting</h1>
          <p className="text-emerald-400 text-center">Convert your text into natural-sounding speech with synchronized highlighting</p>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          className="min-h-[200px] bg-black/20 backdrop-blur-sm border-emerald-400/30 text-white placeholder:text-gray-400"
        />

        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-400/30">
          <div className="text-white text-lg leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                className={`transition-colors duration-200 ${index === highlightedWordIndex ? 'bg-emerald-500 text-white px-1 rounded' : ''}`}
              >
                {word}{' '}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-emerald-400/30">
          <div className="space-y-2">
            <label className="text-sm text-emerald-400">Speech Rate</label>
            <Slider
              value={[rate]}
              onValueChange={(value) => setRate(value[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-emerald-400">Pitch</label>
            <Slider
              value={[pitch]}
              onValueChange={(value) => setPitch(value[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          {isPlaying ? (
            <Button
              onClick={handlePause}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={text ? (speechRef.current ? handleResume : handleSpeak) : undefined}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={!text}
            >
              <Play className="w-4 h-4 mr-2" />
              {speechRef.current ? 'Resume' : 'Speak'}
            </Button>
          )}

          <Button
            onClick={handleStop}
            variant="outline"
            className="border-emerald-400/30 text-emerald-400 hover:bg-emerald-500/10"
            disabled={!isPlaying && !speechRef.current}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </motion.div>
      <audio ref={audioRef} />
    </div>
  );
}
