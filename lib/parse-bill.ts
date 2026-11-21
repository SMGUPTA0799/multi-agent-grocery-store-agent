import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface ParsedLineItem {
  item_name: string;
  quantity: string;
  amount: number;
}

export async function parseHinglishBill(hinglishText: string): Promise<ParsedLineItem[]> {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Extract grocery line items from Indian kirana store text or Hinglish notes. Return ONLY a JSON object with this exact shape: {"items":[{"item_name":"string","quantity":"string","amount":number}]}. Normalize item names cleanly and use INR numeric amounts.',
      },
      {
        role: 'user',
        content: hinglishText,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{"items":[]}';
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}
