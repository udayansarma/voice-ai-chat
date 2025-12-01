/**
 * Test script for Azure OpenAI Realtime API TTS with Personas
 * 
 * This script generates speech samples for different personas using the Realtime API.
 * It demonstrates voice synthesis capabilities with various emotional contexts and scenarios.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const SERVER_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(__dirname, 'tts-samples');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface Persona {
  id: string;
  name: string;
  demographics: any;
  behavior: string;
  needs: string;
  painpoints: string;
}

interface TestScenario {
  personaId: string;
  mood: string;
  voice: string;
  text: string;
  description: string;
}

/**
 * Load all personas from the personas directory
 */
function loadPersonas(): Persona[] {
  const personasDir = path.join(__dirname, 'src', 'personas');
  const personaFiles = fs.readdirSync(personasDir).filter(f => f.endsWith('.json'));
  
  return personaFiles.map(file => {
    const content = fs.readFileSync(path.join(personasDir, file), 'utf-8');
    return JSON.parse(content);
  });
}

/**
 * Generate test scenarios based on personas
 */
function generateScenarios(): TestScenario[] {
  const scenarios: TestScenario[] = [
    // Tech-Savvy Family - Different moods and situations
    {
      personaId: 'tech-savvy-family',
      mood: 'frustrated',
      voice: 'alloy',
      text: "Our internet keeps dropping during my kids' online classes. This is the third time this week! We need a stable connection for remote learning and work.",
      description: 'Frustrated parent dealing with connectivity issues'
    },
    {
      personaId: 'tech-savvy-family',
      mood: 'satisfied',
      voice: 'nova',
      text: "Thank you so much! The new router has been working perfectly. The kids can stream their classes without any buffering, and I can work from home smoothly.",
      description: 'Satisfied customer after issue resolution'
    },
    
    // Apartment Resident - Service inquiries
    {
      personaId: 'apartment-resident',
      mood: 'curious',
      voice: 'echo',
      text: "Hi, I'm moving to a new apartment next month. Can you tell me about your internet and TV packages? I need something reliable for streaming and video calls.",
      description: 'New customer inquiry'
    },
    {
      personaId: 'apartment-resident',
      mood: 'concerned',
      voice: 'fable',
      text: "I received a bill that's higher than expected. Could you help me understand the charges? I thought my plan included unlimited data.",
      description: 'Billing concern'
    },
    
    // Retired Senior - Simple support needs
    {
      personaId: 'retired-senior',
      mood: 'confused',
      voice: 'shimmer',
      text: "Hello, I'm having trouble with my remote control. The TV won't change channels, and I've tried pressing all the buttons. Can you help me?",
      description: 'Senior needing technical assistance'
    },
    {
      personaId: 'retired-senior',
      mood: 'patient',
      voice: 'onyx',
      text: "Good morning. I'd like to learn how to use the parental controls. My grandchildren visit often, and I want to make sure they watch appropriate content.",
      description: 'Learning about features'
    },
    
    // Busy Retail Owner - Business needs
    {
      personaId: 'busy-retail-owner',
      mood: 'urgent',
      voice: 'echo',
      text: "Our point-of-sale system is down because the internet isn't working. We can't process credit card payments! This is costing me money every minute. I need this fixed immediately.",
      description: 'Urgent business outage'
    },
    {
      personaId: 'busy-retail-owner',
      mood: 'professional',
      voice: 'alloy',
      text: "I'm interested in upgrading to a business plan with higher bandwidth and a service level agreement. What options do you have for retail businesses?",
      description: 'Business upgrade inquiry'
    },
    
    // Young Professional - Mobile and streaming focus
    {
      personaId: 'young-professional',
      mood: 'impatient',
      voice: 'nova',
      text: "I've been on hold for 20 minutes! My streaming service keeps buffering during my favorite shows. I pay for premium internet, so this shouldn't be happening.",
      description: 'Impatient customer with service quality issue'
    },
    {
      personaId: 'young-professional',
      mood: 'enthusiastic',
      voice: 'shimmer',
      text: "I just saw your new gigabit internet offer! That sounds perfect for my home office setup. Can you tell me more about the installation process and pricing?",
      description: 'Enthusiastic about new service'
    },
    
    // Remote Worker - Reliability critical
    {
      personaId: 'remote-worker',
      mood: 'stressed',
      voice: 'fable',
      text: "I have an important video conference in 30 minutes and my internet just went out. I work from home full-time, so I can't afford this kind of downtime. What can we do right now?",
      description: 'Critical work situation'
    },
    {
      personaId: 'remote-worker',
      mood: 'appreciative',
      voice: 'echo',
      text: "Your technician was fantastic! He not only fixed the connection issue but also optimized my router placement. The upload speed has improved significantly for my video calls. Thank you!",
      description: 'Positive feedback after service'
    },
    
    // Startup Founder - Advanced technical needs
    {
      personaId: 'startup-founder',
      mood: 'analytical',
      voice: 'onyx',
      text: "We're a growing startup with 15 employees. I need to understand your business fiber options, static IP addresses, and redundancy features. Uptime is critical for our cloud-based operations.",
      description: 'Technical business requirements'
    },
    
    // Assisted Living Resident - Accessibility needs
    {
      personaId: 'assisted-living-resident',
      mood: 'gentle',
      voice: 'shimmer',
      text: "Hello dear. My daughter set up this tablet for me, but I can't seem to get the video calls working. Could you explain it slowly? I want to see my grandchildren.",
      description: 'Accessibility and patience needed'
    },
    
    // Digital Nomad - International and mobility
    {
      personaId: 'digital-nomad',
      mood: 'practical',
      voice: 'nova',
      text: "I'm traveling between cities for the next few months. Can I suspend and reactivate my service remotely? I need flexibility without breaking my contract.",
      description: 'Flexible service needs'
    },
    
    // Budget-Conscious Family - Cost sensitivity
    {
      personaId: 'budget-conscious-family',
      mood: 'hopeful',
      voice: 'alloy',
      text: "We're on a tight budget, but we need internet for the kids' schoolwork. Are there any affordable plans or promotions available? We don't need super fast speeds, just reliable.",
      description: 'Cost-conscious service inquiry'
    }
  ];
  
  return scenarios;
}

