
import 'dotenv/config';
import { askOllama } from './src/voice-ai/ollamaService.js';

async function test() {
  console.log('Testing askOllama...');
  try {
    const response = await askOllama([], 'I want to book a haircut');
    console.log('Response:', response);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
