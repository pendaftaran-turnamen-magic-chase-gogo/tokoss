
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

// Helper: Kompresi Gambar Super Agresif untuk LocalStorage
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        // Perkecil max width ke 350px agar ringan di HP dan LocalStorage
        const maxWidth = 350; 
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Kompres jadi JPEG quality 0.6 (Cukup untuk HP)
        resolve(elem.toDataURL('image/jpeg', 0.6));
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
    if (!qrisRaw || qrisRaw.length < 10) return qrisRaw;

    let qris = qrisRaw.trim();
    if (qris.length > 4) {
         qris = qris.slice(0, -4); 
    }
    
    const pointOfInitiation = qris.substring(4, 10);
    if (pointOfInitiation === '010211') {
        qris = qris.substring(0, 4) + '010212' + qris.substring(10);
    }

    const amountStr = amount.toString();
    const tag54 = '54' + amountStr.length.toString().padStart(2, '0') + amountStr;
    
    const currencyTag = '5303360';
    const idx53 = qris.indexOf(currencyTag);
    
    if (idx53 !== -1) {
        const splitIdx = idx53 + currencyTag.length;
        qris = qris.substring(0, splitIdx) + tag54 + qris.substring(splitIdx);
    } else {
        const countryTag = '5802ID';
        const idx58 = qris.indexOf(countryTag);
        if (idx58 !== -1) {
             qris = qris.substring(0, idx58) + tag54 + qris.substring(idx58);
        } else {
            qris += tag54;
        }
    }

    qris += '6304';
    qris += crc16(qris);
    
    return qris;
}

export async function fetchQrisImage(qrisStatis: string, amount: number): Promise<string | null> {
  try {
    // Gunakan QR Server publik sebagai fallback paling stabil untuk demo tanpa backend
    const dynamicString = generateLocalQRString(qrisStatis, amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(dynamicString)}`;
  } catch (fallbackError) {
      console.error("Critical: QRIS Generation failed completely", fallbackError);
      return null;
  }
}
