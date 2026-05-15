// ─── INTENT PARSER ───────────────────────────────────────────────────────────
// Parses the raw LLM text output and extracts structured booking data.

import { SERVICES_LIST, TIERS_LIST } from './prompts.js';

/**
 * Parse raw Ollama response text into structured intent object.
 * The LLM is prompted to return JSON, but we handle failures gracefully.
 */
export const parseIntent = (rawResponse) => {
  // 1. Try to extract JSON from the response
  let parsed = null;

  // Direct JSON parse
  try {
    parsed = JSON.parse(rawResponse.trim());
  } catch {
    // Try to find JSON block within the text (LLM sometimes adds preamble)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }
  }

  // 2. If JSON parse failed entirely, build a minimal fallback
  if (!parsed) {
    console.warn('[IntentParser] Could not parse JSON, using plain text as response');
    return {
      response: sanitizeForSpeech(rawResponse),
      extracted: {},
      intent: 'collecting',
      ready_to_book: false,
      needs_clarification: null
    };
  }

  // 3. Validate and normalize extracted fields
  const extracted = parsed.extracted || {};
  const normalized = normalizeExtracted(extracted);

  return {
    response: sanitizeForSpeech(parsed.response || 'Could you please repeat that?'),
    extracted: normalized,
    intent: parsed.intent || 'collecting',
    ready_to_book: parsed.ready_to_book === true,
    needs_clarification: parsed.needs_clarification || null
  };
};

/**
 * Normalize extracted fields: fuzzy match services, fix capitalizations, etc.
 */
const normalizeExtracted = (extracted) => {
  const result = {};

  // Normalize service name (fuzzy match)
  if (extracted.service) {
    result.service = matchService(String(extracted.service));
  }

  // Normalize tier
  if (extracted.tier) {
    result.tier = matchTier(String(extracted.tier));
  }

  // Normalize time slot
  if (extracted.slot_time) {
    result.slot_time = normalizeTime(String(extracted.slot_time));
  }

  // Name — title case
  if (extracted.name && String(extracted.name).length > 1) {
    result.name = toTitleCase(String(extracted.name).trim());
  }

  // Age — must be a number between 5 and 100
  if (extracted.age) {
    const age = parseInt(extracted.age, 10);
    if (!isNaN(age) && age >= 5 && age <= 100) {
      result.age = age;
    }
  }

  // Gender — normalize
  if (extracted.gender) {
    result.gender = normalizeGender(String(extracted.gender));
  }

  // City — title case
  if (extracted.city && String(extracted.city).trim().length > 1) {
    result.city = toTitleCase(String(extracted.city).trim());
  }

  return result;
};

/**
 * Fuzzy match user input to known service names.
 */
const matchService = (input) => {
  const lower = input.toLowerCase().replace(/[_\s]/g, '');
  for (const svc of SERVICES_LIST) {
    if (lower === svc.toLowerCase().replace(/[_\s]/g, '')) return svc;
  }
  // Partial match
  const partialMatches = {
    'hair': 'Haircut',
    'haircut': 'Haircut',
    'facial': 'Facial',
    'massage': 'Massage',
    'mani': 'Manicure',
    'pedi': 'Pedicure',
    'wax': 'Waxing',
    'thread': 'Threading',
    'color': 'Hair Color',
    'colour': 'Hair Color',
    'haircolor': 'Hair Color',
    'detan': 'Detan',
    'detanning': 'Detan',
    'keratin': 'Keratin',
    'blowout': 'Blowout',
    'blowdry': 'Blowout',
    'cleanup': 'Cleanup',
    'clean': 'Cleanup',
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
  };
  return partialMatches[lower] || input;
};

/**
 * Fuzzy match tier names.
 */
const matchTier = (input) => {
  const lower = input.toLowerCase();
  if (lower.includes('basic') || lower.includes('standard')) return 'Basic';
  if (lower.includes('intermediate') || lower.includes('mid') || lower.includes('enhanced')) return 'Intermediate';
  if (lower.includes('expert') || lower.includes('luxury') || lower.includes('premium')) return 'Expert';
  // If the LLM returned a valid tier already
  for (const tier of TIERS_LIST) {
    if (lower === tier.toLowerCase()) return tier;
  }
  return input;
};

/**
 * Normalize spoken time to slot format.
 * "3 pm" → "3pm", "3:30 PM" → "3.30 pm", "15:00" → "3pm"
 */
export const normalizeTime = (input) => {
  if (!input) return null;
  const str = input.toLowerCase().trim();

  // Handle 24-hour format
  const h24 = str.match(/^(\d{1,2}):?(\d{2})?$/);
  if (h24) {
    let h = parseInt(h24[1]);
    const m = parseInt(h24[2] || '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    if (m === 0) return `${h}${ampm}`;
    return `${h}.${m} ${ampm}`;
  }

  // Parse spoken times like "3 pm", "3:30 pm", "3.30pm"
  const match = str.match(/(\d{1,2})[\.:,]?(\d{2})?\s*(am|pm)?/i);
  if (!match) return input;

  let h = parseInt(match[1]);
  const m = parseInt(match[2] || '0');
  const period = match[3] ? match[3].toLowerCase() : (h >= 11 ? 'am' : 'pm');

  if (m === 0) return `${h}${period}`;
  return `${h}.${m} ${period}`;
};

/**
 * Normalize gender input.
 */
const normalizeGender = (input) => {
  const lower = input.toLowerCase();
  if (lower.includes('female') || lower.includes('woman') || lower === 'f') return 'Female';
  if (lower.includes('male') || lower.includes('man') || lower === 'm') return 'Male';
  return 'Other';
};

/**
 * Remove markdown, asterisks, etc. that would be read aloud strangely.
 */
const sanitizeForSpeech = (text) => {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#+/g, '')
    .replace(/`/g, '')
    .replace(/\n+/g, ' ')
    .trim();
};

const toTitleCase = (str) =>
  str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
