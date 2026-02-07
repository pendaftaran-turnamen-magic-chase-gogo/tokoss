
export const PROJECT_FILES: Record<string, string> = {
  "metadata.json": `{
  "name": "Yakult Shop Pro & Admin",
  "description": "Premium Yakult Ordering Platform with Dynamic QRIS and Pro Admin Panel",
  "requestFramePermissions": [
    "camera",
    "geolocation"
  ]
}`,
  "package.json": `{
  "name": "yakult-shop-pro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}`,
  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
  "vite.config.ts": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
  "index.html": `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Yakult Shop Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); }
        .yakult-gradient { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); }
        .yakult-text { color: #e11d48; }
        .yakult-bg { background-color: #e11d48; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .float-animation { animation: float 3s ease-in-out infinite; }
        @keyframes check-bounce { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-check { animation: check-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes pop-success { 0% { transform: scale(0.8); opacity: 0; } 40% { transform: scale(1.1); opacity: 1; } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .animate-pop { animation: pop-success 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
        .animate-shake { animation: shake-error 0.5s ease-in-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
</body>
</html>`,
  "api.php": `<?php
ob_start(); error_reporting(0); ini_set('display_errors', 0); header("Access-Control-Allow-Origin: *"); header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["status" => "success", "message" => "API Placeholder for Vercel"]);
?>`,
  "sse.php": `<?php
error_reporting(0); header('Content-Type: text/event-stream'); header('Cache-Control: no-cache'); header('Connection: keep-alive'); header('Access-Control-Allow-Origin: *');
echo ": heartbeat\n\n";
?>`,
  "src/index.tsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  "src/types.ts": `export type PaymentType = 'cash' | 'qris';
export type OrderStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export interface OrderItem { id: number; name: string; qty: number; price: number; }
export interface Customer { name: string; wa: string; address: string; lat?: number; lng?: number; }
export interface Transaction { id: string; type: PaymentType; customer: Customer; items: OrderItem[]; total: number; fee: number; status: OrderStatus; timestamp: number; proofUrl?: string; }
export interface LossRecord { id: string; amount: number; description: string; timestamp: number; }
export interface Product { id: number; name: string; desc: string; price: number; img: string; qrisUrl?: string; }
export interface Testimonial { id: string; name: string; email?: string; phone?: string; text: string; rating: number; img?: string; role?: string; timestamp?: number; }
export interface GalleryItem { id: string; title: string; img: string; }
export interface FaqItem { id: string; question: string; answer: string; }
export interface InfoSection { id: string; title: string; content: string; icon: 'truck' | 'star' | 'info' | 'clock' | 'shield'; isActive: boolean; }
export interface StoreContent { testimonials: Testimonial[]; gallery: GalleryItem[]; faqs: FaqItem[]; infos: InfoSection[]; shopRating: number; }
export interface StoreSettings { storeName: string; whatsapp: string; qrisImageUrl: string; qrisTimerMinutes: number; }`,
  "src/constants.ts": `import { Product } from './types';
export const RAW_QRIS_BASE = "00020101021126570011ID.DANA.WWW011893600915380003780002098000378000303UMI51440014ID.CO.QRIS.WWW0215ID10243620012490303UMI5204549953033605802ID5910Warr2 Shop6015Kab. Bandung Ba6105402936304BF4C";
export const PRODUCTS: Product[] = [
  { id: 1, name: "Yakult Original", desc: "Minuman probiotik asli.", price: 10500, img: "https://images.unsplash.com/photo-1621236300238-293838275919?auto=format&fit=crop&q=80&w=300", qrisUrl: "" },
  { id: 2, name: "Yakult Mangga", desc: "Rasa mangga segar.", price: 12000, img: "https://images.unsplash.com/photo-1553106972-386156327574?auto=format&fit=crop&q=80&w=300", qrisUrl: "" },
  { id: 3, name: "Yakult Light", desc: "Rendah gula & kalori (Total Bayar 13.200).", price: 13000, img: "https://6981e829011752fb6df26a63.imgix.net/1001323287.jpg?w=447&h=447", qrisUrl: "https://6981e829011752fb6df26a63.imgix.net/1001323460.jpg?w=345&h=346&ar=345%3A346" },
  { id: 4, name: "Test Produk", desc: "Produk uji coba sistem (Total Bayar 300).", price: 100, img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300", qrisUrl: "https://6981e829011752fb6df26a63.imgix.net/1001323452.jpg?w=367&h=364" }
];
export const ADMIN_CREDENTIALS = { user: "arya1212", pass: "ab87bCBG$@y5542hhKLnb" };
export const COUNTRY_CODES = [
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' }
];`,
  "src/utils.ts": `import { Product } from './types';
export function formatCurrency(value: number): string { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value); }
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas'); const maxWidth = 500;
        if (img.width <= maxWidth) { resolve(reader.result as string); return; }
        const scaleFactor = maxWidth / img.width; elem.width = maxWidth; elem.height = img.height * scaleFactor;
        const ctx = elem.getContext('2d'); ctx?.drawImage(img, 0, 0, elem.width, elem.height);
        resolve(elem.toDataURL('image/jpeg', 0.7));
      }; img.onerror = (error) => reject(error);
    }; reader.onerror = (error) => reject(error);
  });
};`,
  "src/storage.ts": `import { Transaction, LossRecord, Product, StoreSettings, StoreContent } from './types';
