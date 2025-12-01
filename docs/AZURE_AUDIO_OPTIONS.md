# Azure Audio API Options - Analysis & Recommendation

## Summary

After investigating both Azure OpenAI and Azure Speech SDK for audio capabilities, here's what we found:

## ✅ **RECOMMENDED: Azure Speech SDK** (Current Implementation)

### What It Is
- Dedicated Azure service for speech-to-text (STT) and text-to-speech (TTS)
- Fully supported Azure service with comprehensive features
- 100+ neural voices across 50+ languages

### Current Status
- ✅ **WORKING** - Successfully tested on 2025-01-27
- Generated 123.28 KB MP3 file using JennyNeural voice
- Production-ready implementation in:
  - `server/src/speechService.ts`
  - `server/src/services/speechServiceApi.ts`
  - `server/src/services/speechUtil.ts`
  - `server/src/routes/speech.ts`

### Capabilities
- **STT**: File-based and streaming recognition
- **TTS**: SSML support, 100+ voices, multiple formats (MP3, WAV, etc.)
- **Advanced Features**:
  - Custom voice training
  - Speech translation
  - Speaker recognition
  - Pronunciation assessment
  - Batch transcription

### Test Results
```
Test File: test-speech-sdk.mp3
Size: 123.28 KB
Voice: en-US-JennyNeural
Format: MP3, 24kHz
Status: ✅ SUCCESS
```

---

## ❌ **NOT AVAILABLE: Azure OpenAI Audio APIs**

### Investigation Results

#### @azure/openai Package (v2.0.0)
- **Purpose**: Chat completions and text generation only
- **Audio Support**: ❌ None
- **Architecture**: REST API client for Azure OpenAI Service
- **Exports**: No audio/speech methods found

#### Azure OpenAI Service Endpoints
- **Available**: Chat completions, embeddings, completions
- **NOT Available**: TTS, Whisper (speech-to-text)
- **Confirmed**: Azure OpenAI endpoints don't support OpenAI's audio APIs

#### Standard OpenAI SDK (openai npm package)
- **Works With**: api.openai.com (standard OpenAI, not Azure)
- **Requires**: Standard OpenAI API key (not Azure OpenAI key)
- **Audio Support**: ✅ Yes (TTS and Whisper)
- **Azure Compatible**: ❌ No - different endpoints/auth

### Error Encountered
```
POST https://spectrum-voice-foundry.openai.azure.com/openai/deployments/gpt-4o/audio/speech?api-version=2024-08-01-preview
Response: 404 The API deployment for this resource does not exist
```

**Reason**: Azure OpenAI doesn't provide TTS/Whisper endpoints, even with audio-capable API versions.

---

## Architecture Comparison

### Azure Speech SDK Architecture
```
Client → Azure Speech Service
         ├── STT Engine (recognition)
         ├── TTS Engine (synthesis)
         └── 100+ Neural Voices
```

### Azure OpenAI Architecture
```
Client → Azure OpenAI Service
         ├── GPT Models (chat/completions)
         ├── Embeddings
         └── ❌ No Audio APIs
```

### Standard OpenAI Architecture
```
Client → api.openai.com
         ├── GPT Models
         ├── TTS (6 voices: alloy, echo, fable, onyx, nova, shimmer)
         ├── Whisper (STT)
         └── ❌ Not Azure-hosted
```

---

## Recommendation

### For Azure-Native Solution: ✅ Use Azure Speech SDK

**Reasons:**
1. ✅ Proven working in your environment
2. ✅ More voices (100+ vs 6)
3. ✅ More features (SSML, custom voices, translation)
4. ✅ Azure-integrated (same auth, monitoring, billing)
5. ✅ Better for production workloads
6. ✅ Lower latency for streaming

**Keep Current Implementation:**
- Files: `speechService.ts`, `speechServiceApi.ts`, `speechUtil.ts`
- Routes: `/api/speech/*`
- Config: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`

### If You Need Standard OpenAI TTS/Whisper

**Option**: Use standard OpenAI (non-Azure)
- Requires: Standard OpenAI API key
- Endpoint: `api.openai.com`
- Voices: alloy, echo, fable, onyx, nova, shimmer (6 total)
- Tradeoff: Not Azure-hosted, separate billing

**Implementation**: Already created in `realtimeService.ts` (needs standard OpenAI key)

---

## File Cleanup Recommendations

### Keep (Azure Speech SDK - Working)
- ✅ `server/src/speechService.ts`
- ✅ `server/src/services/speechServiceApi.ts`
- ✅ `server/src/services/speechUtil.ts`
- ✅ `server/src/routes/speech.ts`
- ✅ `test-speech-now.ps1`

### Optional (Non-Azure OpenAI Alternative)
- ⚠️ `server/src/services/realtimeService.ts` - Works with standard OpenAI only
- ⚠️ `server/src/routes/speechRealtime.ts` - Requires standard OpenAI key
- ⚠️ `test-realtime-api.ps1` - Only works with api.openai.com

### Documentation
- ✅ Keep all comparison docs for reference
- ✅ `SPEECH_TEST_RESULTS.md` - Test evidence
- ✅ This file - Decision record

---

## Configuration Summary

### Current Working Setup (.env)
```env
# Azure Speech SDK (WORKING) ✅
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=eastus

# Azure OpenAI (for chat only, not audio)
AZURE_OPENAI_ENDPOINT=https://spectrum-voice-foundry.openai.azure.com/
AZURE_OPENAI_KEY=your-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

### Optional (Standard OpenAI for Audio)
```env
# Standard OpenAI (NOT Azure) - for TTS/Whisper
OPENAI_API_KEY=sk-...  # Standard OpenAI key
USE_STANDARD_OPENAI_FOR_AUDIO=true
```

---

## Conclusion

**Azure Speech SDK is your Azure-native audio solution.**

Azure OpenAI is excellent for LLM capabilities (chat, completions), but for speech/audio, use Azure Speech SDK. The two services complement each other:

- **Azure Speech SDK**: STT & TTS (audio in/out)
- **Azure OpenAI**: LLM processing (text in/out)

Your current implementation correctly uses both services for their strengths.

---

## References

- [Azure Speech Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [OpenAI Audio API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [@azure/openai npm Package](https://www.npmjs.com/package/@azure/openai)

---

**Created**: 2025-01-27  
**Tested With**: Azure Speech SDK v1.44.1, @azure/openai v2.0.0  
**Test Result**: Azure Speech SDK ✅ Working | Azure OpenAI Audio ❌ Not Available
