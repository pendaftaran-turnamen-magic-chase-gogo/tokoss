
import { Product } from './types';

// ============================================================
// 🟢 UTILITIES
// ============================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
}

// Helper: Kompresi Gambar ke Base64 (Max width 500px)
// Ini PENTING agar database.json tidak meledak ukurannya dan bikin tombol macet.
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        const maxWidth = 500; // Resize agar ringan
        const scaleFactor = maxWidth / img.width;
        
        // Jika gambar sudah kecil, jangan resize
        if (img.width <= maxWidth) {
            resolve(reader.result as string);
            return;
        }

        elem.width = maxWidth;
        elem.height = img.height * scaleFactor;
        
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, elem.width, elem.height);
        
        // Kompres jadi JPEG quality 0.7
        resolve(elem.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// CRC16 Implementation (CCITT-FALSE) for Fallback
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generateLocalQRString(qrisRaw: string, amount: number): string {
    // Basic validation
    if (!qrisRaw || qrisRaw.length < 10) return qrisRaw;

    let qris = qrisRaw.trim();
    if (qris.length > 4) {
         qris = qris.slice(0, -4); // Remove old CRC
    }
    
    // 1. Convert to Dynamic (Tag 01: 11 -> 12)
    // Position is fixed at index 4 for standard EMVCo
    const pointOfInitiation = qris.substring(4, 10);
    if (pointOfInitiation === '010211') {
        qris = qris.substring(0, 4) + '010212' + qris.substring(10);
    }

    // 2. Inject Amount (Tag 54)
    // We look for '5303360' (IDR) and inject 54 after it.
    const amountStr = amount.toString();
    const tag54 = '54' + amountStr.length.toString().padStart(2, '0') + amountStr;
    
    const currencyTag = '5303360';
    const idx53 = qris.indexOf(currencyTag);
    
    if (idx53 !== -1) {
        const splitIdx = idx53 + currencyTag.length;
        qris = qris.substring(0, splitIdx) + tag54 + qris.substring(splitIdx);
    } else {
        // Fallback: Insert before 5802ID (Country Code)
        const countryTag = '5802ID';
        const idx58 = qris.indexOf(countryTag);
        if (idx58 !== -1) {
             qris = qris.substring(0, idx58) + tag54 + qris.substring(idx58);
        } else {
            qris += tag54;
        }
    }

    // 3. Recalculate CRC (Tag 63)
    qris += '6304';
    qris += crc16(qris);
    
    return qris;
}

// ============================================================
// 🟢 FUNGSI API QRIS
// Prioritas 1: API qrisku.my.id
// Prioritas 2: Generate Lokal + QRServer (Fallback)
// ============================================================
export async function fetchQrisImage(qrisStatis: string, amount: number): Promise<string | null> {
  // 1. Try External API
  try {
    const response = await fetch("https://qrisku.my.id/api", {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      },
      body: JSON.stringify({
        amount: amount.toString(),
        qris_statis: qrisStatis
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.status === 'success' && data.qris_base64) {
      return `data:image/png;base64,${data.qris_base64}`;
    }
    throw new Error('Invalid API response');

  } catch (error) {
    console.warn("QRIS API unreachable, switching to local generation...", error);
    
    // 2. Fallback Mechanism
    try {
        const dynamicString = generateLocalQRString(qrisStatis, amount);
        // Using a public QR generator for the calculated string
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(dynamicString)}`;
    } catch (fallbackError) {
        console.error("Critical: QRIS Generation failed completely", fallbackError);
        return null;
    }
  }
}
