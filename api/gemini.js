import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Setup CORS agar bisa diakses dari frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Mengambil API Key dari Environment Variable Vercel
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API Key belum disetting di Vercel. Masuk ke Settings > Environment Variables > Tambahkan GEMINI_API_KEY.' 
      });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt dibutuhkan' });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Menggunakan model gemini-3-flash-preview sesuai instruksi untuk tugas teks dasar/cepat
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Anda adalah Konsultan Bisnis Profesional khusus untuk distributor Yakult. Berikan analisis yang tajam, saran praktis, dan nada bicara yang menyemangati pemilik toko.",
      }
    });

    // Mengambil teks menggunakan properti .text (bukan metode .text())
    const outputText = response.text;

    return res.status(200).json({ text: outputText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: 'Gagal menghubungi AI Google.', details: error.message });
  }
}