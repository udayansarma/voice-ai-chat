# Azure OpenAI Realtime API Implementation

This document explains the Azure OpenAI GPT-4o Realtime API implementation for real-time speech-to-text and text-to-speech capabilities.

## Overview

The Azure OpenAI Realtime API provides low-latency, "speech in, speech out" conversational interactions using WebSocket connections. This implementation replaces or augments the traditional Azure Speech SDK with a more integrated solution.

**Implementation File:** `server/src/services/realtimeService.ts`

## Key Features

✅ **Real-time Audio Streaming** - Bidirectional audio streaming over WebSocket  
✅ **Server-side VAD** - Automatic voice activity detection  
✅ **Integrated Transcription** - Built-in Whisper model for STT  
✅ **6 Voice Options** - alloy, echo, fable, onyx, nova, shimmer  
✅ **Low Latency** - WebSocket-based for faster response times  
✅ **Unified API** - Single model handles both STT and TTS

## Supported Models

The following models are available for global deployments in **East US 2** and **Sweden Central** regions:

- `gpt-4o-realtime-preview` (2024-12-17) - Recommended
- `gpt-4o-mini-realtime-preview` (2024-12-17)
- `gpt-realtime` (2025-08-28)
- `gpt-realtime-mini` (2025-10-06)

**Required API Version:** `2025-04-01-preview` or later

## Configuration

### Environment Variables

Add to your `server/.env` file:

```env
# Azure OpenAI Realtime API Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
USE_REALTIME_API=true
```

### Prerequisites

1. **Azure OpenAI Resource** - Created in East US 2 or Sweden Central
2. **Model Deployment** - Deploy `gpt-4o-realtime-preview` model
3. **OpenAI SDK** - Version 5.8.2+ (already installed)
4. **WebSocket Support** - `ws` package (already installed)

## API Endpoints

The service provides HTTP endpoints that wrap the WebSocket Realtime API:

### 1. Speech Recognition (STT)

```http
POST /api/speech-realtime/recognize
Content-Type: application/json

{
  "audioData": "base64-encoded-pcm-audio"
}
```

**Response:**
```json
{
  "text": "transcribed text from audio"
}
```

### 2. Speech Synthesis (TTS)

```http
POST /api/speech-realtime/synthesize
Content-Type: application/json

{
  "text": "Hello, world!",
  "voiceName": "alloy"
}
```

**Response:** Binary PCM audio data (24kHz)

### 3. Streaming Speech Synthesis

```http
POST /api/speech-realtime/synthesize/stream
Content-Type: application/json

{
  "text": "Hello, world!",
  "voiceName": "nova"
}
```

**Response:** Chunked PCM audio stream

### 4. Service Info

```http
GET /api/speech-realtime/info
```

**Response:**
```json
{
  "service": "Azure OpenAI Realtime API",
  "model": "gpt-4o-realtime-preview",
  "features": {
    "stt": true,
    "tts": true,
    "streaming": true,
    "realtimeAudio": true
  },
  "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
}
```

## Voice Mapping

The service maps Azure Speech SDK voice names to OpenAI Realtime voices:

| Azure Speech Voice | OpenAI Voice | Gender |
|-------------------|--------------|---------|
| JennyNeural | alloy | Female |
| GuyNeural | echo | Male |
| AriaNeural | nova | Female |
| DavisNeural | onyx | Male |
| JaneNeural | shimmer | Female |
| JasonNeural | fable | Male |

## Audio Format

- **Input Format:** PCM 16-bit, 24kHz, mono
- **Output Format:** PCM 16-bit, 24kHz, mono
- **Encoding:** Base64 for JSON transport

## How It Works

### WebSocket Connection Flow

1. **Client Creation** - Create Azure OpenAI client with proper API version
2. **WebSocket Establishment** - Connect to `/openai/realtime` endpoint
3. **Session Configuration** - Send `session.update` event with:
   - Voice selection
   - Audio formats (pcm16)
   - Transcription model (whisper-1)
   - Turn detection (server_vad)
4. **Event Handling** - Listen for:
   - `session.created` - Connection established
   - `session.updated` - Configuration confirmed
   - `response.audio.delta` - Audio chunks arriving
   - `conversation.item.input_audio_transcription.completed` - Transcription ready
   - `response.done` - Response complete

### Speech-to-Text Flow

```
Client → input_audio_buffer.append (send audio)
Client → input_audio_buffer.commit (finalize)
Server → conversation.item.created
Server → conversation.item.input_audio_transcription.completed
Client ← transcript text
```

### Text-to-Speech Flow

```
Client → conversation.item.create (send text)
Client → response.create (request audio)
Server → response.audio.delta (stream chunks)
Server → response.audio.delta (more chunks...)
Server → response.done
Client ← concatenated audio buffer
```

## Code Example

### Basic Usage

