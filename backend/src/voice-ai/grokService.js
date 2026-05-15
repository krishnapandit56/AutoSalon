// ─── GROK SERVICE WITH RULE-BASED FALLBACK ───────────────────────────────────
// Tries Grok API first; falls back to deterministic rule-based conversation
// if Grok is unavailable (no credits, network issues, etc.)

import { buildSystemPrompt } from './prompts.js';
import { normalizeTime } from './intentParser.js';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const TIMEOUT_MS   = 15000;

const getApiKey = () => process.env.GROK_API_KEY;
const getModel  = () => process.env.GROK_MODEL || 'grok-3-mini-fast';

// ─── SERVICE / TIER MATCHERS (mirrors intentParser) ──────────────────────────
const SERVICE_MAP = {
  'hair': 'Haircut', 'haircut': 'Haircut', 'haircuts': 'Haircut',
  'facial': 'Facial', 'face': 'Facial',
  'massage': 'Massage',
  'wax': 'Waxing', 'waxing': 'Waxing',
  'thread': 'Threading', 'threading': 'Threading', 'eyebrow': 'Threading',
  'mani': 'Manicure', 'manicure': 'Manicure', 'nails': 'Manicure',
  'pedi': 'Pedicure', 'pedicure': 'Pedicure',
  'color': 'Hair Color', 'colour': 'Hair Color', 'haircolor': 'Hair Color', 'hair color': 'Hair Color',
  'detan': 'Detan', 'detanning': 'Detan', 'tan': 'Detan',
  'keratin': 'Keratin',
  'blowout': 'Blowout', 'blowdry': 'Blowout', 'blow': 'Blowout',
  'cleanup': 'Cleanup', 'clean': 'Cleanup',
};

const matchSvc = (text) => {
  const lower = text.toLowerCase();
  for (const [k, v] of Object.entries(SERVICE_MAP)) {
    if (lower.includes(k)) return v;
  }
  return null;
};

const matchTier = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('basic') || lower.includes('standard') || lower.includes('simple')) return 'Basic';
  if (lower.includes('intermediate') || lower.includes('mid') || lower.includes('medium') || lower.includes('normal')) return 'Intermediate';
  if (lower.includes('expert') || lower.includes('luxury') || lower.includes('premium') || lower.includes('best') || lower.includes('advanced')) return 'Expert';
  return null;
};

const matchTime = (text) => {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m|p\.m)/i);
  if (m) return normalizeTime(m[0]);
  // Spoken formats
  if (/eleven/.test(text)) return '11am';
  if (/twelve|noon/.test(text)) return '12pm';
  if (/one\s*(pm|o.clock)?/.test(text) && !/eleven/.test(text)) return '1pm';
  if (/two\s*(pm)?/.test(text)) return '2pm';
  if (/three\s*(pm)?/.test(text)) return '3pm';
  if (/four\s*(pm)?/.test(text)) return '4pm';
  if (/five\s*(pm)?/.test(text)) return '5pm';
  if (/six\s*(pm)?/.test(text)) return '6pm';
  if (/seven\s*(pm)?/.test(text)) return '7pm';
  if (/eight\s*(pm)?/.test(text)) return '8pm';
  if (/nine\s*(pm)?/.test(text)) return '9pm';
  if (/ten\s*(pm)?/.test(text)) return '10pm';
  return null;
};

const toTitle = (s) => s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

