# Test Azure OpenAI Realtime API Text-to-Speech
Write-Host "`n🧪 Testing Azure OpenAI Realtime API..." -ForegroundColor Cyan

# First, check if the API info endpoint works
Write-Host "`n1️⃣ Checking Realtime API info..." -ForegroundColor Yellow
try {
    $info = Invoke-WebRequest -Uri 'http://localhost:5000/api/speech-realtime/info' -Method GET | 
        ConvertFrom-Json
    Write-Host "✅ Realtime API is available" -ForegroundColor Green
    Write-Host "   Available voices:" -ForegroundColor Gray
    $info.availableVoices | ForEach-Object { Write-Host "     - $_" -ForegroundColor White }
} catch {
    Write-Host "❌ Error getting API info: $_" -ForegroundColor Red
    exit 1
}

# Test text-to-speech synthesis
Write-Host "`n2️⃣ Testing Realtime API text-to-speech..." -ForegroundColor Yellow

$body = @{
    text = "Hello from Azure OpenAI TTS API! This is a test of the new text-to-speech functionality using OpenAI voices."
    voice = "alloy"
    format = "mp3"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri 'http://localhost:5000/api/speech-realtime/synthesize' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $body `
        -OutFile 'test-openai-tts.mp3'
    
    Write-Host "✅ Audio file generated successfully!" -ForegroundColor Green
    
    $file = Get-Item 'test-openai-tts.mp3'
    Write-Host "`nFile Details:" -ForegroundColor Yellow
    Write-Host "  Name: $($file.Name)"
    Write-Host "  Size: $([math]::Round($file.Length/1KB,2)) KB"
    Write-Host "  Path: $($file.FullName)"
    Write-Host "  Modified: $($file.LastWriteTime)"
    Write-Host "  Format: MP3 audio"
    
    Write-Host "`n📊 Comparison:" -ForegroundColor Cyan
    if (Test-Path 'test-speech-sdk.mp3') {
        $sdkFile = Get-Item 'test-speech-sdk.mp3'
        Write-Host "  Azure Speech SDK: $([math]::Round($sdkFile.Length/1KB,2)) KB (MP3)" -ForegroundColor Gray
    }
    Write-Host "  OpenAI TTS API:   $([math]::Round($file.Length/1KB,2)) KB (MP3)" -ForegroundColor White
    
    Write-Host "`n🎵 You can now play the audio file!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n✅ Realtime API test complete!" -ForegroundColor Green
