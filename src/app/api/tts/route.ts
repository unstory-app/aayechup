import { NextResponse } from 'next/server';
import axios from 'axios';

const MURF_API_KEY = 'ap2_1bae3ed2-f075-4be3-b347-cfb6ba80dd57';
const MURF_API_URL = 'https://api.murf.ai/v1/speech/generate';

export async function POST(req: Request) {
  try {
    const { text, rate = 0, pitch = 0 } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const data = {
      voiceId: "en-US-natalie",
      style: "Promo",
      text,
      rate,
      pitch,
      sampleRate: 48000,
      format: "MP3",
      channelType: "MONO",
      pronunciationDictionary: {},
      encodeAsBase64: false,
      variation: 1,
      audioDuration: 0,
      modelVersion: "GEN2",
      multiNativeLocale: "en-US"
    };

    const response = await axios({
      method: 'post',
      url: MURF_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': MURF_API_KEY
      },
      data
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: error.response?.status || 500 }
    );
  }
}