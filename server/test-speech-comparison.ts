/**
 * Speech synthesis comparison: Azure OpenAI Realtime API vs Azure Speech SDK
 * 
 * Compares latency, audio quality, and capabilities of both services
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const SERVER_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(__dirname, 'speech-comparison');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface TestCase {
  id: string;
  text: string;
  voice: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    id: 'short-greeting',
    text: 'Hello! How can I help you today?',
    voice: 'alloy',
    description: 'Short greeting (8 words)'
  },
  {
    id: 'medium-response',
    text: 'Thank you for contacting our support team. I understand you\'re experiencing issues with your internet connection. Let me help you troubleshoot this problem right away.',
    voice: 'nova',
    description: 'Medium response (28 words)'
  },
  {
    id: 'long-explanation',
    text: 'I appreciate your patience while we investigate this issue. Based on what you\'ve described, it appears there may be a problem with your router configuration. I\'m going to walk you through a few simple steps to resolve this. First, please locate your router and check if all the indicator lights are on. The power light should be solid green, and the internet light should also be green and stable. If you see any red or amber lights, that could indicate where the problem is. Please let me know what you see.',
    voice: 'echo',
    description: 'Long explanation (96 words)'
  },
  {
    id: 'technical-details',
    text: 'Your account shows that you\'re currently on our standard broadband plan with download speeds up to 100 megabits per second and upload speeds up to 20 megabits per second. If you need faster speeds for multiple devices or streaming in 4K, I can recommend our fiber optic gigabit plan which offers symmetrical speeds of 1 gigabit per second for both download and upload.',
    voice: 'fable',
    description: 'Technical details (68 words)'
  }
];

interface TestResult {
  service: 'realtime' | 'speech-sdk';
  testId: string;
  success: boolean;
  latency: number;
  audioSize: number;
  error?: string;
}

async function testRealtimeAPI(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${SERVER_URL}/api/speech-realtime/synthesize`,
      { text: testCase.text, voiceName: testCase.voice },
      { responseType: 'arraybuffer', timeout: 60000 }
    );
    
    const latency = Date.now() - startTime;
    const audioBuffer = Buffer.from(response.data);
    
    // Save audio file
    const filename = `realtime_${testCase.id}.wav`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), audioBuffer);
    
    return {
      service: 'realtime',
      testId: testCase.id,
      success: true,
      latency,
      audioSize: audioBuffer.length
    };
    
  } catch (error) {
    return {
      service: 'realtime',
      testId: testCase.id,
      success: false,
      latency: Date.now() - startTime,
      audioSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testSpeechSDK(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${SERVER_URL}/api/speech/synthesize`,
      { 
        text: testCase.text,
        voiceGender: 'Female' // Speech SDK uses gender-based selection
      },
      { responseType: 'arraybuffer', timeout: 60000 }
    );
    
    const latency = Date.now() - startTime;
    const audioBuffer = Buffer.from(response.data);
    
    // Save audio file
    const filename = `speech-sdk_${testCase.id}.wav`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), audioBuffer);
    
    return {
      service: 'speech-sdk',
      testId: testCase.id,
      success: true,
      latency,
      audioSize: audioBuffer.length
    };
    
  } catch (error) {
    return {
      service: 'speech-sdk',
      testId: testCase.id,
      success: false,
      latency: Date.now() - startTime,
      audioSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function calculateStats(results: TestResult[]): any {
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return null;
  
  const latencies = successful.map(r => r.latency);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  
  const sizes = successful.map(r => r.audioSize);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  
  return {
    successRate: (successful.length / results.length * 100).toFixed(1) + '%',
    avgLatency: avgLatency.toFixed(0) + 'ms',
    minLatency: minLatency + 'ms',
    maxLatency: maxLatency + 'ms',
    avgSize: (avgSize / 1024).toFixed(1) + ' KB'
  };
}

async function main() {
  console.log('🎯 Speech Synthesis Comparison Test');
  console.log('=' .repeat(80));
  console.log('Comparing Azure OpenAI Realtime API vs Azure Speech SDK\n');
  
  const realtimeResults: TestResult[] = [];
  const speechSDKResults: TestResult[] = [];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Text: "${testCase.text.substring(0, 60)}..."`);
    
    // Test Realtime API
    process.stdout.write('   🔄 Realtime API... ');
    const realtimeResult = await testRealtimeAPI(testCase);
    realtimeResults.push(realtimeResult);
    
    if (realtimeResult.success) {
      console.log(`✅ ${realtimeResult.latency}ms (${(realtimeResult.audioSize / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${realtimeResult.error}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    // Test Speech SDK
    process.stdout.write('   🔄 Speech SDK...   ');
    const speechSDKResult = await testSpeechSDK(testCase);
    speechSDKResults.push(speechSDKResult);
    
    if (speechSDKResult.success) {
      console.log(`✅ ${speechSDKResult.latency}ms (${(speechSDKResult.audioSize / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${speechSDKResult.error}`);
    }
    
    // Compare
    if (realtimeResult.success && speechSDKResult.success) {
      const diff = realtimeResult.latency - speechSDKResult.latency;
      const pct = ((diff / speechSDKResult.latency) * 100).toFixed(1);
      if (diff < 0) {
        console.log(`   ⚡ Realtime API is ${Math.abs(diff)}ms (${Math.abs(Number(pct))}%) faster`);
      } else {
        console.log(`   ⚡ Speech SDK is ${diff}ms (${Math.abs(Number(pct))}%) faster`);
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const realtimeStats = calculateStats(realtimeResults);
  const speechSDKStats = calculateStats(speechSDKResults);
  
  console.log('\n🚀 Azure OpenAI Realtime API:');
  if (realtimeStats) {
    console.log(`   Success Rate:    ${realtimeStats.successRate}`);
    console.log(`   Avg Latency:     ${realtimeStats.avgLatency}`);
    console.log(`   Min Latency:     ${realtimeStats.minLatency}`);
    console.log(`   Max Latency:     ${realtimeStats.maxLatency}`);
    console.log(`   Avg Audio Size:  ${realtimeStats.avgSize}`);
  } else {
    console.log('   No successful tests');
  }
  
  console.log('\n🎤 Azure Speech SDK:');
  if (speechSDKStats) {
    console.log(`   Success Rate:    ${speechSDKStats.successRate}`);
    console.log(`   Avg Latency:     ${speechSDKStats.avgLatency}`);
    console.log(`   Min Latency:     ${speechSDKStats.minLatency}`);
    console.log(`   Max Latency:     ${speechSDKStats.maxLatency}`);
    console.log(`   Avg Audio Size:  ${speechSDKStats.avgSize}`);
  } else {
    console.log('   No successful tests');
  }
  
  console.log(`\n📁 Audio files saved to: ${OUTPUT_DIR}`);
  console.log('   Compare the audio quality by listening to the files\n');
}

main().catch(console.error);
