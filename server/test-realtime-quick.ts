/**
 * Quick test of Realtime API TTS with sample persona conversations
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const SERVER_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(__dirname, 'tts-quick-samples');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const quickTests = [
  {
    name: 'frustrated-customer',
    voice: 'alloy',
    text: "I've been waiting on hold for over 30 minutes! My internet has been down since this morning, and I work from home. This is completely unacceptable!"
  },
  {
    name: 'happy-customer',
    voice: 'nova',
    text: "Thank you so much for your help! The technician was professional and fixed everything quickly. I really appreciate the excellent service!"
  },
  {
    name: 'confused-senior',
    voice: 'shimmer',
    text: "Hello, I'm not very good with technology. My TV remote isn't working, and I don't know what to do. Can you help me step by step?"
  },
  {
    name: 'urgent-business',
    voice: 'echo',
    text: "Our entire office network is down! We can't process any transactions. We need someone here immediately. This is costing us thousands of dollars!"
  },
  {
    name: 'curious-inquiry',
    voice: 'fable',
    text: "Hi! I'm moving to a new apartment next week. What internet plans do you have for streaming and gaming? I need something fast and reliable."
  }
];

async function generateQuickSample(test: typeof quickTests[0]) {
  console.log(`\n🎙️  Generating: ${test.name} (${test.voice})`);
  console.log(`   "${test.text.substring(0, 60)}..."`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${SERVER_URL}/api/speech-realtime/synthesize`,
      { text: test.text, voiceName: test.voice },
      { responseType: 'arraybuffer', timeout: 30000 }
    );
    
    const duration = Date.now() - startTime;
    const audioBuffer = Buffer.from(response.data);
    const filename = `${test.name}_${test.voice}.wav`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    fs.writeFileSync(filepath, audioBuffer);
    
    console.log(`   ✅ ${(audioBuffer.length / 1024).toFixed(1)} KB in ${duration}ms → ${filename}`);
    
  } catch (error) {
    console.error(`   ❌ ${error instanceof Error ? error.message : 'Failed'}`);
  }
}

async function main() {
  console.log('🚀 Quick Realtime API TTS Test\n');
  
  // Check server (skip if not available, just try to generate)
  console.log('ℹ️  Assuming server is running at', SERVER_URL);
  console.log('   (Start with background job if needed)\n');
  
  // Generate samples
  for (const test of quickTests) {
    await generateQuickSample(test);
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log(`\n✅ Done! Audio saved to: ${OUTPUT_DIR}\n`);
}

main();
