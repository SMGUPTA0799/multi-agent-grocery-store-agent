import Groq from 'groq-sdk';
import { GoogleGenAI, Type } from '@google/genai';

export interface ParsedLineItem {
  item_name: string;
  quantity: string;
  amount: number;
}

function sanitizeItems(rawList: unknown): ParsedLineItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const itemName = String(r.item_name ?? '').trim();
      const quantity = String(r.quantity ?? '1 unit').trim() || '1 unit';
      const numericAmount = Number(r.amount);
      if (!itemName || Number.isNaN(numericAmount) || numericAmount < 0) {
        return null;
      }
      return {
        item_name: itemName,
        quantity,
        amount: Number(numericAmount.toFixed(2)),
      };
    })
    .filter((item): item is ParsedLineItem => item !== null);
}

export async function extractBillItems(params: {
  imageBase64?: string;
  mimeType?: string;
  hinglishText?: string;
}): Promise<ParsedLineItem[]> {
  const { imageBase64, mimeType, hinglishText } = params;

  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // OCR + structured extraction from slip image using Groq's multimodal Qwen 3.8 27B
    if (imageBase64) {
      const safeMime = mimeType || 'image/jpeg';
      const userContent: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      > = [
        {
          type: 'text',
          text: `Perform OCR on this Indian kirana grocery slip and extract line items as JSON matching {"items":[{"item_name":"string","quantity":"string","amount":number}]}. Normalize item names cleanly and return INR amounts as numbers.${
            hinglishText ? ` Additional note: "${hinglishText}"` : ''
          }`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${safeMime};base64,${imageBase64}`,
          },
        },
      ];

      const completion = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: userContent }],
      });

      const raw = completion.choices[0]?.message?.content || '{"items":[]}';
      const parsed = JSON.parse(raw);
      return sanitizeItems(parsed.items);
    }

    // Fast structured extraction from Hinglish text/transcript
    if (hinglishText) {
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extract grocery line items from Indian kirana store notes or Hinglish text. Return ONLY JSON: {"items":[{"item_name":"string","quantity":"string","amount":number}]}. Normalize product names cleanly and return INR amounts as numbers.',
          },
          {
            role: 'user',
            content: hinglishText,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{"items":[]}';
      const parsed = JSON.parse(raw);
      return sanitizeItems(parsed.items);
    }
  }

  // Fallback to Gemini if GROQ_API_KEY is not configured
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GROQ_API_KEY (and GEMINI_API_KEY fallback)');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [
    'Extract all grocery line items, quantities, and INR prices from this Indian kirana slip or note. Normalize item names cleanly.',
  ];

  if (imageBase64 && mimeType) {
    contents.push({ inlineData: { data: imageBase64, mimeType } });
  }
  if (hinglishText) {
    contents.push(`Note: "${hinglishText}"`);
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            item_name: { type: Type.STRING },
            quantity: { type: Type.STRING },
            amount: { type: Type.NUMBER },
          },
          required: ['item_name', 'quantity', 'amount'],
        },
      },
    },
  });

  const parsed = JSON.parse(response.text || '[]');
  return sanitizeItems(parsed);
}
