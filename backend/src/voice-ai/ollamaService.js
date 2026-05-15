// ─── OLLAMA SERVICE ──────────────────────────────────────────────────────────
// Sends conversation history to local Ollama LLM and returns the AI response.

import { buildSystemPrompt } from './prompts.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3:mini';
const TIMEOUT_MS = 30000; // 30 seconds max wait for phone calls

/**
 * Send a conversation turn to Ollama and get a structured JSON response.
 * @param {Array} conversationHistory - [{role, content}] array
 * @param {string} userMessage - latest user input
 * @returns {Object} - parsed JSON from LLM
 */
export const askOllama = async (conversationHistory, userMessage) => {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`[Ollama] Sending to ${OLLAMA_MODEL}... (${messages.length} messages)`);
    
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.5, // Lower temperature = faster/more stable JSON
          top_p: 0.9,
          num_predict: 150, // Even shorter response for speed
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Ollama returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.message?.content || '';
    
    console.log(`[Ollama] Raw response: ${content.substring(0, 200)}...`);
    return content;

  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      console.error(`[Ollama] Request timed out after ${TIMEOUT_MS / 1000} seconds`);
      return getFallbackResponse('timeout');
    }
    
    console.error('[Ollama] Error:', err.message);
    return getFallbackResponse('error');
  }
};

/**
 * Check if Ollama is running and the model is available.
 */
export const checkOllamaHealth = async () => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return { ok: false, reason: 'Ollama not responding' };
    
    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];
    const hasModel = models.some(m => m.includes(OLLAMA_MODEL));
    
    return {
      ok: true,
      hasModel,
      models,
      message: hasModel
        ? `✅ Ollama running with ${OLLAMA_MODEL}`
        : `⚠️ Ollama running but ${OLLAMA_MODEL} not pulled yet. Run: ollama pull ${OLLAMA_MODEL}`
    };
  } catch (err) {
    return {
      ok: false,
      reason: err.message,
      message: '❌ Ollama not running. Start it with: ollama serve'
    };
  }
};

/**
 * Fallback responses when Ollama is unavailable.
 */
const getFallbackResponse = (reason) => {
  const fallbacks = {
    timeout: JSON.stringify({
      response: "I'm sorry, I'm having a slow moment. Could you repeat that please?",
      extracted: {},
      intent: 'clarifying',
      ready_to_book: false,
      needs_clarification: null
    }),
    error: JSON.stringify({
      response: "I'm sorry, I'm experiencing technical difficulties. Please try calling again in a moment.",
      extracted: {},
      intent: 'error',
      ready_to_book: false,
      needs_clarification: null
    })
  };
  return fallbacks[reason] || fallbacks.error;
};
