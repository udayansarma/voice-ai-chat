#!/usr/bin/env pwsh
# Test script for comparing Azure Speech SDK vs Realtime API

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Speech Service Implementation Test" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
$testText = "Hello, this is a test of the speech synthesis system."

# Colors for output
$successColor = "Green"
$errorColor = "Red"
$infoColor = "Yellow"

# Test Azure Speech SDK
Write-Host "1. Testing Azure Speech SDK (Current Implementation)" -ForegroundColor $infoColor
Write-Host "   Endpoint: POST $baseUrl/api/speech/synthesize" -ForegroundColor Gray

try {
    $body = @{
        text = $testText
        voiceName = "JennyNeural"
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/speech/synthesize" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -OutFile "test-output-speech-sdk.mp3"
    
    if (Test-Path "test-output-speech-sdk.mp3") {
        $fileSize = (Get-Item "test-output-speech-sdk.mp3").Length
        Write-Host "   ✓ Success! Audio saved to test-output-speech-sdk.mp3" -ForegroundColor $successColor
        Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
        Write-Host "   Format: MP3 (24kHz)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor $errorColor
}

Write-Host ""

# Test Azure OpenAI Realtime API
Write-Host "2. Testing Azure OpenAI Realtime API (New Implementation)" -ForegroundColor $infoColor
Write-Host "   Endpoint: POST $baseUrl/api/speech-realtime/synthesize" -ForegroundColor Gray

try {
    $body = @{
        text = $testText
        voiceName = "JennyNeural"  # Will map to 'alloy'
    } | ConvertTo-Json

    $response = Invoke-WebRequest `
        -Uri "$baseUrl/api/speech-realtime/synthesize" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -OutFile "test-output-realtime.pcm"
    
    if (Test-Path "test-output-realtime.pcm") {
        $fileSize = (Get-Item "test-output-realtime.pcm").Length
        Write-Host "   ✓ Success! Audio saved to test-output-realtime.pcm" -ForegroundColor $successColor
        Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
        Write-Host "   Format: PCM (24kHz, 16-bit)" -ForegroundColor Gray
        Write-Host "   Note: Voice 'JennyNeural' mapped to 'alloy'" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor $errorColor
}

Write-Host ""

# Get Realtime API info
Write-Host "3. Getting Realtime API Information" -ForegroundColor $infoColor
Write-Host "   Endpoint: GET $baseUrl/api/speech-realtime/info" -ForegroundColor Gray

try {
    $info = Invoke-RestMethod -Uri "$baseUrl/api/speech-realtime/info" -Method GET
    Write-Host "   ✓ Available voices:" -ForegroundColor $successColor
    foreach ($voice in $info.voices) {
        Write-Host "     - $($voice.name): $($voice.description)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "   Voice Mapping:" -ForegroundColor Gray
    $info.voiceMapping.PSObject.Properties | ForEach-Object {
        Write-Host "     $($_.Name) → $($_.Value)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Failed: $($_.Exception.Message)" -ForegroundColor $errorColor
}

Write-Host ""

# Test Speech Recognition (Speech SDK)
Write-Host "4. Testing Speech Recognition - Azure Speech SDK" -ForegroundColor $infoColor
Write-Host "   Note: Requires valid WAV audio file" -ForegroundColor Gray
Write-Host "   (Skipping - requires audio input)" -ForegroundColor Yellow

Write-Host ""

# Test Speech Recognition (Realtime API)
Write-Host "5. Testing Speech Recognition - Realtime API" -ForegroundColor $infoColor
Write-Host "   Note: Requires valid WAV audio file" -ForegroundColor Gray
Write-Host "   (Skipping - requires audio input)" -ForegroundColor Yellow

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if (Test-Path "test-output-speech-sdk.mp3") {
    Write-Host "✓ Azure Speech SDK: Working" -ForegroundColor $successColor
} else {
    Write-Host "✗ Azure Speech SDK: Failed" -ForegroundColor $errorColor
}

if (Test-Path "test-output-realtime.pcm") {
    Write-Host "✓ Realtime API: Working" -ForegroundColor $successColor
} else {
    Write-Host "✗ Realtime API: Failed (may need configuration)" -ForegroundColor $errorColor
}

Write-Host ""
Write-Host "Generated Files:" -ForegroundColor $infoColor
if (Test-Path "test-output-speech-sdk.mp3") {
    Write-Host "  - test-output-speech-sdk.mp3 (playable in any media player)" -ForegroundColor Gray
}
if (Test-Path "test-output-realtime.pcm") {
    Write-Host "  - test-output-realtime.pcm (raw PCM, needs conversion)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To convert PCM to WAV for playback:" -ForegroundColor Yellow
    Write-Host "  ffmpeg -f s16le -ar 24000 -ac 1 -i test-output-realtime.pcm test-output-realtime.wav" -ForegroundColor Gray
}

Write-Host ""
Write-Host "For detailed comparison, see:" -ForegroundColor $infoColor
Write-Host "  server/src/services/IMPLEMENTATION_COMPARISON.md" -ForegroundColor Gray
Write-Host ""
