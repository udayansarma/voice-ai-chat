import OpenAI from 'openai';
import { config } from '../config/env';
import statsService from './statsService';
import { Response } from 'express';

// Note: Realtime API is currently in beta and may require specific OpenAI SDK version
// We'll use the documented approach from Microsoft Learn code samples

/**
 * Create a WAV file header for PCM audio data
 * @param dataLength - Length of the PCM audio data in bytes
 * @param sampleRate - Sample rate (default: 24000 Hz for Realtime API)
 * @param numChannels - Number of channels (default: 1 for mono)
 * @param bitsPerSample - Bits per sample (default: 16 for PCM16)
 */
function createWavHeader(
  dataLength: number,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const header = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4); // File size - 8
  header.write('WAVE', 8);
  
  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // ByteRate
  header.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);
  
  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  
  return header;
}

/**
 * Azure OpenAI GPT-4o Realtime API Service
 * 
 * This service provides real-time speech-to-text and text-to-speech capabilities using
 * Azure OpenAI's GPT-4o Realtime API with WebSocket connection.
 * 
 * Key features:
 * - Real-time bidirectional audio streaming
 * - Server-side Voice Activity Detection (VAD)
 * - 6 voice options (alloy, echo, fable, onyx, nova, shimmer)
 * - Lower latency for conversational scenarios
 * - Integrated transcription with Whisper
 */

/**
 * Voice mapping from Azure Speech SDK voice names to OpenAI Realtime API voices
 */
const VOICE_MAP: Record<string, string> = {
  // Gender-based mapping
  'Male': 'echo',
  'Female': 'alloy',
  
  // Azure Speech SDK voice name mapping
  'JennyNeural': 'alloy',
  'GuyNeural': 'echo',
  'AriaNeural': 'nova',
  'DavisNeural': 'onyx',
  'JaneNeural': 'shimmer',
  'JasonNeural': 'fable',
  
  // Direct OpenAI voice names
  'alloy': 'alloy',
  'echo': 'echo',
  'fable': 'fable',
  'onyx': 'onyx',
  'nova': 'nova',
  'shimmer': 'shimmer'
};

interface RealtimeConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

/**
 * Get Azure OpenAI Realtime API configuration from environment variables
 */
function getRealtimeConfig(): RealtimeConfig {
  const endpoint = config.azureOpenAiRealtimeEndpoint;
  const apiKey = config.azureOpenAiRealtimeKey;
  const deployment = config.azureOpenAiRealtimeDeployment || 'gpt-realtime';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI Realtime endpoint and API key are required for Realtime API');
  }

  return { endpoint, apiKey, deployment };
}

/**
 * Create Azure OpenAI Realtime WebSocket client
 * Uses the azure() static method specifically for Azure OpenAI deployments
 * 
 * For GA models (gpt-realtime, gpt-realtime-mini): Use API version 2025-08-28 or later
 * For Preview models (gpt-4o-realtime-preview): Use API version 2025-04-01-preview
 */
