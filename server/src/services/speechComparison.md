# Speech Service Implementation Comparison

This document compares the two speech service implementations available in this project.

## Overview

| Feature | Azure Speech SDK | Azure OpenAI Realtime API |
|---------|-----------------|---------------------------|
| **File** | `speechService.ts` + `speechServiceApi.ts` | `realtimeService.ts` |
| **Protocol** | REST API | WebSocket |
| **Primary Use Case** | Standalone STT/TTS | Conversational AI |
| **Latency** | Higher (separate calls) | Lower (integrated) |
| **Setup Complexity** | Medium | Higher (WebSocket management) |

---

## Feature Comparison

### Speech Recognition (STT)

#### Azure Speech SDK (`speechService.ts`)
```typescript
// Current implementation
await recognizeSpeech(audioData)
```

**Pros:**
- ✅ Mature, stable API
- ✅ Excellent accuracy
- ✅ Supports many languages
- ✅ Detailed error messages
- ✅ Simple REST-based API

**Cons:**
- ❌ Separate service from LLM
- ❌ Higher latency for conversational flows
- ❌ Requires file-based audio handling

**Audio Formats:**
- WAV (primary)
- MP3, OGG, FLAC (supported)

---

#### Azure OpenAI Realtime API (`realtimeService.ts`)
```typescript
// New implementation
await recognizeSpeechRealtime(audioData)
```

**Pros:**
- ✅ Integrated with conversational AI
- ✅ Lower latency (WebSocket)
- ✅ Uses Whisper model (same underlying tech)
- ✅ Server-side VAD available

**Cons:**
- ❌ More complex setup (WebSocket)
- ❌ Newer, less mature
- ❌ Requires session management
- ❌ Limited to conversational contexts

**Audio Formats:**
- PCM 24kHz (primary)
- G.711 (supported)

---

### Speech Synthesis (TTS)

#### Azure Speech SDK (`speechUtil.ts`)
```typescript
// Current implementation
await synthesizeSpeech(text, 'female', 'JennyNeural')
```

**Available Voices:**
- `en-US-JennyNeural` (female)
- `en-US-AndrewNeural` (male)
- `en-US-FableTurboMultilingualNeural` (neutral)
- `en-US-Alloy:DragonHDLatestNeural` (HD quality)
- 100+ other Azure Neural voices

**Pros:**
- ✅ Wide variety of voices
- ✅ Multiple languages/accents
- ✅ SSML support for fine control
- ✅ Multiple output formats (MP3, WAV, OGG)
- ✅ Reliable, production-ready

**Cons:**
- ❌ Separate from LLM pipeline
- ❌ Higher latency for conversational AI

**Output Formats:**
- MP3 (24kHz, 160kbps) - default
- PCM (16kHz, 16-bit) - streaming
- Multiple other formats available

---

#### Azure OpenAI Realtime API (`realtimeService.ts`)
```typescript
// New implementation
await synthesizeSpeechRealtime(text, 'female', 'JennyNeural')
// Note: JennyNeural maps to 'alloy' voice
```

**Available Voices:**
- `alloy` - neutral, balanced
- `echo` - male, clear
- `fable` - neutral, expressive
- `onyx` - male, deep
- `nova` - female, energetic
- `shimmer` - female, soft

**Voice Mapping:**
```typescript
'JennyNeural' → 'alloy'
'AndrewNeural' → 'echo'
'FableNeural' → 'fable'
'male' → 'echo'
'female' → 'alloy'
```

**Pros:**
- ✅ Integrated conversational flow
- ✅ Lower latency (no separate API call)
- ✅ Streaming by default
- ✅ Natural conversational tone

**Cons:**
- ❌ Limited voice options (6 voices)
- ❌ No SSML support
- ❌ Less control over prosody
- ❌ PCM format primarily

**Output Format:**
- PCM (24kHz) - primary

---

## Performance Comparison

### Latency

| Scenario | Azure Speech SDK | Realtime API |
|----------|------------------|--------------|
| Simple STT | ~500-1000ms | ~300-600ms |
| Simple TTS | ~300-800ms | ~200-500ms |
| STT → LLM → TTS | 1500-3000ms | 800-1500ms |
| Conversational (multi-turn) | 2000-4000ms | 1000-2000ms |

### Cost Comparison

**Azure Speech SDK:**
- STT: $1 per hour of audio
- TTS: $15 per 1M characters

**Azure OpenAI Realtime API:**
- Audio input: $0.06 per minute
- Audio output: $0.24 per minute
- Text tokens: Standard GPT-4o rates

