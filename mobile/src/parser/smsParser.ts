export type ParsedBankSms = { amountPaise: number; type: 'DEBIT' | 'CREDIT'; merchant: string; occurredAt: string; upiRef?: string; accountLast4?: string; confidence: number; sourceBank: string };
const BANK_PATTERNS: Array<{ bank: string; pattern: RegExp }> = [
  { bank: 'HDFC', pattern: /HDFC|HDFCBK/i }, { bank: 'SBI', pattern: /SBI|SBIN/i },
  { bank: 'ICICI', pattern: /ICICI/i }, { bank: 'AXIS', pattern: /AXIS/i },
  { bank: 'KOTAK', pattern: /KOTAK/i }, { bank: 'PNB', pattern: /PNB/i },
];
/** Parse only a message explicitly selected by the user. No inbox/SMS permission is requested here. */
export function parseSelectedBankMessage(message: string, receivedAt = new Date()): ParsedBankSms | null {
  const text = message.slice(0, 3000);
  if (/otp|one.time.password|verification code|offers?|cashback|promo|failed|declined|reversed/i.test(text)) return null;
  const amountMatch = text.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amountText = amountMatch[1];
  if (!amountText) return null;
  const amount = Number(amountText.replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const debit = /debited|spent|purchase|paid|sent|withdrawn|Dr\b/i.test(text);
  const credit = /credited|received|deposited|refund|Cr\b/i.test(text);
  if (debit === credit) return null;
  const ref = text.match(/(?:UPI\s*Ref(?:erence)?|UTR|Ref\s*No)\s*[:#-]?\s*([A-Z0-9]{8,24})/i)?.[1];
  const account = text.match(/(?:A\/c|account|acct)\s*(?:xx|x|\*)*([0-9]{4})/i)?.[1];
  const merchant = text.match(/(?:at|to|from|towards)\s+([A-Za-z0-9 .&'-]{2,60}?)(?:\s+(?:on|UPI|Ref|UTR|Avl|Bal)|[.;,]|$)/i)?.[1]?.trim() ?? 'Bank transaction';
  const bank = BANK_PATTERNS.find((item) => item.pattern.test(text))?.bank ?? 'GENERIC';
  return { amountPaise: Math.round(amount * 100), type: debit ? 'DEBIT' : 'CREDIT', merchant, occurredAt: receivedAt.toISOString(), upiRef: ref, accountLast4: account, confidence: ref ? 0.9 : 0.72, sourceBank: bank };
}
