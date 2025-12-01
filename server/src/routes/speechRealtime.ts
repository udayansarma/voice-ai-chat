import { Router, Request, Response } from 'express';
import { 
  recognizeSpeechRealtime, 
  synthesizeSpeechRealtime, 
  synthesizeSpeechStreamRealtime 
} from '../services/realtimeService';

const router = Router();

/**
 * POST /api/speech-realtime/recognize
 * Speech recognition using Azure OpenAI Realtime API
 * 
 * Alternative to the Azure Speech SDK implementation.
 * Uses WebSocket-based Realtime API with Whisper transcription.
 */
router.post('/recognize', async (req: Request, res: Response) => {
  try {
    const { audioData } = req.body;
    console.log('[Realtime] Speech recognition request received, audioData length:', audioData?.length || 'undefined');
    
    const result = await recognizeSpeechRealtime(audioData);
    console.log('[Realtime] Speech recognition successful:', result);
    
    res.json({ text: result });
  } catch (error) {
    console.error('[Realtime] Speech recognition failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Speech recognition failed (Realtime API)',
      details: errorMessage,
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    });
  }
});

/**
 * POST /api/speech-realtime/synthesize
 * Text-to-speech using Azure OpenAI Realtime API
 * 
 * Alternative to Azure Speech SDK TTS.
 * Returns PCM audio format (24kHz, 16-bit).
 * 
 * Voice mapping:
 * - JennyNeural → alloy
 * - AndrewNeural → echo
 * - FableNeural → fable
 * - male → echo
 * - female → alloy
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender, voiceName } = req.body;
    console.log('[Realtime] TTS request:', { text: text?.substring(0, 50), voiceGender, voiceName });
    
    const audioBuffer = await synthesizeSpeechRealtime(text, voiceGender, voiceName);
    
    // Return as PCM audio
    res.setHeader('Content-Type', 'audio/wav');
    res.send(audioBuffer);
  } catch (error) {
    console.error('[Realtime] Speech synthesis failed:', error);
    res.status(500).json({ 
      error: 'Speech synthesis failed (Realtime API)',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/speech-realtime/synthesize/stream
 * Streaming text-to-speech using Azure OpenAI Realtime API
 * 
 * Streams audio chunks as they're generated for lower latency.
 */
router.post('/synthesize/stream', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender, voiceName } = req.body;
    console.log('[Realtime] TTS stream request:', { text: text?.substring(0, 50), voiceGender, voiceName });
    
    await synthesizeSpeechStreamRealtime(text, res, voiceName, voiceGender);
  } catch (error) {
    console.error('[Realtime] Speech synthesis streaming failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Speech synthesis streaming failed (Realtime API)',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/speech-realtime/info
 * Get information about Realtime API capabilities and voice mapping
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    implementation: 'Azure OpenAI Realtime API',
    protocol: 'WebSocket',
    models: {
      stt: 'whisper-1',
      tts: 'gpt-4o-realtime'
    },
    voices: [
      { name: 'alloy', description: 'Neutral, balanced' },
      { name: 'echo', description: 'Male, clear' },
      { name: 'fable', description: 'Neutral, expressive' },
      { name: 'onyx', description: 'Male, deep' },
      { name: 'nova', description: 'Female, energetic' },
      { name: 'shimmer', description: 'Female, soft' }
    ],
    voiceMapping: {
      'JennyNeural': 'alloy',
      'AndrewNeural': 'echo',
      'FableNeural': 'fable',
      'male': 'echo',
      'female': 'alloy',
      'neutral': 'shimmer'
    },
    audioFormat: {
      input: 'PCM 24kHz 16-bit',
      output: 'PCM 24kHz 16-bit'
    },
    features: [
      'Low latency',
      'Integrated conversational AI',
      'Server-side VAD',
      'WebSocket streaming'
    ],
    limitations: [
      'Limited voice options (6 voices)',
      'No SSML support',
      'PCM format only'
    ]
  });
});

export default router;
