import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6KNR9T9qqVx0cbWGQSh4NlkPqIGfs4nNIEwGRD5EX9b3g";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

async function generateGeminiReply(prompt: string, systemInstruction: string): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.6-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next candidate...`);
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { prompt, clientProducts } = body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let liveProducts = '';
    if (Array.isArray(clientProducts) && clientProducts.length > 0) {
      liveProducts = "VENTEG স্টোরের বর্তমান প্রোডাক্ট তালিকা:\n" + 
        clientProducts.map((p: any, i: number) => 
          `${i+1}. ${p.name} - ক্যাটাগরি: ${p.category} | মূল্য: ৳${p.sellingPrice} (প্রতি ${p.unit === 'kg' ? 'কেজি' : 'পিস'}) | স্টক: ${p.stock} ${p.unit}`
        ).join('\n');
    } else {
      liveProducts = "VENTEG স্টোরের ক্যাটাগরি: গ্রোসারিস, মিষ্টি, কোল্ড ড্রিংকস ইত্যাদি।";
    }

    const systemInstruction = `You are VENTEG AI Assistant (ভেন্ট্যাগ এআই অ্যাসিস্ট্যান্ট), an intelligent customer support assistant for VENTEG online store.
Always respond politely, helpfully, and warmly in Bengali.

REAL-TIME INVENTORY DATABASE:
${liveProducts}

STRICT PRODUCT DATA RULES:
1. When asked about available products, list ONLY the exact items from the real inventory above with their correct prices and stock. Never make up fictional products!
2. If a product is out of stock (stock 0), politely inform the customer.
3. Guide customers on how to place orders on the app or via Cash on Delivery / Online Payment (bKash/Nagad/Rocket: 01756447869).
4. Keep answers clean, well-formatted, and easy to read in Bengali.`;

    const replyText = await generateGeminiReply(prompt, systemInstruction);
    return res.status(200).json({ response: replyText });
  } catch (err: any) {
    console.error('Error in Vercel API /api/ai/chat:', err);
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
}