async function createRealtimeClient(): Promise<any> {
  const { endpoint, apiKey, deployment } = getRealtimeConfig();
  
  console.log(`[Realtime] Creating WebSocket connection:`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Deployment: ${deployment}`);
  
  // Import WebSocket and realtime classes
  const WS = await import('ws');
  const { OpenAIRealtimeWS } = await import('openai/beta/realtime/ws');

  // Determine if this is a GA model or Preview model
  const isGAModel = deployment.startsWith('gpt-realtime') && !deployment.includes('preview');
  
  console.log(`  Model Type: ${isGAModel ? 'GA' : 'Preview'}`);

  if (isGAModel) {
    // For GA models, manually construct the WebSocket URL
    // Format: wss://resource.openai.azure.com/openai/v1/realtime?model=deployment-name
    const baseUrl = endpoint.replace(/\/$/, ''); // Remove trailing slash
    const wsUrl = `${baseUrl.replace('https://', 'wss://')}/v1/realtime?model=${deployment}`;
    
    console.log(`  WebSocket URL: ${wsUrl}`);

    // Create WebSocket with API key authentication
    const socket = new WS.WebSocket(wsUrl, {
      headers: {
        'api-key': apiKey,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // Create a minimal realtime client wrapper
    const realtimeClient: any = {
      socket,
      url: wsUrl,
      _listeners: new Map(),
      
      on(event: string, handler: Function) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(handler);
      },
      
      send(data: any) {
        console.log(`[Realtime] Sending event: ${data.type}`);
        this.socket.send(JSON.stringify(data));
      },
      
      close() {
        this.socket.close();
      }
    };

    // Set up WebSocket event handlers
    socket.on('message', (wsEvent: any) => {
      try {
        const event = JSON.parse(wsEvent.toString());
        console.log(`[Realtime] WebSocket event: ${event.type}`);
        
        const handlers = realtimeClient._listeners.get(event.type) || [];
        handlers.forEach((handler: Function) => handler(event));
        
        // Also emit generic 'server.*' events
        const genericHandlers = realtimeClient._listeners.get('server.*') || [];
        genericHandlers.forEach((handler: Function) => handler(event));
      } catch (err) {
        console.error('[Realtime] Failed to parse WebSocket message:', err, wsEvent.toString());
      }
    });

    socket.on('error', (error: any) => {
      const handlers = realtimeClient._listeners.get('error') || [];
      handlers.forEach((handler: Function) => handler(error));
    });

    socket.on('close', () => {
      const handlers = realtimeClient._listeners.get('close') || [];
      handlers.forEach((handler: Function) => handler());
    });

    // Wait for connection to open
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('WebSocket connection timeout - did not receive session.created'));
      }, 10000);

      socket.on('error', (error: any) => {
        clearTimeout(timeout);
        socket.close();
        reject(error);
      });

      socket.on('open', () => {
        console.log('[Realtime] WebSocket connected, waiting for session.created...');
        
        // Wait for session.created event
        realtimeClient.on('session.created', (event: any) => {
          console.log('[Realtime] Session created successfully');
          clearTimeout(timeout);
          resolve(realtimeClient);
        });
        
        // Ignore error events that don't prevent session creation
        realtimeClient.on('error', (event: any) => {
          console.log('[Realtime] WebSocket error event (may be non-fatal):', event.error?.message);
        });
      });
    });
  } else {
    // For Preview models, use the SDK's azure() method
    const { AzureOpenAI } = await import('openai/azure');
    const apiVersion = '2025-04-01-preview';
    
    console.log(`  API Version: ${apiVersion}`);

    const azureClient = new AzureOpenAI({
      apiKey: apiKey,
      baseURL: endpoint,
      apiVersion: apiVersion,
      deployment: deployment
    });

    const realtimeClient = await OpenAIRealtimeWS.azure(azureClient, {
      deploymentName: deployment
    });
    
    console.log(`  WebSocket URL: ${(realtimeClient as any).url}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      realtimeClient.on('error', (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });

      realtimeClient.on('session.created', () => {
        clearTimeout(timeout);
        resolve(realtimeClient);
      });
    });
  }
}

/**
 * Configure realtime session for audio input/output
 * Based on Microsoft Learn documentation: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio
 */
async function configureRealtimeSession(
  connection: any,
  voice: string = 'alloy'
): Promise<void> {
  console.log(`[Realtime] Skipping session.update - Azure Global Standard may use default configuration`);
  console.log(`[Realtime] Voice setting will need to be configured differently or use default voice`);
  
  // For now, skip session configuration as Azure seems to reject session.update
  // The session.created event includes default configuration
  // We'll use the default session settings
  
  return Promise.resolve();
}

/**
 * Recognize speech from audio data using Azure OpenAI Realtime API
 * 
 * @param audioData - Base64 encoded audio data (PCM format, 24kHz)
 * @returns Transcribed text
 */
