# Test Azure Speech SDK Text-to-Speech
Write-Host "🧪 Testing Azure Speech SDK..." -ForegroundColor Cyan

$body = @{
    text = "Hello from Azure Speech SDK! This is a test of the text-to-speech functionality."
    voiceName = "JennyNeural"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri 'http://localhost:5000/api/speech/synthesize' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $body `
        -OutFile 'test-speech-sdk.mp3'
    
    Write-Host "✅ Audio file generated successfully!" -ForegroundColor Green
    
    $file = Get-Item 'test-speech-sdk.mp3'
    Write-Host "`nFile Details:" -ForegroundColor Yellow
    Write-Host "  Name: $($file.Name)"
    Write-Host "  Size: $([math]::Round($file.Length/1KB,2)) KB"
    Write-Host "  Path: $($file.FullName)"
    Write-Host "  Modified: $($file.LastWriteTime)"
    
    Write-Host "`n🎵 You can now play the audio file!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