**Example:**
- 10 min conversation, 50/50 user/assistant
  - **Speech SDK:** ~$0.50 (STT) + ~$0.30 (TTS) = ~$0.80
  - **Realtime API:** ~$0.30 (input) + ~$1.20 (output) = ~$1.50

---

## Use Case Recommendations

### Use Azure Speech SDK When:

1. **Voice-only transcription** (no LLM needed)
2. **Specific voice requirements** (need particular Azure Neural voice)
3. **Multi-language support** (need languages beyond English)
4. **SSML control** (need precise prosody/pronunciation)
5. **Batch processing** (transcribing/synthesizing multiple files)
6. **Cost-sensitive** (for high-volume TTS)

### Use Realtime API When:

1. **Conversational AI** (STT + LLM + TTS pipeline)
2. **Low latency critical** (real-time voice chat)
3. **Server-side VAD** (automatic turn detection)
4. **Voice chat application** (bidirectional conversation)
5. **Integrated solution** (simpler architecture)
6. **OpenAI voices acceptable** (don't need specific Azure voices)

---

## Migration Path

### Option 1: Keep Both (Recommended)
- Use Speech SDK for standalone TTS/STT
- Add Realtime API for conversational features
- Gradual migration based on use cases

### Option 2: Hybrid Approach
```typescript
// Routes can choose implementation
if (isConversational) {
  await recognizeSpeechRealtime(audio);
} else {
  await recognizeSpeech(audio);
}
```

### Option 3: Full Migration
- Replace all calls with Realtime API
- Accept voice mapping trade-offs
- Simplify architecture

---

## Code Examples

### Current Implementation (Azure Speech SDK)

```typescript
// Speech recognition
import { recognizeSpeech } from './services/speechServiceApi';
const text = await recognizeSpeech(audioData);

// Speech synthesis
import { synthesizeSpeech } from './services/speechServiceApi';
const audioBuffer = await synthesizeSpeech(text, 'female', 'JennyNeural');

// Streaming TTS
import { synthesizeSpeechStream } from './services/speechServiceApi';
await synthesizeSpeechStream(text, 'female', res, 'JennyNeural');
```

### New Implementation (Realtime API)

```typescript
// Speech recognition
import { recognizeSpeechRealtime } from './services/realtimeService';
const text = await recognizeSpeechRealtime(audioData);

// Speech synthesis
import { synthesizeSpeechRealtime } from './services/realtimeService';
const audioBuffer = await synthesizeSpeechRealtime(text, 'female', 'JennyNeural');
// Note: 'JennyNeural' automatically maps to 'alloy' voice

// Streaming TTS
import { synthesizeSpeechStreamRealtime } from './services/realtimeService';
await synthesizeSpeechStreamRealtime(text, 'female', res, 'JennyNeural');
```

---

## Environment Variables

### Azure Speech SDK (Current)
```bash
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus
```

### Azure OpenAI Realtime API (New)
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-openai-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime
```

### Both (If using hybrid approach)
```bash
# Speech SDK
AZURE_SPEECH_KEY=your-speech-key
AZURE_SPEECH_REGION=eastus

# Realtime API
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-openai-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime
```

---

## Dependencies

### Azure Speech SDK
```json
{
  "microsoft-cognitiveservices-speech-sdk": "^1.44.1"
}
```

### Azure OpenAI Realtime API
```json
{
  "openai": "^5.2.0"
}
```

---

## Testing

### Test Current Implementation
```bash
# Test speech recognition
curl -X POST http://localhost:5000/api/speech/recognize \
  -H "Content-Type: application/json" \
  -d '{"audioData": "<base64-wav-data>"}'

# Test speech synthesis
curl -X POST http://localhost:5000/api/speech/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voiceName": "JennyNeural"}' \
  --output audio.mp3
```

### Test Realtime Implementation
```bash
# Test speech recognition (requires new endpoint)
curl -X POST http://localhost:5000/api/speech/recognize-realtime \
  -H "Content-Type: application/json" \
  -d '{"audioData": "<base64-wav-data>"}'

# Test speech synthesis (requires new endpoint)
curl -X POST http://localhost:5000/api/speech/synthesize-realtime \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voiceName": "alloy"}' \
  --output audio.pcm
```

---

## Conclusion

**For your voice-ai-chat application:**

1. **Short-term:** Keep Azure Speech SDK for stability
2. **Medium-term:** Add Realtime API endpoints for testing
3. **Long-term:** Evaluate based on:
   - User feedback on voice quality
   - Latency requirements
   - Cost analysis
   - Feature needs (SSML, specific voices)

**Recommendation:** Start with a **hybrid approach** - add Realtime API as an optional feature while keeping the current implementation as the default.