export async function recognizeSpeechRealtime(audioData: string): Promise<string> {
  if (!audioData) {
    throw new Error('No audio data provided');
  }

  const startTime = Date.now();
  let connection: any | null = null;
  let transcriptText = '';
  let sessionConfigured = false;

  try {
    // Create WebSocket connection
    connection = await createRealtimeClient();
    
    console.log(`[Realtime STT] WebSocket connection established`);

    // Set up event handlers
    connection.on('error', (error: any) => {
      console.error('[Realtime STT] Error:', error.message);
      throw error;
    });

    connection.on('session.updated', () => {
      sessionConfigured = true;
      console.log('[Realtime STT] Session configured for audio input');
    });

    // Handle transcription completion
    connection.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      transcriptText = event.transcript;
      console.log(`[Realtime STT] Transcription completed: "${transcriptText}"`);
    });

    // Configure session for STT
    await configureRealtimeSession(connection);

    // Wait for configuration
    while (!sessionConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Send audio for transcription
    await connection.send({
      type: 'input_audio_buffer.append',
      audio: audioData
    });

    // Commit the audio buffer
    await connection.send({
      type: 'input_audio_buffer.commit'
    });

    // Wait for transcription (with timeout)
    const timeout = 10000; // 10 seconds
    const startWait = Date.now();
    while (!transcriptText && (Date.now() - startWait) < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!transcriptText) {
      throw new Error('Transcription timeout - no response received');
    }

    const duration = Date.now() - startTime;
    console.log(`[Realtime STT] Completed in ${duration}ms`);

    return transcriptText;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Realtime STT] Failed after ${duration}ms:`, error);
    throw new Error(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      connection.close();
    }
  }
}

/**
 * Synthesize speech from text using Azure OpenAI Realtime API
 * 
 * @param text - Text to convert to speech
 * @param voiceName - Voice name (maps to OpenAI voice)
 * @param voiceGender - Voice gender (fallback if voiceName not provided)
 * @returns Buffer containing audio data (PCM format)
 */
export async function synthesizeSpeechRealtime(
  text: string,
  voiceName?: string,
  voiceGender?: string
): Promise<Buffer> {
  if (!text) {
    throw new Error('No text provided for synthesis');
  }

  // Record stats
  statsService.recordAudioChars(text.length);

  const startTime = Date.now();
  let connection: any | null = null;
  const audioChunks: Buffer[] = [];
  let responseDone = false;

  // Determine voice
  let selectedVoice = 'alloy';
  if (voiceName && VOICE_MAP[voiceName]) {
    selectedVoice = VOICE_MAP[voiceName];
  } else if (voiceGender && VOICE_MAP[voiceGender]) {
    selectedVoice = VOICE_MAP[voiceGender];
  }

  console.log(`[Realtime TTS] Synthesizing text (${text.length} chars) with voice: ${selectedVoice}`);

  try {
    // Create WebSocket connection
    connection = await createRealtimeClient();

    // Set up event handlers
    connection.on('error', (error: any) => {
      console.error('[Realtime TTS] Error:', error.message);
      throw error;
    });

    connection.on('response.output_audio.delta', (event: any) => {
      // Receive audio chunks - event.delta is base64 encoded PCM audio
      const audioBuffer = Buffer.from(event.delta, 'base64');
      audioChunks.push(audioBuffer);
      console.log(`[Realtime TTS] Received audio chunk: ${audioBuffer.length} bytes`);
    });

    connection.on('response.done', () => {
      responseDone = true;
      console.log('[Realtime TTS] Response complete');
    });

    // Log all events for debugging
    connection.on('server.*', (event: any) => {
      console.log(`[Realtime TTS] Event: ${event.type}`);
    });

    // Configure session with voice before generating response
    await configureRealtimeSession(connection, selectedVoice);

    // Send text for synthesis
    await connection.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    });

    // Request response (use default settings from session)
    console.log('[Realtime TTS] Requesting response with default session settings...');
    await connection.send({
      type: 'response.create'
    });

    // Wait for audio generation (with timeout)
    const timeout = 30000; // 30 seconds
    const startWait = Date.now();
    while (!responseDone && (Date.now() - startWait) < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!responseDone) {
      throw new Error('Synthesis timeout - no response received');
    }

    // Concatenate all audio chunks
    const pcmAudioBuffer = Buffer.concat(audioChunks);

    // Create WAV file with header (24kHz, mono, 16-bit PCM)
    const wavHeader = createWavHeader(pcmAudioBuffer.length, 24000, 1, 16);
    const audioBuffer = Buffer.concat([wavHeader, pcmAudioBuffer]);

    const duration = Date.now() - startTime;
    console.log(`[Realtime TTS] Synthesis completed in ${duration}ms, PCM size: ${pcmAudioBuffer.length} bytes, WAV size: ${audioBuffer.length} bytes`);

    return audioBuffer;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Realtime TTS] Synthesis failed after ${duration}ms:`, error);
    throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      connection.close();
    }
  }
}

