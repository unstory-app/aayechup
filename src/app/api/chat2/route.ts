import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
    content: string;
    sender: 'user' | 'ai';
}

interface ChatRequest {
    messages: ChatMessage[];
    personality?: {
        name: string;
        role: string;
        traits: string[];
        description: string;
    };
}

if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.deepseek.com",
});

export async function POST(request: Request) {
    try {
        const json = await request.json();
        const { messages, personality } = json as ChatRequest;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Invalid messages format' },
                { status: 400 }
            );
        }

        const systemPrompt = personality
            ? `You are ${personality.name}, ${personality.role} ${personality.description}. Your traits include being ${personality.traits.join(', ')}. Always stay in character and respond as ${personality.name} would, incorporating your role and personality traits naturally in your responses.
            keep your responses under 200 words if possible.
            
            `
            : 'You are a helpful AI assistant. Provide clear, accurate, and engaging responses.';

        // console.log(systemPrompt);

        const response = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((message) => ({
                    role: message.sender === 'user' ? 'user' : 'assistant',
                    content: message.content,
                } as const)),
            ],
            temperature: 0.8,
            max_tokens: 800,
            top_p: 0.9,
            stream: false,
        });

        return NextResponse.json({
            content: response.choices[0].message.content
        });
    } catch (error) {
        console.error('OpenAI API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