```typescript
import { 
  recognizeSpeechRealtime, 
  synthesizeSpeechRealtime 
} from './services/realtimeService';

// Speech-to-Text
const audioBase64 = "..."; // Base64 encoded PCM audio
const transcript = await recognizeSpeechRealtime(audioBase64);
console.log('User said:', transcript);

// Text-to-Speech
const text = "Hello! How can I help you today?";
const audioBuffer = await synthesizeSpeechRealtime(text, 'alloy');
// audioBuffer contains PCM audio data
```

### Streaming Example

```typescript
import { synthesizeSpeechStreamRealtime } from './services/realtimeService';

app.post('/tts-stream', async (req, res) => {
  const { text } = req.body;
  await synthesizeSpeechStreamRealtime(text, res, 'nova');
  // Audio chunks are automatically streamed to res
});
```

## Testing

### Test with PowerShell

```powershell
# Start the server
cd C:\Users\udsarm\source\repos\voice-ai-chat\server
npx ts-node src/index.ts

# Test TTS (in another terminal)
$body = @{ 
  text = "Testing Azure OpenAI Realtime API"
  voiceName = "alloy" 
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'http://localhost:5000/api/speech-realtime/synthesize' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $body `
  -OutFile 'test-realtime.pcm'

# Check file size
Get-Item test-realtime.pcm | Select Name, Length
```

### Test Info Endpoint

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:5000/api/speech-realtime/info' `
  -Method GET | ConvertTo-Json
```

## Comparison with Azure Speech SDK

| Feature | Azure Speech SDK | Azure OpenAI Realtime |
|---------|-----------------|---------------------|
| **Latency** | ~200-500ms | ~100-300ms (lower) |
| **Voices** | 100+ neural voices | 6 optimized voices |
| **Languages** | 100+ languages | English optimized |
| **Audio Format** | MP3, WAV, etc. | PCM only |
| **API** | REST + WebSocket | WebSocket only |
| **Transcription** | Built-in | Whisper integration |
| **Conversation** | Separate STT/TTS | Unified session |
| **Cost** | Per character | Per token |

## Advantages of Realtime API

1. **Lower Latency** - Direct WebSocket connection eliminates HTTP overhead
2. **Unified Context** - Single conversation session maintains context
3. **Simpler Integration** - One API for both STT and TTS
4. **Better for Chatbots** - Optimized for conversational AI
5. **Voice Activity Detection** - Built-in server-side VAD

## Limitations

1. **Audio Format** - Only PCM 16-bit 24kHz supported
2. **Fewer Voices** - Only 6 voices vs 100+ in Speech SDK
3. **Language Support** - Best for English (primary optimization)
4. **Regional Availability** - Only East US 2 and Sweden Central
5. **Beta Status** - API may change before GA

## Troubleshooting

### Connection Errors

```
Error: Azure OpenAI endpoint and API key are required
```
**Solution:** Verify `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY` in `.env`

### Deployment Not Found

```
Error: Deployment 'gpt-4o-realtime-preview' not found
```
**Solution:** Deploy the model in Azure OpenAI Studio in supported region

### API Version Error

```
Error: Invalid API version
```
**Solution:** Ensure using API version `2025-04-01-preview` or later

### Timeout Errors

```
Error: Transcription timeout - no response received
```
**Solution:** 
- Check audio format (must be PCM 16-bit 24kHz)
- Verify audio data is not empty
- Ensure WebSocket connection is stable

## References

- [Azure OpenAI Realtime Audio Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio)
- [Realtime API Reference](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/realtime-audio-reference)
- [OpenAI SDK Documentation](https://github.com/openai/openai-node)
- [Supported Models](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/models#audio-models)

## Migration Guide

To switch from Azure Speech SDK to Realtime API:

1. **Update Environment Variables**
   ```env
   USE_REALTIME_API=true
   AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
   ```

2. **Update Client Code**
   ```typescript
   // OLD: Azure Speech SDK
   import { synthesizeSpeech } from './services/speechServiceApi';
   
   // NEW: Realtime API
   import { synthesizeSpeechRealtime } from './services/realtimeService';
   ```

3. **Update Endpoints**
   - `/api/speech/synthesize` → `/api/speech-realtime/synthesize`
   - `/api/speech/recognize` → `/api/speech-realtime/recognize`

4. **Test Thoroughly**
   - Verify audio quality
   - Test latency improvements
   - Validate voice mappings
   - Check error handling

## Next Steps

- [ ] Deploy `gpt-4o-realtime-preview` model in Azure
- [ ] Test STT functionality with audio samples
- [ ] Test TTS with various voices
- [ ] Compare latency with Azure Speech SDK
- [ ] Update frontend to use new endpoints
- [ ] Implement proper error handling
- [ ] Add audio format conversion if needed
- [ ] Monitor token usage and costs

## Support

For issues or questions:
1. Check Azure OpenAI deployment status
2. Verify API version compatibility
3. Review server logs for WebSocket errors
4. Consult Microsoft Learn documentation
5. Test with minimal audio samples first
