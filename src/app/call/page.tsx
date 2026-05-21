'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Video, Mic, Share2, Volume2, PhoneOff, MoreHorizontal, ArrowLeft, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { personalities } from '@/constants/personalities';
import { useSearchParams, useRouter } from 'next/navigation';
import { CallAudio } from '@/components/ui/call-audio';

function CallContent() {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [aiResponse, setAIResponse] = useState<string>('');
     const searchParams = useSearchParams();
    const router = useRouter();
    const personality_id = searchParams.get('personality');

    const personality = personalities.find(p => p.id === personality_id);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsConnecting(false);
            setAIResponse(`Hi, I'm ${personality?.name}. How can I help you today?`);
        }, 3000);

        const audio = new Audio('/call-sound.mp3');
        audio.loop = true;
        audio.play().catch(console.error);

        return () => {
            clearTimeout(timer);
            audio.pause();
            audio.currentTime = 0;
        };
    }, [personality?.name]);

    const handleSpeechResult = async (text: string) => {
        try {
            const response = await fetch('/api/chat2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [{ content: text, sender: 'user' }],
                    personality: personality
                })
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessageContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                aiMessageContent += chunk;
                setAIResponse(aiMessageContent);
            }
        } catch (error) {
            console.error('Error getting AI response:', error);
            setAIResponse('Sorry, I encountered an error. Please try again.');
        }
    };

    if (!personality) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-950 to-gray-950 flex items-center justify-center">
                <h1 className="text-2xl text-white">Personality not found</h1>
            </div>
        );
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    const handleBack = () => {
        router.push('/');
    };

    const mainContent = (
        <div className={cn(
            "flex flex-col items-center justify-between",
            isMinimized ? "fixed bottom-4 right-4 w-64 h-96 rounded-2xl shadow-2xl overflow-hidden" : "min-h-screen w-full p-4",
            "bg-gradient-to-b from-emerald-900 via-emerald-950 to-gray-950 transition-all duration-300"
        )}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex items-center justify-between text-white py-4 px-2 sm:px-6"
            >
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={handleBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10" onClick={handleMinimize}>
                        {isMinimized ? <Maximize2 className="h-6 w-6" /> : <Minimize2 className="h-6 w-6" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                        <MoreHorizontal className="h-6 w-6" />
                    </Button>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex-1 flex flex-col items-center justify-center gap-6"
            >
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-emerald-400 shadow-lg shadow-emerald-900/20">
                    <Image
                        src={personality.avatar}
                        alt={personality.name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    {isConnecting && (
                        <motion.div
                            className="absolute inset-0 bg-black/40 flex items-center justify-center"
                            animate={{ opacity: [0.4, 0.6, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
                        </motion.div>
                    )}
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center"
                >
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{personality.name}</h1>
                    <p className="text-emerald-300 text-lg font-medium mb-2">{personality.role}</p>
                    {!isMinimized && <p className="text-emerald-200/80 text-sm">{personality.description}</p>}
                    {isConnecting && (
                        <p className="text-emerald-400 mt-4 animate-pulse">Connecting...</p>
                    )}
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={cn(
                    "w-full max-w-md bg-black/20 backdrop-blur-sm rounded-full p-4 shadow-lg",
                    isMinimized ? "mb-4 mx-2" : "mb-8"
                )}
            >
                <div className="flex items-center justify-between px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full transition-all duration-300",
                            isVideoOn
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        onClick={() => setIsVideoOn(!isVideoOn)}
                        disabled
                    >
                        <Video className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full transition-all duration-300",
                            isMuted
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        <Mic className="h-6 w-6" />
                    </Button>
                    <CallAudio
                        isMuted={isMuted}
                        onSpeechResult={handleSpeechResult}
                        onAIResponse={aiResponse}
                    />
                    {!isMinimized && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                            >
                                <Share2 className="h-6 w-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                            >
                                <Volume2 className="h-6 w-6" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-full hover:bg-red-600/90 transition-all duration-300 hover:scale-105 active:scale-95"
                        onClick={handleBack}
                    >
                        <PhoneOff className="h-6 w-6" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                key="call-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {mainContent}
            </motion.div>
        </AnimatePresence>
    );
}

export default function CallPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full bg-gradient-to-b from-emerald-900 via-emerald-950 to-gray-950 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
        </div>}>
            <CallContent />
        </Suspense>
    );
}
