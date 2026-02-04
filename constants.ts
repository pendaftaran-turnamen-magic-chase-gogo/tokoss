
import { Product } from './types';

// Updated QRIS String (User Provided)
// NMID: ID1024362001249
export const RAW_QRIS_BASE = "00020101021126570011ID.DANA.WWW011893600915380003780002098000378000303UMI51440014ID.CO.QRIS.WWW0215ID10243620012490303UMI5204549953033605802ID5910Warr2 Shop6015Kab. Bandung Ba6105402936304BF4C";

export const PRODUCTS: Product[] = [
  { 
    id: 1, 
    name: "Yakult Original", 
    desc: "Minuman probiotik asli.", 
    price: 10500, 
    img: "https://images.unsplash.com/photo-1621236300238-293838275919?auto=format&fit=crop&q=80&w=300", 
    qrisUrl: "" 
  },
  { 
    id: 2, 
    name: "Yakult Mangga", 
    desc: "Rasa mangga segar.", 
    price: 12000, 
    img: "https://images.unsplash.com/photo-1553106972-386156327574?auto=format&fit=crop&q=80&w=300", 
    qrisUrl: "" 
  },
  { 
    id: 3, 
    name: "Yakult Light", 
    desc: "Rendah gula & kalori (Total Bayar 13.200).", 
    price: 13000, // +Fee 200 = 13.200 sesuai QRIS
    img: "https://6981e829011752fb6df26a63.imgix.net/1001323287.jpg?w=447&h=447", 
    qrisUrl: "https://6981e829011752fb6df26a63.imgix.net/1001323460.jpg?w=345&h=346&ar=345%3A346" 
  },
  { 
    id: 4, 
    name: "Test Produk", 
    desc: "Produk uji coba sistem (Total Bayar 300).", 
    price: 100, // +Fee 200 = 300 sesuai QRIS
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300", 
    qrisUrl: "https://6981e829011752fb6df26a63.imgix.net/1001323452.jpg?w=367&h=364" 
  }
];

export const ADMIN_CREDENTIALS = {
  user: "arya1212",
  pass: "ab87bCBG$@y5542hhKLnb"
};

// FULL COUNTRY LIST
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
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: '+855', name: 'Cambodia', flag: '🇰🇭' },
  { code: '+673', name: 'Brunei', flag: '🇧🇳' },
  { code: '+670', name: 'Timor-Leste', flag: '🇹🇱' },
];
