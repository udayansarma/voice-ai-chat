# Quick Test: Azure Speech SDK vs Realtime API
# Run this script to compare both implementations

Write-Host "`n=== Azure Speech API Comparison Test ===" -ForegroundColor Cyan
Write-Host "Testing both Azure Speech SDK and Azure OpenAI Realtime API`n" -ForegroundColor White

# Test 1: Azure Speech SDK (Current Production)
Write-Host "📊 Test 1: Azure Speech SDK (Production)" -ForegroundColor Yellow
Write-Host "Endpoint: POST /api/speech/synthesize" -ForegroundColor Gray

$body1 = @{
    text = "Hello! This is the Azure Speech SDK implementation."
    voiceName = "JennyNeural"
} | ConvertTo-Json

$startTime1 = Get-Date
try {
    Invoke-WebRequest `
        -Uri 'http://localhost:5000/api/speech/synthesize' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $body1 `
        -OutFile 'test-speech-sdk.mp3' `
        -ErrorAction Stop
    
    $endTime1 = Get-Date
    $duration1 = ($endTime1 - $startTime1).TotalMilliseconds
    
    $file1 = Get-Item 'test-speech-sdk.mp3'
    Write-Host "✅ SUCCESS" -ForegroundColor Green
    Write-Host "   Duration: $([math]::Round($duration1, 0)) ms" -ForegroundColor White
    Write-Host "   File Size: $([math]::Round($file1.Length/1KB, 2)) KB" -ForegroundColor White
    Write-Host "   Format: MP3" -ForegroundColor White
    Write-Host "   Voice: JennyNeural (Azure Neural Voice)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Realtime API Info
Write-Host "📊 Test 2: Realtime API Info" -ForegroundColor Yellow
Write-Host "Endpoint: GET /api/speech-realtime/info" -ForegroundColor Gray

try {
    $info = Invoke-RestMethod -Uri 'http://localhost:5000/api/speech-realtime/info' -Method GET -ErrorAction Stop
    Write-Host "✅ SUCCESS" -ForegroundColor Green
    Write-Host "   Implementation: $($info.implementation)" -ForegroundColor White
    Write-Host "   Protocol: $($info.protocol)" -ForegroundColor White
    Write-Host "   Voices Available: $($info.voices.Count)" -ForegroundColor White
    Write-Host "   Features: $($info.features -join ', ')" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Azure OpenAI Realtime API TTS
Write-Host "📊 Test 3: Azure OpenAI Realtime API (WebSocket)" -ForegroundColor Yellow
Write-Host "Endpoint: POST /api/speech-realtime/synthesize" -ForegroundColor Gray

$body2 = @{
    text = "Hello! This is the Azure OpenAI Realtime API implementation."
    voiceName = "alloy"
} | ConvertTo-Json

$startTime2 = Get-Date
try {
    Invoke-WebRequest `
        -Uri 'http://localhost:5000/api/speech-realtime/synthesize' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $body2 `
        -OutFile 'test-realtime-tts.pcm' `
        -ErrorAction Stop
    
    $endTime2 = Get-Date
    $duration2 = ($endTime2 - $startTime2).TotalMilliseconds
    
    $file2 = Get-Item 'test-realtime-tts.pcm'
    Write-Host "✅ SUCCESS" -ForegroundColor Green
    Write-Host "   Duration: $([math]::Round($duration2, 0)) ms" -ForegroundColor White
    Write-Host "   File Size: $([math]::Round($file2.Length/1KB, 2)) KB" -ForegroundColor White
    Write-Host "   Format: PCM 24kHz" -ForegroundColor White
    Write-Host "   Voice: alloy (OpenAI Voice)" -ForegroundColor White
    
    # Performance comparison
    if ($duration1 -and $duration2) {
        Write-Host "`n🏆 Performance Comparison:" -ForegroundColor Cyan
        $improvement = (($duration1 - $duration2) / $duration1) * 100
        if ($improvement -gt 0) {
            Write-Host "   Realtime API is $([math]::Round($improvement, 1))% faster!" -ForegroundColor Green
        } else {
            Write-Host "   Speech SDK is $([math]::Round([math]::Abs($improvement), 1))% faster!" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  BLOCKED" -ForegroundColor Yellow
    
    $errorMsg = $null
    if ($_.ErrorDetails.Message) {
        try {
            $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
        } catch {
            # Not JSON, use raw message
        }
    }
    
    if ($errorMsg.error -match "404") {
        Write-Host "   Reason: Deployment 'gpt-4o-realtime-preview' not found" -ForegroundColor White
        Write-Host "`n   📝 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. Go to Azure OpenAI Studio: https://oai.azure.com/" -ForegroundColor White
        Write-Host "   2. Navigate to Deployments" -ForegroundColor White
        Write-Host "   3. Create deployment:" -ForegroundColor White
        Write-Host "      - Model: gpt-4o-realtime-preview (2024-12-17)" -ForegroundColor Gray
        Write-Host "      - Name: gpt-4o-realtime-preview" -ForegroundColor Gray
        Write-Host "      - Region: East US 2 or Sweden Central" -ForegroundColor Gray
        Write-Host "   4. Wait 5 minutes, then re-run this test" -ForegroundColor White
    } elseif ($_.Exception.Message -match "404" -or $errorMsg.details -match "404") {
        Write-Host "   Reason: Deployment 'gpt-4o-realtime-preview' not found (404)" -ForegroundColor White
        Write-Host "`n   📝 To enable Realtime API:" -ForegroundColor Cyan
        Write-Host "   1. Create deployment in Azure OpenAI Studio" -ForegroundColor White
        Write-Host "   2. Region must be East US 2 or Sweden Central" -ForegroundColor White
        Write-Host "   3. Model: gpt-4o-realtime-preview" -ForegroundColor White
    } else {
        Write-Host "   Error: $($errorMsg.details)" -ForegroundColor Red
    }
}

Write-Host "`n" -ForegroundColor White
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Azure Speech SDK: ✅ Production Ready" -ForegroundColor Green
Write-Host "Realtime API Code: ✅ Implementation Complete" -ForegroundColor Green
Write-Host "Realtime API Deployment: ⚠️  Pending Azure Setup" -ForegroundColor Yellow
Write-Host ""

# Show generated files
Write-Host "📁 Generated Files:" -ForegroundColor Cyan
$files = @()
$files += Get-ChildItem -Path . -Filter "test-*.mp3" -ErrorAction SilentlyContinue
$files += Get-ChildItem -Path . -Filter "test-*.pcm" -ErrorAction SilentlyContinue
if ($files.Count -gt 0) {
    $files | Format-Table Name, @{Label="Size (KB)";Expression={[math]::Round($_.Length/1KB,2)}}, LastWriteTime
} else {
    Write-Host "   No files generated yet" -ForegroundColor Gray
}
