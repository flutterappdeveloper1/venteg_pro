import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

// Initialize Firebase for Backend Product Queries
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);

// API Credentials from system / environment or user configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6KNR9T9qqVx0cbWGQSh4NlkPqIGfs4nNIEwGRD5EX9b3g";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8796371486:AAF2OEA79DF15NflP0OcMBZ8tD4wdoqT9-k";
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "@venteg_bot";

// Initialize Google GenAI Server Client
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Helper: Get Live Store Products Context from Firestore
async function getRealProductsContext(): Promise<string> {
  try {
    const snapshot = await getDocs(collection(firestoreDb, 'products'));
    const prods: any[] = [];
    snapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() });
    });

    if (prods.length === 0) {
      return "স্টোরে বর্তমানে কোনো নতুন প্রোডাক্ট যুক্ত করা নেই।";
    }

    let text = "VENTEG স্টোরের বর্তমান আসল প্রোডাক্ট তালিকা, মূল্য এবং স্টক তথ্য:\n";
    prods.forEach((p, i) => {
      const unitStr = p.unit === 'kg' ? 'কেজি' : 'পিস';
      const stockStr = p.stock > 0 ? `${p.stock} ${unitStr} স্টকে আছে` : 'স্টক শেষ (Out of Stock)';
      text += `${i + 1}. ${p.name} - ক্যাটাগরি: ${p.category} | মূল্য: ৳${p.sellingPrice} (প্রতি ${unitStr}) | ${stockStr}\n`;
    });
    return text;
  } catch (e) {
    console.error("Error loading products for Gemini:", e);
    return "VENTEG শপের ক্যাটাগরি: মিষ্টি জাতীয়, কোমল পানীয় ও অন্যান্য গ্রোসারিস।";
  }
}

// Helper: Send message to Telegram chat via HTTP API
async function sendTelegramMessage(chatId: string | number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error sending Telegram message:', err);
    return null;
  }
}

// Telegram Polling Engine
let lastUpdateId = 0;
let isPollingActive = false;

async function pollTelegramUpdates() {
  if (isPollingActive) return;
  isPollingActive = true;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=3`;
    const res = await fetch(url);
    if (!res.ok) {
      isPollingActive = false;
      return;
    }
    const data = await res.json();
    
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const userText = update.message.text.trim();
          const senderName = update.message.from?.first_name || 'গ্রাহক';

          console.log(`[Telegram Bot] Message from ${senderName} (${chatId}): ${userText}`);

          if (userText === '/start' || userText === '/help') {
            const welcomeMsg = `🤖 <b>VENTEG AI Assistant Active</b> (@venteg_bot)\n\n` +
              `হ্যালো ${senderName}! আমি ভেন্ট্যাগ অনলাইন শপের অফিসিয়াল এআই অ্যাসিস্ট্যান্ট।\n\n` +
              `আপনি আমাকে দোকানের পণ্য, স্টক, মূল্য বা নির্দেশিকা নিয়ে যেকোনো প্রশ্ন বাংলা বা ইংরেজিতে করতে পারেন।\n\n` +
              `<b>কমান্ডসমূহ:</b>\n` +
              `• /products - পণ্যের তালিকা দেখুন\n` +
              `• /help - সহায়তা পান`;
            await sendTelegramMessage(chatId, welcomeMsg);
          } else if (userText === '/products') {
            const productsContext = await getRealProductsContext();
            const prodMsg = `📦 <b>VENTEG শপের বর্তমান আসল পণ্যসমূহ:</b>\n\n${productsContext}\n\nযেকোনো পণ্যের বিস্তারিত জানতে লিখে পাঠান!`;
            await sendTelegramMessage(chatId, prodMsg);
          } else {
            // Process message with Gemini 3.6 Flash using real store data
            try {
              const liveProducts = await getRealProductsContext();
              const systemInstruction = `You are VENTEG AI Assistant (ভেন্ট্যাগ এআই অ্যাসিস্ট্যান্ট), an automated store helper on Telegram (@venteg_bot) for VENTEG store.
Always respond politely, helpfully, and accurately in Bengali.

CRITICAL PRODUCT DATA (ALWAYS USE THIS REAL INVENTORY DATA):
${liveProducts}

Rules:
1. ONLY list or refer to the exact products, prices, and stock mentioned above. Do not invent fake products or prices.
2. If stock is 0, mention it's currently out of stock.
3. Be super courteous and concise in Bengali.`;

              const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.6-flash'];
              let replyText = '';
              
              for (const modelName of candidateModels) {
                try {
                  const aiResponse = await ai.models.generateContent({
                    model: modelName,
                    contents: userText,
                    config: { systemInstruction }
                  });
                  if (aiResponse && aiResponse.text) {
                    replyText = aiResponse.text;
                    break;
                  }
                } catch (mErr) {
                  // try next model
                }
              }

              if (!replyText) {
                replyText = "দুঃখিত, উত্তর তৈরিতে সমস্যা হয়েছে।";
              }
              await sendTelegramMessage(chatId, replyText);
            } catch (aiErr: any) {
              console.error("Gemini AI error in Telegram bot:", aiErr);
              await sendTelegramMessage(chatId, "⚠️ এআই সিস্টেম বর্তমানে ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।");
            }
          }
        }
      }
    }
  } catch (err) {
    // Silent fail & retry on next loop tick
  } finally {
    isPollingActive = false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API ROUTES ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Telegram Bot status
  app.get('/api/telegram/status', (req, res) => {
    res.json({
      active: true,
      botUsername: TELEGRAM_BOT_USERNAME,
      botTokenConfigured: !!TELEGRAM_BOT_TOKEN,
      geminiEngine: 'gemini-3.6-flash',
      status: 'Running & Connected'
    });
  });

  // Direct AI Chat endpoint
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { prompt, clientProducts } = req.body;
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
        liveProducts = await getRealProductsContext();
      }

      const systemInstruction = `You are VENTEG AI Assistant (ভেন্ট্যাগ এআই অ্যাসিস্ট্যান্ট), an intelligent customer support assistant for VENTEG online store.
Always respond politely, helpfully, and warmly in Bengali.

REAL-TIME INVENTORY DATABASE:
${liveProducts}

STRICT PRODUCT DATA RULES:
1. When asked about available products, list ONLY the exact items from the real inventory above with their correct prices and stock. Never make up fictional products!
2. If a product is out of stock (stock 0), politely inform the customer.
3. Guide customers on how to place orders on the app or via Cash on Delivery / Online Payment (bKash/Nagad/Rocket).
4. Keep answers clean, well-formatted, and easy to read in Bengali.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction
        }
      });

      return res.json({ response: response.text });
    } catch (err: any) {
      console.error('Error in /api/ai/chat:', err);
      return res.status(500).json({ error: err.message || 'AI request failed' });
    }
  });

  // Send Order Notification to Telegram
  app.post('/api/telegram/notify', async (req, res) => {
    try {
      const { message, chatId } = req.body;
      const targetChatId = chatId || TELEGRAM_BOT_USERNAME;
      const result = await sendTelegramMessage(targetChatId, message || "নতুন বার্তা");
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`VENTEG Full-Stack Server running at http://${HOST}:${PORT}`);
    console.log(`Telegram Bot Automation initialized for ${TELEGRAM_BOT_USERNAME}`);
    
    // Start background Telegram polling loop
    setInterval(pollTelegramUpdates, 2500);
  });
}

startServer();