// ─── RULE-BASED ENGINE ────────────────────────────────────────────────────────
// Deterministic fallback that handles the entire booking conversation without LLM.
const ruleBasedResponse = (speechResult, currentData = {}) => {
  const lower   = speechResult.toLowerCase();
  const extracted = {};

  // Extract service
  const svc = matchSvc(lower);
  if (svc) extracted.service = svc;

  // Extract tier
  const tier = matchTier(lower);
  if (tier) extracted.tier = tier;

  // Extract time (digits or spoken)
  const time = matchTime(lower);
  if (time) extracted.slot_time = time;

  // Extract name — "my name is X" / "I am X" / plain name after we asked for it
  const nameM = lower.match(/(?:(?:my\s+)?name\s+is|i\s+am|i'm|call\s+me)\s+([a-z]+(?:\s+[a-z]+)?)/i)
             || lower.match(/^([a-z]{2,}(?:\s+[a-z]{2,})?)$/) ;  // plain "Priya" or "Krishna Pandit"
  if (nameM && nameM[1] && !matchSvc(nameM[1]) && !matchTier(nameM[1])) {
    extracted.name = toTitle(nameM[1].trim());
  }

  // Extract age
  const ageM = lower.match(/(?:i\s+am|i'm|age(?:\s+is)?|aged?)\s+(\d+)/i)
             || lower.match(/^(\d{1,3})$/);
  if (ageM) {
    const age = parseInt(ageM[1]);
    if (age >= 5 && age <= 100) extracted.age = age;
  }

  // Extract gender
  if (/\b(female|woman|girl|ladies|f\b)\b/.test(lower)) extracted.gender = 'Female';
  else if (/\b(male|man|boy|gents|m\b)\b/.test(lower)) extracted.gender = 'Male';

  // Merge with current collected data to find what's still missing
  const merged = { ...currentData, ...extracted };

  // Build next question
  let response;
  if (!merged.service) {
    response = 'Which service would you like? We have haircut, facial, massage, waxing, and more.';
  } else if (!merged.tier) {
    response = `Great, ${merged.service}! Would you prefer Basic, Intermediate, or Expert level?`;
  } else if (!merged.slot_time) {
    response = 'What time would you like? We are open from 11 AM to 10 PM.';
  } else if (!merged.name) {
    response = 'Perfect! May I have your name please?';
  } else if (!merged.age) {
    response = `Thank you ${merged.name}! Could you please share your age?`;
  } else if (!merged.gender) {
    response = 'Are you Male or Female?';
  } else {
    response = `Got all your details! ${merged.service} ${merged.tier} at ${merged.slot_time} for ${merged.name}. Shall I confirm this booking?`;
    return JSON.stringify({
      response, extracted, intent: 'confirming',
      ready_to_book: true, needs_clarification: null
    });
  }

  return JSON.stringify({
    response, extracted, intent: 'collecting',
    ready_to_book: false, needs_clarification: null
  });
};

// ─── MAIN askGrok FUNCTION ────────────────────────────────────────────────────
export const askGrok = async (conversationHistory, userMessage, sessionData = {}) => {
  const apiKey = getApiKey();
  const model  = getModel();

  console.log(`[Grok] User said: "${userMessage}"`);

  // Try Grok API first if key is set
  if (apiKey) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const messages = [
        { role: 'system', content: buildSystemPrompt() },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      console.log(`[Grok] → Sending to ${model}...`);

      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 250,
          // No response_format — grok-3-mini models don't support json_object mode
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[Grok] ⚠️ HTTP ${response.status} — falling back to rule engine. Error: ${errText.substring(0, 200)}`);
        // Fall through to rule-based engine
      } else {
        const data    = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        if (content) {
          console.log(`[Grok] ✅ API response: ${content.substring(0, 250)}`);
          return content;
        }
        console.warn('[Grok] ⚠️ Empty API response — falling back to rule engine');
      }

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`[Grok] ⏱ Timed out — falling back to rule engine`);
      } else {
        console.warn(`[Grok] ⚠️ Fetch error: ${err.message} — falling back to rule engine`);
      }
    }
  } else {
    console.log('[Grok] No API key — using rule-based engine directly');
  }

  // ─── Rule-based fallback (works without Grok credits) ──────────────────────
  console.log('[Grok] 🔧 Using rule-based conversation engine');
  return ruleBasedResponse(userMessage, sessionData);
};

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
export const checkGrokHealth = async () => {
  const apiKey = getApiKey();
  const model  = getModel();

  if (!apiKey) {
    return {
      ok: true,  // Rule-based engine works without key
      mode: 'rule-based',
      message: '✅ Running in rule-based mode (no Grok API key set)',
    };
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        ok: true,  // Still OK — rule-based fallback is active
        mode: 'rule-based-fallback',
        grokError: `HTTP ${response.status}: ${errText.substring(0, 150)}`,
        message: `⚠️ Grok API unavailable (${response.status}) — using rule-based fallback. Add credits at console.x.ai`,
      };
    }

    const data  = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '(empty)';

    return {
      ok: true,
      mode: 'grok-api',
      model,
      reply,
      message: `✅ Grok API active · model: ${model}`,
    };

  } catch (err) {
    return {
      ok: true,  // Rule-based still works
      mode: 'rule-based-fallback',
      grokError: err.message,
      message: `⚠️ Grok unreachable — using rule-based fallback: ${err.message}`,
    };
  }
};
