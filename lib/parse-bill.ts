import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ParsedLineItem {
  item_name: string;
  quantity: string;
  amount: number;
}

export async function parseGroceryInput(params: {
  imageBase64?: string;
  mimeType?: string;
  hinglishText?: string;
}): Promise<ParsedLineItem[]> {
  const contents: any[] = [
    `Extract all grocery items, quantities, and total line prices in INR from this Indian kirana store slip or Hinglish voice note. Normalize item names cleanly (e.g., "Aashirvaad Atta", "Amul Milk").`
  ];

  if (params.imageBase64 && params.mimeType) {
    contents.push({
      inlineData: { data: params.imageBase64, mimeType: params.mimeType },
    });
  }
  if (params.hinglishText) {
    contents.push(`Voice/Text Note: "${params.hinglishText}"`);
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

  return JSON.parse(response.text || '[]');
}