/**
 * Generate TTS audio for a scenario
 */
async function generateTTS(scenario: TestScenario): Promise<void> {
  console.log(`\n📝 Generating: ${scenario.description}`);
  console.log(`   Persona: ${scenario.personaId} | Mood: ${scenario.mood} | Voice: ${scenario.voice}`);
  console.log(`   Text: "${scenario.text.substring(0, 80)}..."`);
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      `${SERVER_URL}/api/speech-realtime/synthesize`,
      {
        text: scenario.text,
        voiceName: scenario.voice
      },
      {
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    const duration = Date.now() - startTime;
    const audioBuffer = Buffer.from(response.data);
    
    // Create filename
    const filename = `${scenario.personaId}_${scenario.mood}_${scenario.voice}.wav`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Save audio file
    fs.writeFileSync(filepath, audioBuffer);
    
    const sizeKB = (audioBuffer.length / 1024).toFixed(2);
    console.log(`   ✅ Success: ${sizeKB} KB in ${duration}ms`);
    console.log(`   📁 Saved: ${filename}`);
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🎙️  Azure OpenAI Realtime API - TTS Persona Testing');
  console.log('=' .repeat(70));
  
  // Load personas
  const personas = loadPersonas();
  console.log(`\n📋 Loaded ${personas.length} personas`);
  
  // Generate scenarios
  const scenarios = generateScenarios();
  console.log(`📋 Generated ${scenarios.length} test scenarios`);
  
  console.log(`\n📂 Output directory: ${OUTPUT_DIR}`);
  console.log('=' .repeat(70));
  
  // Test server connectivity
  try {
    await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not reachable. Please start the server first.');
    process.exit(1);
  }
  
  // Generate TTS for all scenarios
  let successCount = 0;
  let failureCount = 0;
  
  for (const scenario of scenarios) {
    try {
      await generateTTS(scenario);
      successCount++;
      
      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      failureCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Summary');
  console.log('='.repeat(70));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📁 Audio files saved to: ${OUTPUT_DIR}`);
  console.log('\n💡 You can listen to the generated samples by opening the .wav files');
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