import { PRODUCTS } from './constants';
const DB_KEY = 'yakult_shop_db';
export interface DatabaseSchema { transactions: Transaction[]; history: Transaction[]; losses: LossRecord[]; products: Product[]; settings: StoreSettings; content: StoreContent; }
const DEFAULT_CONTENT: StoreContent = { testimonials: [{ id: 't1', name: 'Budi Santoso', text: 'Pelayanan sangat cepat dan Yakultnya masih dingin segar!', rating: 5, role: 'Pelanggan' }, { id: 't2', name: 'Siti Aminah', text: 'Admin ramah, pengiriman tepat waktu.', rating: 5, role: 'Ibu Rumah Tangga' }], gallery: [], faqs: [{ id: 'f1', question: 'Berapa lama pengiriman?', answer: 'Pengiriman dilakukan instan setelah pembayaran.' }], infos: [{ id: 'i1', title: 'Pengiriman Cepat', content: 'Kami menjamin produk sampai dingin.', icon: 'truck', isActive: true }], shopRating: 5.0 };
const DEFAULT_DB: DatabaseSchema = { transactions: [], history: [], losses: [], products: PRODUCTS, settings: { storeName: 'TOKOTOPARYA', whatsapp: '628123456789', qrisImageUrl: 'https://6981e829011752fb6df26a63.imgix.net/1001323452.jpg?w=367&h=364&ar=367%3A364', qrisTimerMinutes: 10 }, content: DEFAULT_CONTENT };
export const getDB = (): DatabaseSchema => { try { const data = localStorage.getItem(DB_KEY); if (!data) return DEFAULT_DB; const parsed = JSON.parse(data); return { ...DEFAULT_DB, ...parsed }; } catch (e) { return DEFAULT_DB; } };
export const saveDB = (data: DatabaseSchema) => { localStorage.setItem(DB_KEY, JSON.stringify(data)); };`,
  "src/App.tsx": `import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import AdminDashboard from './pages/AdminDashboard';
import { Transaction, LossRecord, Product, StoreSettings, StoreContent, Testimonial } from './types';
import { PRODUCTS } from './constants';
import { getDB, saveDB } from './storage'; 

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

const App: React.FC = () => {
  const [storeData, setStoreData] = useState(getDB());
  const activeRef = useRef(storeData.transactions || []);
  const historyRef = useRef(storeData.history || []);
  
  const saveAndSync = (newData: any) => {
    const updated = { ...storeData, ...newData };
    saveDB(updated);
    setStoreData(updated);
  };

  const loadData = useCallback(() => {
    setStoreData(getDB());
  }, []);

  useEffect(() => {
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [loadData]);

  const addTransaction = (tx: Transaction) => {
      const newActive = [tx, ...(storeData.transactions || [])];
      saveAndSync({ transactions: newActive });
  };

  const updateStatus = (id: string, status: any) => {
      const tx = storeData.transactions.find((t:any) => t.id === id);
      if(tx) {
          const newActive = storeData.transactions.filter((t:any) => t.id !== id);
          const newHistory = [{...tx, status}, ...(storeData.history || [])];
          saveAndSync({ transactions: newActive, history: newHistory });
      }
  };
  
  const updateProof = (id: string, url: string) => {
      const newActive = storeData.transactions.map((t:any) => t.id === id ? {...t, proofUrl: url} : t);
      saveAndSync({ transactions: newActive });
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ShopPage addTransaction={addTransaction} cancelTransaction={(id)=>updateStatus(id, 'cancelled')} allTransactions={[...(storeData.transactions||[]), ...(storeData.history||[])]} updateProof={updateProof} products={storeData.products} settings={storeData.settings} content={storeData.content} onAddTestimonial={(t)=>{ const newT = [t, ...storeData.content.testimonials]; saveAndSync({content: {...storeData.content, testimonials: newT}}); }} />} />
        <Route path="/admin" element={<AdminDashboard activeTransactions={storeData.transactions||[]} historyTransactions={storeData.history||[]} losses={storeData.losses||[]} products={storeData.products} settings={storeData.settings} content={storeData.content} updateStatus={updateStatus} addLoss={(l)=>{saveAndSync({losses: [l, ...storeData.losses]})}} saveProducts={(p)=>saveAndSync({products:p})} saveSettings={(s)=>saveAndSync({settings:s})} saveContent={(c)=>saveAndSync({content:c})} clearData={()=>{saveAndSync({transactions:[], history:[], losses:[]})}} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};
export default App;`,
  "src/pages/AdminDashboard.tsx": "// Will be filled by the actual file content on runtime if using dynamic import, or manual update",
  "src/source_code_data.ts": "export const PROJECT_FILES = {};" 
};