/**
 * Stream speech synthesis using Azure OpenAI Realtime API
 * 
 * @param text - Text to convert to speech
 * @param res - Express response object to stream audio
 * @param voiceName - Voice name (maps to OpenAI voice)
 * @param voiceGender - Voice gender (fallback if voiceName not provided)
 */
export async function synthesizeSpeechStreamRealtime(
  text: string,
  res: Response,
  voiceName?: string,
  voiceGender?: string
): Promise<void> {
  if (!text) {
    throw new Error('No text provided for synthesis');
  }

  // Record stats
  statsService.recordAudioChars(text.length);

  const startTime = Date.now();
  let connection: any | null = null;
  let sessionConfigured = false;

  // Determine voice
  let selectedVoice = 'alloy';
  if (voiceName && VOICE_MAP[voiceName]) {
    selectedVoice = VOICE_MAP[voiceName];
  } else if (voiceGender && VOICE_MAP[voiceGender]) {
    selectedVoice = VOICE_MAP[voiceGender];
  }

  console.log(`[Realtime TTS Stream] Synthesizing text (${text.length} chars) with voice: ${selectedVoice}`);

  res.setHeader('Content-Type', 'audio/pcm');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    // Create WebSocket connection
    connection = await createRealtimeClient();

    // Set up event handlers
    connection.on('error', (error: any) => {
      console.error('[Realtime TTS Stream] Error:', error.message);
      if (!res.headersSent) {
        res.status(500).send(`Synthesis error: ${error.message}`);
      }
    });

    connection.on('session.updated', () => {
      sessionConfigured = true;
    });

    connection.on('response.audio.delta', (event: any) => {
      // Stream audio chunks directly to response
      const audioBuffer = Buffer.from(event.delta, 'base64');
      res.write(audioBuffer);
    });

    connection.on('response.done', () => {
      res.end();
      const duration = Date.now() - startTime;
      console.log(`[Realtime TTS Stream] Completed in ${duration}ms`);
      if (connection) {
        connection.close();
      }
    });

    // Configure session for TTS
    await configureRealtimeSession(connection, selectedVoice);

    // Wait for configuration
    while (!sessionConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Send text for synthesis
    await connection.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    });

    // Request response with audio
    await connection.send({
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: 'Please respond with speech.'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Realtime TTS Stream] Failed after ${duration}ms:`, error);
    if (!res.headersSent) {
      res.status(500).send(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    if (connection) {
      connection.close();
    }
  }
}

/**
 * Get information about the Realtime API service
 */
export function getRealtimeInfo() {
  const { endpoint, deployment } = getRealtimeConfig();
  
  return {
    service: 'Azure OpenAI Realtime API',
    model: deployment,
    endpoint: endpoint,
    features: {
      stt: true,
      tts: true,
      streaming: true,
      realtimeAudio: true,
      voiceActivityDetection: true,
      whisperTranscription: true
    },
    voices: Object.keys(VOICE_MAP).filter(k => !['Male', 'Female'].includes(k)),
    audioFormat: 'PCM 24kHz',
    latency: 'Low (WebSocket-based)',
    note: 'Requires gpt-4o-realtime deployment in Azure OpenAI'
  };
}
