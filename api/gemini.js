import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Konfigurasi CORS agar frontend bisa mengakses
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // AMBIL API KEY DARI VERCEL ENVIRONMENT VARIABLES
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("API Key Missing in Vercel Environment");
      return res.status(500).json({ 
        error: 'Konfigurasi Server Error: API Key belum dipasang di Vercel.' 
      });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Data prompt tidak ditemukan' });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Menggunakan model gemini-2.5-flash untuk respon cepat dan hemat kuota
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Anda adalah Konsultan Bisnis Profesional khusus untuk pemilik toko kelontong/distributor Yakult. Berikan analisis yang tajam, saran praktis, ramah, dan memotivasi. Gunakan format Markdown.",
      }
    });

    const outputText = response.text;
    return res.status(200).json({ text: outputText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: 'Gagal memproses permintaan AI.', details: error.message });
  }
}