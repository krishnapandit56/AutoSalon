// ─── VOICE ROUTES ────────────────────────────────────────────────────────────
// Twilio webhook routes for AI voice calling booking system.
// POST /api/voice/incoming  — called when a call comes in
// POST /api/voice/gather    — called after each speech input
// POST /api/voice/status    — call status callback (optional logging)
// GET  /api/voice/health    — check Grok + system health

import express from 'express';
import twilio from 'twilio';
import {
  createSession, getSession, updateSession,
  addToHistory, deleteSession, isDataComplete, getNextMissingField
} from './sessionManager.js';
import { askGrok, checkGrokHealth } from './grokService.js';
import { parseIntent } from './intentParser.js';
import {
  checkSlotAvailability, getAlternativeSlots,
  findSlotByTime, createVoiceBooking
} from './bookingEngine.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// ─── How long to wait for speech ────────────────────────────────────────────
const MAX_RETRIES = 3;

// ─── Helper: resolve base URL (always works even if session was recreated) ────
const getBaseUrl = (session, req) => {
  if (session?.baseUrl) return session.baseUrl;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  const host  = req?.headers?.['host'] || 'localhost:5000';
  return `${proto}://${host}`;
};

// ─── Helper: build a TwiML response with AI speech + next Gather ─────────────
const buildGatherResponse = (message, actionUrl, hints = '') => {
  const twiml  = new VoiceResponse();
  const gather = twiml.gather({
    input:             'speech',
    action:            actionUrl,
    method:            'POST',
    timeout:           10,           // seconds to wait for caller to START speaking
    speechTimeout:     'auto',       // let Twilio detect end-of-speech naturally (was: 3)
    speechModel:       'phone_call',
    enhanced:          true,         // Twilio's best recognition engine
    language:          'en-IN',
    hints:             hints ||
      'haircut, facial, massage, waxing, threading, manicure, pedicure, ' +
      'keratin, blowout, detan, cleanup, hair color, ' +
      'basic, intermediate, expert, yes, no, confirm',
    // actionOnEmptyResult removed — was causing false empty-result webhooks
  });
  gather.say({ voice: 'Polly.Aditi', language: 'en-IN' }, message);

  // Only redirect on true timeout (no speech at all within `timeout` seconds)
  twiml.redirect({ method: 'POST' }, actionUrl + '?timeout=1');
  return twiml.toString();
};

// ─── Helper: build a TwiML hangup response ───────────────────────────────────
const buildEndResponse = (message) => {
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, message);
  twiml.hangup();
  return twiml.toString();
};

