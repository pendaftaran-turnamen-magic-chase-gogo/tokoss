
import { Transaction, LossRecord, Product, StoreSettings, StoreContent } from './types';
import { PRODUCTS } from './constants';

const DB_KEY = 'yakult_shop_db';

export interface DatabaseSchema {
  transactions: Transaction[];
  history: Transaction[];
  losses: LossRecord[];
  products: Product[];
  settings: StoreSettings;
  content: StoreContent; // Added Content
}

// Default Dynamic Content
const DEFAULT_CONTENT: StoreContent = {
  testimonials: [
    { id: 't1', name: 'Budi Santoso', text: 'Pelayanan sangat cepat dan Yakultnya masih dingin segar!', rating: 5, role: 'Pelanggan' },
    { id: 't2', name: 'Siti Aminah', text: 'Admin ramah, pengiriman tepat waktu. Langganan terus.', rating: 5, role: 'Ibu Rumah Tangga' }
  ],
  gallery: [],
  faqs: [
    { id: 'f1', question: 'Berapa lama pengiriman?', answer: 'Pengiriman dilakukan instan setelah pembayaran dikonfirmasi, biasanya 15-30 menit tergantung jarak.' },
    { id: 'f2', question: 'Apakah bisa bayar ditempat?', answer: 'Ya, kami melayani pembayaran Cash (COD) dan juga QRIS.' }
  ],
  infos: [
    { id: 'i1', title: 'Pengiriman Cepat', content: 'Kami menjamin produk sampai dalam kondisi dingin dan segar.', icon: 'truck', isActive: true },
    { id: 'i2', title: 'Jaminan Kualitas', content: 'Produk 100% Original dari Yakult Lady resmi.', icon: 'shield', isActive: true },
    { id: 'i3', title: 'Jam Operasional', content: 'Buka setiap hari pukul 08:00 - 17:00 WIB.', icon: 'clock', isActive: true }
  ],
  shopRating: 5.0
};

const DEFAULT_DB: DatabaseSchema = {
  transactions: [],
  history: [],
  losses: [],
  products: PRODUCTS,
  settings: {
    storeName: 'TOKOTOPARYA',
    whatsapp: '628123456789',
    qrisImageUrl: 'https://6981e829011752fb6df26a63.imgix.net/1001323452.jpg?w=367&h=364&ar=367%3A364', 
    qrisTimerMinutes: 10
  },
  content: DEFAULT_CONTENT
};

export const getDB = (): DatabaseSchema => {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (!data) return DEFAULT_DB;
    
    const parsed = JSON.parse(data);
    
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      losses: Array.isArray(parsed.losses) ? parsed.losses : [],
      products: Array.isArray(parsed.products) ? parsed.products : DEFAULT_DB.products,
      settings: parsed.settings || DEFAULT_DB.settings,
      content: parsed.content || DEFAULT_DB.content
    };
  } catch (e) {
    console.error("Gagal load DB, menggunakan default", e);
    return DEFAULT_DB;
  }
};

export const saveDB = (data: DatabaseSchema) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Storage Full atau Error", e);
    alert("Memori Browser Penuh! Data mungkin tidak tersimpan.");
  }
};

export const resetDB = () => {
  localStorage.removeItem(DB_KEY);
  return DEFAULT_DB;
};
