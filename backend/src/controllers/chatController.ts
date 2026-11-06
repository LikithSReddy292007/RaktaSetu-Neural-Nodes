import { Request, Response } from 'express';
import { z } from 'zod';
import { DataStore } from '../services/store.js';
import { ChatMessage } from '../types/index.js';

// Multilingual Payment Term Detection Regex
// Blocks any attempts to request, offer, or negotiate payments/charges
export const PAYMENT_DETECTION_PATTERNS = [
  /\b(pay|payment|paying|paid|payer)\b/i,
  /\b(money|cash|cashout|funds?)\b/i,
  /\b(upi|gpay|googlepay|phonepe|paytm|bhim|cred|paypal)\b/i,
  /\b(bank\s*(?:account|transfer|details|deposit|no|number)?)\b/i,
  /\b(account\s*(?:number|no|details)|acct|iban|ifsc|wire\s*transfer|remit|remittance)\b/i,
  /\b(fee|fees|charge|charges|cost|costs|pricing|price|rate|bill|expensive)\b/i,
  /\b(rupee|rupees|rs\.?|inr|₹|\$|dollar|dollars|bucks)\b/i,
  /\b(पैसे|रुपये|शुल्क|किराया|दाम|मूल्य|पैसा|नकद)\b/i,
  /\b(ದುಡ್ಡು|ಹಣ|ರೂಪಾಯಿ)\b/i,
];

export function isPaymentDiscussion(text: string): boolean {
  // Strip out legitimate medical occurrences like "blood bank" before evaluating
  const sanitizedText = text
    .replace(/\bblood\s*bank[s]?\b/gi, 'medical_facility')
    .replace(/\borgan\s*bank[s]?\b/gi, 'medical_facility');
  return PAYMENT_DETECTION_PATTERNS.some((pattern) => pattern.test(sanitizedText));
}

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty').max(1000),
  sender_role: z.enum(['donor', 'requester']),
  sender_name: z.string().min(1),
});

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { requestId } = req.params;
  const { text, sender_role, sender_name } = req.body;
  const userId = req.user?.id || `anon_${Date.now()}`;

  // 1. Verify that request exists
  const request = await DataStore.getRequest(requestId);
  if (!request) {
    res.status(404).json({ success: false, message: 'Active blood request not found.' });
    return;
  }

  // 2. CRITICAL SAFETY FEATURE: Payment Term Detection & Automatic Blocking
  if (isPaymentDiscussion(text)) {
    // Log moderation alert
    console.warn(`[Safety Shield] Blocked payment-related message in request ${requestId} from ${sender_name}: "${text}"`);

    res.status(400).json({
      success: false,
      blocked: true,
      message:
        '⚠️ Message Blocked: Payment discussions are strictly prohibited. Blood donation on RaktaSetu is voluntary, selfless, and 100% free. Any request or offer of money is illegal and will result in an immediate account ban.',
    });
    return;
  }

  // 3. Save safe message
  const chatMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    request_id: requestId,
    sender_id: userId,
    sender_name,
    sender_role,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  const saved = await DataStore.saveChatMessage(chatMsg);

  res.status(201).json({
    success: true,
    message: 'Message delivered securely.',
    data: saved,
  });
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const { requestId } = req.params;

  const messages = await DataStore.getChatMessages(requestId);
  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
}