// ─── Helper: format collected data summary for confirmation ──────────────────
const formatSummary = (data) => {
  return `${data.service} ${data.tier} at ${data.slot_time}, booked for ${data.name}, age ${data.age}, ${data.gender}, from ${data.city || 'Nagpur'}.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. INCOMING CALL WEBHOOK
// Twilio calls this when someone calls your Twilio number.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/voice/incoming', (req, res) => {
  const callSid   = req.body.CallSid;
  const direction = (req.body.Direction || '').toLowerCase(); // 'inbound' or 'outbound-api'
  const twilioNum = (process.env.TWILIO_PHONE_NUMBER || '').replace(/\D/g, '');

  // For outbound calls (system calls the customer):
  //   From = Twilio number, To = customer's number  → use To
  // For inbound calls (customer calls in):
  //   From = customer's number, To = Twilio number  → use From
  let callerPhone = req.body.From || '';
  if (direction === 'outbound-api' || callerPhone.replace(/\D/g, '').endsWith(twilioNum)) {
    callerPhone = req.body.To || req.body.Called || req.body.From || '';
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host     = req.headers['host'];
  const baseUrl  = `${protocol}://${host}`;

  console.log(`\n[Voice] ▶ Call | Direction: ${direction} | From: ${req.body.From} | To: ${req.body.To} | CustomerPhone: ${callerPhone} | Base: ${baseUrl}`);

  const session    = createSession(callSid, callerPhone);
  session.baseUrl  = baseUrl;

  const greeting = "Welcome to AutoSalon! I'm Priya, your AI booking assistant. Which service would you like to book today? We offer haircut, facial, massage, waxing, and more.";

  res.type('text/xml');
  res.send(buildGatherResponse(
    greeting,
    `${baseUrl}/api/voice/gather`,
    'haircut, facial, massage, waxing, threading, manicure, pedicure, yes, no'
  ));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GATHER (SPEECH RESULT) WEBHOOK
// Twilio calls this after the caller finishes speaking.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/voice/gather', async (req, res) => {
  const callSid      = req.body.CallSid;
  const speechResult = (req.body.SpeechResult || '').trim();
  const confidence   = parseFloat(req.body.Confidence || '0');
  const isTimeout    = req.query.timeout === '1';

  console.log(`[Voice] \ud83d\udde3 SpeechResult: "${speechResult}" | Confidence: ${confidence} | Timeout: ${isTimeout}`);

  res.type('text/xml');

  // Get or recreate session
  let session = getSession(callSid);
  if (!session) {
    console.warn(`[Voice] No session for ${callSid} \u2014 recreating`);
    session = createSession(callSid, req.body.From || '');
  }

  // Always refresh baseUrl from live request (survives session recreation)
  const baseUrl = getBaseUrl(session, req);
  session.baseUrl = baseUrl;

  // \u2500\u2500 Handle true timeout (no speech at all) \u2500\u2500
  if (isTimeout || !speechResult) {
    session.retryCount = (session.retryCount || 0) + 1;
    console.log(`[Voice] No speech (retry ${session.retryCount}/${MAX_RETRIES})`);
    if (session.retryCount >= MAX_RETRIES) {
      deleteSession(callSid);
      return res.send(buildEndResponse(
        "I'm sorry, I couldn't hear you. Please call back when you're ready. Goodbye!"
      ));
    }
    return res.send(buildGatherResponse(
      "I'm sorry, I didn't catch that. Please say a service name clearly \u2014 for example, haircut, facial, or massage.",
      `${baseUrl}/api/voice/gather`,
      'haircut, facial, massage, waxing, threading, yes, no'
    ));
  }

  // \u2500\u2500 Reset retry count on successful speech \u2500\u2500
  updateSession(callSid, { retryCount: 0 });

  // \u2500\u2500 Say "One moment" then redirect to process \u2500\u2500
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'One moment please.');
  twiml.redirect(
    { method: 'POST' },
    `${baseUrl}/api/voice/process?SpeechResult=${encodeURIComponent(speechResult)}&Confidence=${confidence}`
  );

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─────────────────────────────────────────────────────────────────────────────
// 2b. PROCESS (AI LOGIC)
// This is where the heavy LLM work happens.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/voice/process', async (req, res) => {
  const callSid      = req.body.CallSid;
  const speechResult = decodeURIComponent(req.query.SpeechResult || '');
  const confidence   = parseFloat(req.query.Confidence || '0');

  res.type('text/xml');
  let session = getSession(callSid);
  if (!session) return res.send(buildEndResponse('Session lost. Please call back. Goodbye.'));

  // Refresh baseUrl from live request
  session.baseUrl = getBaseUrl(session, req);

  // \u2500\u2500 Only discard if confidence extremely low AND speech is near-empty \u2500\u2500
  if (confidence < 0.05 && speechResult.length < 2) {
    console.log(`[Voice] Discarding near-empty low-confidence speech: "${speechResult}" (${confidence})`);
    return res.send(buildGatherResponse(
      "I'm sorry, I didn't quite catch that. Please say it clearly.",
      `${session.baseUrl}/api/voice/gather`,
      'haircut, facial, massage, yes, no'
    ));
  }

  // ── Add user speech to conversation history ──────────────────────────────
  addToHistory(callSid, 'user', speechResult);

  // ── CONFIRMING STATE: handle yes/no ─────────────────────────────────────
  if (session.state === 'confirming') {
    const lower = speechResult.toLowerCase();
    const isYes = /\b(yes|yeah|yep|confirm|ok|okay|sure|correct|right|go ahead|please|book it|that's right)\b/.test(lower);
    const isNo = /\b(no|nope|cancel|wrong|change|different|incorrect|stop)\b/.test(lower);

    if (isYes) {
      // ── CREATE BOOKING ────────────────────────────────────────────────
      try {
        console.log('[Voice] ✅ Booking confirmed, creating...');
        const { slot_time, service, tier } = session.collectedData;

        // Find the slot
        const slotDoc = await findSlotByTime(slot_time);
        if (!slotDoc) {
          return res.send(buildGatherResponse(
            `I'm sorry, that time slot is no longer available. Could you pick a different time? Available times are 11 AM to 10 PM.`,
            '/api/voice/gather'
          ));
        }

        // Double-check availability
        const { available } = await checkSlotAvailability(slot_time, service);
        if (!available) {
          const alternatives = await getAlternativeSlots(slot_time, service);
          updateSession(callSid, { state: 'collecting' });
          updateSession(callSid, { collectedData: { slot_time: null, slotId: null } });
          return res.send(buildGatherResponse(
            `Oh I'm sorry, that slot just got booked. How about ${alternatives.slice(0, 2).join(' or ')}?`,
            '/api/voice/gather'
          ));
        }

        await createVoiceBooking({
          ...session.collectedData,
          slotId: slotDoc._id,
          slot: slotDoc,
        });

        updateSession(callSid, { state: 'done' });
        deleteSession(callSid);

        const confirmMsg = `Wonderful! Your ${service} ${tier} appointment has been confirmed for ${slot_time}. A confirmation SMS has been sent to your phone. We look forward to seeing you at AutoSalon. Goodbye!`;
        return res.send(buildEndResponse(confirmMsg));

      } catch (err) {
        console.error('[Voice] Booking error:', err.message);
        return res.send(buildEndResponse(
          "I'm sorry, there was an issue saving your booking. Please call back or book online at our website. Goodbye!"
        ));
      }

    } else if (isNo) {
      // Customer wants to change something
      updateSession(callSid, { state: 'collecting' });
      addToHistory(callSid, 'assistant', 'Of course! What would you like to change?');
      return res.send(buildGatherResponse(
        "Of course! What would you like to change?",
        '/api/voice/gather'
      ));
    } else {
      // Unclear — ask again for confirmation
      return res.send(buildGatherResponse(
        `Just to confirm: ${formatSummary(session.collectedData)}. Shall I book this? Please say yes or no.`,
        '/api/voice/gather',
        'yes, no, confirm, cancel, change'
      ));
    }
  }

  // ── COLLECTING STATE: ask Grok for intent ───────────────────────────────
  try {
    const rawResponse = await askGrok(session.conversationHistory, speechResult, session.collectedData || {});
    const intent = parseIntent(rawResponse);

    console.log(`[Voice] 🤖 Grok Intent: ${intent.intent} | Ready: ${intent.ready_to_book}`);
    console.log(`[Voice] 📦 Extracted:`, intent.extracted);

    // Save AI response to history
    addToHistory(callSid, 'assistant', intent.response);

    // Merge extracted data into session
    updateSession(callSid, { collectedData: intent.extracted });

    // Reload session after update
    session = getSession(callSid);

    // ── Check if slot is available when we have service + time ──────────
    if (
      intent.extracted.slot_time &&
      session.collectedData.service &&
      session.state !== 'confirming'
    ) {
      const { available, reason } = await checkSlotAvailability(
        intent.extracted.slot_time,
        session.collectedData.service
      );

      if (!available) {
        const alternatives = await getAlternativeSlots(
          intent.extracted.slot_time,
          session.collectedData.service
        );
        // Clear the slot_time so we ask again
        updateSession(callSid, { collectedData: { slot_time: null } });
        session = getSession(callSid);

        const altMsg = alternatives.length > 0
          ? `I'm sorry, ${intent.extracted.slot_time} is already booked. We have ${alternatives.slice(0,3).join(', ')} available. Which works for you?`
          : `I'm sorry, that slot is booked. What other time works for you? We're open from 11 AM to 10 PM.`;

        addToHistory(callSid, 'assistant', altMsg);
        return res.send(buildGatherResponse(altMsg, '/api/voice/gather'));
      }
    }

    // ── All fields collected → move to confirmation ──────────────────────
    if (intent.ready_to_book && isDataComplete(session)) {
      updateSession(callSid, { state: 'confirming' });
      const summary = formatSummary(session.collectedData);
      const confirmMsg = `Perfect! Let me confirm your booking: ${summary} Shall I go ahead and book this for you? Say yes to confirm.`;
      addToHistory(callSid, 'assistant', confirmMsg);
      return res.send(buildGatherResponse(
        confirmMsg,
        '/api/voice/gather',
        'yes, no, confirm, cancel'
      ));
    }

    // ── Still collecting — guide to next missing field ───────────────────
    const nextField = getNextMissingField(session);
    const fieldHints = {
      service: 'haircut, facial, massage, waxing, threading, manicure, pedicure',
      tier: 'basic, intermediate, expert',
      slot_time: '11am, 12pm, 1pm, 2pm, 3pm, 4pm, 5pm, 6pm, 7pm, 8pm, 9pm, 10pm',
      name: 'my name is, name',
      age: 'I am, years old',
      gender: 'male, female',
      city: 'Nagpur, Mumbai, Pune'
    };

    return res.send(buildGatherResponse(
      intent.response,
      `${session.baseUrl}/api/voice/gather`,
      fieldHints[nextField] || ''
    ));

  } catch (err) {
    console.error('[Voice] Processing error:', err.message);
    const retryMsg = "I'm sorry, I had a little trouble there. Could you say that again?";
    return res.send(buildGatherResponse(
      retryMsg,
      `${session.baseUrl}/api/voice/gather`
    ));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CALL STATUS CALLBACK (optional — Twilio calls this when call ends)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/voice/status', (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  console.log(`[Voice] 📞 Call ended | SID: ${CallSid} | Status: ${CallStatus} | Duration: ${CallDuration}s`);

  // Clean up session if still exists
  deleteSession(CallSid);
  res.type('text/xml');
  res.send('<Response><Hangup/></Response>');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/voice/health', async (req, res) => {
  const grokStatus = await checkGrokHealth();
  res.json({
    service: 'AutoSalon AI Voice',
    status: grokStatus.ok ? 'ready' : 'degraded',
    ai: {
      provider: 'Grok (xAI)',
      model: process.env.GROK_MODEL || 'grok-3-mini',
      ...grokStatus,
    },
    twilio: {
      phone: process.env.TWILIO_PHONE_NUMBER,
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    },
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEST CALL (OUTBOUND)
// Triggered from Admin dashboard to test AI calling on a verified number.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/voice/test-call', async (req, res) => {
  const { phone, ngrokUrl } = req.body;

  if (!phone || !ngrokUrl) {
    return res.status(400).json({ error: 'Phone number and ngrok URL are required' });
  }

  // Clean ngrok URL (remove trailing slash)
  const baseUrl = ngrokUrl.replace(/\/$/, '');
  const callbackUrl = `${baseUrl}/api/voice/incoming`;

  console.log(`[Voice] 📞 Triggering test call to ${phone} using ${callbackUrl}`);

  try {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await twilioClient.calls.create({
      url: callbackUrl,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${baseUrl}/api/voice/status`,
      statusCallbackEvent: ['completed', 'failed'],
      statusCallbackMethod: 'POST',
    });

    res.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error('[Voice] Test call failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
