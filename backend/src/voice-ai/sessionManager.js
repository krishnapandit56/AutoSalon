// ─── SESSION MANAGER ────────────────────────────────────────────────────────
// Manages in-memory conversation state for each active call.
// Each call is identified by Twilio's unique CallSid.

const sessions = new Map();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Create a new session for an incoming call.
 */
export const createSession = (callSid, callerPhone) => {
  const session = {
    callSid,
    callerPhone: normalizePhone(callerPhone),
    conversationHistory: [], // [{role: 'user'|'assistant', content: '...'}]
    collectedData: {
      service: null,
      tier: null,
      slot_time: null,
      slotId: null,      // MongoDB Slot _id, set after slot lookup
      name: null,
      age: null,
      gender: null,
      city: null,
      phone: normalizePhone(callerPhone),
    },
    state: 'greeting',   // greeting | collecting | confirming | done | error
    retryCount: 0,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  sessions.set(callSid, session);
  console.log(`[Session] Created for CallSid: ${callSid}, Phone: ${session.callerPhone}`);
  return session;
};

/**
 * Get an existing session by CallSid.
 */
export const getSession = (callSid) => {
  const session = sessions.get(callSid);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session || null;
};

/**
 * Update collected data fields in a session.
 */
export const updateSession = (callSid, updates) => {
  const session = sessions.get(callSid);
  if (!session) return null;
  
  // Merge extracted data
  if (updates.collectedData) {
    Object.keys(updates.collectedData).forEach(key => {
      if (updates.collectedData[key] !== null && updates.collectedData[key] !== undefined) {
        session.collectedData[key] = updates.collectedData[key];
      }
    });
  }
  
  // Update other session fields
  if (updates.state) session.state = updates.state;
  if (typeof updates.retryCount === 'number') session.retryCount = updates.retryCount;
  if (updates.conversationEntry) {
    session.conversationHistory.push(updates.conversationEntry);
  }
  
  session.lastActivity = Date.now();
  return session;
};

/**
 * Add a message to conversation history.
 */
export const addToHistory = (callSid, role, content) => {
  const session = sessions.get(callSid);
  if (!session) return;
  session.conversationHistory.push({ role, content });
  session.lastActivity = Date.now();
};

/**
 * Delete a session when call ends.
 */
export const deleteSession = (callSid) => {
  sessions.delete(callSid);
  console.log(`[Session] Deleted for CallSid: ${callSid}`);
};

/**
 * Check if all required fields are collected.
 */
export const isDataComplete = (session) => {
  const { service, tier, slot_time, name, age, gender } = session.collectedData;
  return !!(service && tier && slot_time && name && age && gender);
};

/**
 * Get the next missing field to ask about.
 */
export const getNextMissingField = (session) => {
  const d = session.collectedData;
  if (!d.service) return 'service';
  if (!d.tier) return 'tier';
  if (!d.slot_time) return 'slot_time';
  if (!d.name) return 'name';
  if (!d.age) return 'age';
  if (!d.gender) return 'gender';
  if (!d.city) return 'city'; // optional, defaults to Nagpur
  return null;
};

/**
 * Normalize phone number for India.
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Strip non-digits
  const digits = phone.replace(/\D/g, '');
  // If it's a 10-digit Indian number, add +91
  if (digits.length === 10) return '+91' + digits;
  // If already has country code
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  return phone; // return as-is if format is unknown
};

// ─── Auto-cleanup expired sessions ──────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  sessions.forEach((session, callSid) => {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(callSid);
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[Session] Cleaned up ${cleaned} expired sessions.`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export const getActiveSessionCount = () => sessions.size;
