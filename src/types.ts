
export type PaymentType = 'cash' | 'qris';
export type OrderStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
}

export interface Customer {
  name: string;
  wa: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface Transaction {
  id: string;
  type: PaymentType;
  customer: Customer;
  items: OrderItem[];
  total: number;
  fee: number;
  status: OrderStatus;
  timestamp: number;
  proofUrl?: string; // Base64 of the uploaded proof
}

export interface LossRecord {
  id: string;
  amount: number;
  description: string;
  timestamp: number;
}

export interface Product {
  id: number;
  name: string;
  desc: string;
  price: number;
  img: string;
  qrisUrl?: string;
}

// --- NEW CONTENT TYPES ---

export interface Testimonial {
  id: string;
  name: string;
  email?: string; // Added
  phone?: string; // Added
  text: string;
  rating: number; // 1 - 5
  img?: string; // Base64 image user/staff
  role?: string; // e.g. "Pelanggan Setia"
  timestamp?: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  img: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface InfoSection {
  id: string;
  title: string;
  content: string;
  icon: 'truck' | 'star' | 'info' | 'clock' | 'shield'; 
  isActive: boolean;
}

export interface StoreContent {
  testimonials: Testimonial[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  infos: InfoSection[];
  shopRating: number; // Calculated average
}

export interface StoreSettings {
  storeName: string;
  whatsapp: string;
  qrisImageUrl: string;
  qrisTimerMinutes: number;
}
