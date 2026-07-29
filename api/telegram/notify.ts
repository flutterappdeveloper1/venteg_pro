const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8796371486:AAF2OEA79DF15NflP0OcMBZ8tD4wdoqT9-k";
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "@venteg_bot";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, chatId } = req.body || {};
    const targetChatId = chatId || TELEGRAM_BOT_USERNAME;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message || "নতুন অর্ডার নোটিফিকেশন",
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    return res.status(200).json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to send message' });
  }
}
