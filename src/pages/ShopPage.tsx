import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Send, MapPin, X, Check, Wallet, QrCode, Camera, ShoppingBag, ChevronUp, Loader2, Clock, Trash2, AlertTriangle, RefreshCw, PartyPopper, Ban, Search, ChevronDown, Globe, MessageCircle, Star, ChevronRight, Info, Edit3, Lock, ShieldCheck } from 'lucide-react';
import { Transaction, PaymentType, Customer, OrderItem, Product, StoreSettings, StoreContent, Testimonial } from '../types';
import { formatCurrency } from '../utils';
import { COUNTRY_CODES } from '../constants';

interface ShopPageProps {
  addTransaction: (tx: Transaction) => void;
  cancelTransaction: (id: string) => void;
  allTransactions: Transaction[];
  updateProof: (id: string, url: string) => void;
  products: Product[];
  settings: StoreSettings;
  content: StoreContent;
  onAddTestimonial: (testi: Testimonial) => void;
}

const successSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); 
const errorSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3'); 

// --- DRAGGABLE WHATSAPP COMPONENT ---
const DraggableWhatsApp = ({ number, orderId }: { number: string, orderId: string | null }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const handleStart = (clientX: number, clientY: number) => {
        isDragging.current = true;
        offset.current = { x: clientX - position.x, y: clientY - position.y };
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging.current) return;
        const newX = clientX - offset.current.x;
        const newY = clientY - offset.current.y;
        const boundedX = Math.max(10, Math.min(window.innerWidth - 70, newX));
        const boundedY = Math.max(10, Math.min(window.innerHeight - 70, newY));
        setPosition({ x: boundedX, y: boundedY });
    };

    const handleEnd = () => { isDragging.current = false; };

    const openWA = () => {
        if (!isDragging.current) {
            let cleanNumber = number.replace(/\D/g, '');
            if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.substring(1);
            let message = orderId ? `Halo Admin, pesanan saya No ${orderId} belum diterima/diproses. Mohon bantuannya.` : "Halo Admin, saya ingin bertanya mengenai toko/produk.";
            window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    useEffect(() => {
        const touchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
        const touchEnd = () => handleEnd();
        const mouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const mouseUp = () => handleEnd();
        window.addEventListener('touchmove', touchMove);
        window.addEventListener('touchend', touchEnd);
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
        return () => {
            window.removeEventListener('touchmove', touchMove);
            window.removeEventListener('touchend', touchEnd);
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
    }, [position]); 

    if (!number) return null;

    return (
        <div style={{ left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none' }} className="fixed z-[999] cursor-pointer active:scale-95 transition-transform" onMouseDown={(e) => handleStart(e.clientX, e.clientY)} onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)} onClick={openWA}>
            <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 border-2 border-white animate-in zoom-in spin-in-12 duration-500"><MessageCircle size={28} className="text-white" fill="white" /></div>
        </div>
    );
};

const ShopPage: React.FC<ShopPageProps> = ({ addTransaction, cancelTransaction, allTransactions, updateProof, products, settings, content, onAddTestimonial }) => {
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [showForm, setShowForm] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [customer, setCustomer] = useState<Customer>({ name: '', wa: '', address: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(true);
  const [currentTxId, setCurrentTxId] = useState<string | null>(localStorage.getItem('current_order_id'));
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', phone: '', message: '', rating: 0 });

  const [waCountry, setWaCountry] = useState(COUNTRY_CODES[0]); 
  const [waNumber, setWaNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [timerStr, setTimerStr] = useState("00:00");
  const [isExpired, setIsExpired] = useState(false);
  
  const activeTx = allTransactions.find(t => t.id === currentTxId);
  const filteredCountries = COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(searchCountry.toLowerCase()) || c.code.includes(searchCountry));

  useEffect(() => { successSound.load(); errorSound.load(); }, []);

  useEffect(() => {
    if (currentTxId && allTransactions.length > 0) {
        const found = allTransactions.find(t => t.id === currentTxId);
        if (!found) closeTransactionCycle();
    }
  }, [currentTxId, allTransactions]);

  useEffect(() => {
      if (!activeTx) return;
      if (activeTx.status === 'confirmed') {
          successSound.currentTime = 0;
          successSound.play().catch(e => console.log(e));
          setIsPopupOpen(true);
      } else if (activeTx.status === 'rejected' || activeTx.status === 'cancelled') {
          if(isPopupOpen) { errorSound.currentTime = 0; errorSound.play().catch(e => console.log(e)); }
      }
  }, [activeTx?.status]);

  useEffect(() => {
    const checkStorage = () => {
      const storedId = localStorage.getItem('current_order_id');
      if (storedId !== currentTxId) { setCurrentTxId(storedId); setIsPopupOpen(true); }
    };
    window.addEventListener('storage', checkStorage);
    return () => window.removeEventListener('storage', checkStorage);
  }, [currentTxId]);

  useEffect(() => {
    if (!activeTx || activeTx.status !== 'pending' || activeTx.type !== 'qris') { setIsExpired(false); return; }
    const durationMinutes = settings.qrisTimerMinutes || 10;
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = activeTx.timestamp + durationMs;
    const tick = () => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) { setTimerStr("00:00"); setIsExpired(true); } 
        else { setIsExpired(false); const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000); setTimerStr(`${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`); }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeTx, settings.qrisTimerMinutes]);

  const updateCart = (id: number, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id === Number(id));
    return sum + (p?.price || 0) * (qty as number);
  }, 0);

  const getGeolocation = () => {
    if (!navigator.geolocation) return alert('Geolocation tidak didukung browser ini.');
    navigator.geolocation.getCurrentPosition(pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); }, () => alert('Gagal mengambil lokasi. Izinkan akses GPS.'));
  };

  const handleWaNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ''); 
      if (val.startsWith('0')) val = val.substring(1); 
      setWaNumber(val);
      setCustomer(prev => ({ ...prev, wa: `${waCountry.code}${val}` }));
  };

  const selectCountry = (c: typeof COUNTRY_CODES[0]) => {
      setWaCountry(c);
      setIsCountryPickerOpen(false);
      setSearchCountry('');
      setCustomer(prev => ({ ...prev, wa: `${c.code}${waNumber}` }));
  };

  const handleCheckout = async () => {
    if (!customer.name || !waNumber || !customer.address || !location) { alert('Mohon lengkapi data (Nama, WA, Alamat) dan bagikan lokasi!'); return; }
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderItems: OrderItem[] = Object.entries(cart).map(([id, qty]) => { const p = products.find(x => x.id === Number(id))!; return { id: p.id, name: p.name, qty: qty as number, price: p.price }; });
    const fee = selectedPayment === 'qris' ? 200 : 0;
    const newTx: Transaction = { id: `ORD-${Date.now()}`, type: selectedPayment!, customer: { ...customer, ...location }, items: orderItems, total: cartTotal + fee, fee, status: 'pending', timestamp: Date.now() };
    addTransaction(newTx);
    setCurrentTxId(newTx.id);
    localStorage.setItem('current_order_id', newTx.id);
    setShowForm(false); setIsPopupOpen(true); setIsExpired(false); setIsSubmitting(false);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExpired) { alert("Waktu pembayaran telah habis. Silakan buat pesanan ulang."); return; }
    const file = e.target.files?.[0];
    if (file && currentTxId) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateProof(currentTxId, reader.result as string);
        alert('Bukti berhasil dikirim! Admin akan segera memproses.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelOrder = async () => {
    if (currentTxId) {
        setIsCancelling(true);
        cancelTransaction(currentTxId);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsCancelling(false);
        setIsExpired(false);
        setIsPopupOpen(true);
    }
  };

  const closeTransactionCycle = () => { setCurrentTxId(null); localStorage.removeItem('current_order_id'); setIsPopupOpen(false); setIsExpired(false); setCart({}); };

  const getActiveQrisUrl = () => {
      if (!activeTx || activeTx.type !== 'qris' || activeTx.items.length === 0) return settings.qrisImageUrl;
      if (activeTx.items.length === 1) { const p = products.find(p => p.id === activeTx.items[0].id); if (p && p.qrisUrl) return p.qrisUrl; }
      return settings.qrisImageUrl;
  };

  const handleSubmitReview = () => {
      if (!reviewForm.name || !reviewForm.email || !reviewForm.phone || !reviewForm.message || reviewForm.rating === 0) {
          alert("Mohon lengkapi semua data dan pilih bintang.");
          return;
      }
      const newTesti: Testimonial = {
          id: `T-${Date.now()}`,
          name: reviewForm.name,
          email: reviewForm.email,
          phone: reviewForm.phone,
          text: reviewForm.message,
          rating: reviewForm.rating,
          role: 'Pelanggan',
          timestamp: Date.now()
      };
      onAddTestimonial(newTesti);
      setShowReviewModal(false);
      setReviewForm({ name: '', email: '', phone: '', message: '', rating: 0 });
      alert("Terima kasih atas ulasan Anda!");
  };

  const qrisToShow = getActiveQrisUrl();
  const getStatusBarColor = () => { if (activeTx?.status === 'confirmed') return 'bg-emerald-500 shadow-emerald-500/40 ring-2 ring-emerald-400/50'; if (activeTx?.status === 'rejected' || activeTx?.status === 'cancelled') return 'bg-rose-500 shadow-rose-500/40 ring-2 ring-rose-400/50'; return 'bg-amber-500 shadow-amber-500/40 ring-2 ring-amber-400/50'; };
  const getStatusBarText = () => { if (activeTx?.status === 'confirmed') return { title: 'Pesanan Selesai', desc: 'Pembayaran Diterima!' }; if (activeTx?.status === 'rejected') return { title: 'Pesanan Gagal', desc: 'Pembayaran Ditolak' }; if (activeTx?.status === 'cancelled') return { title: 'Pesanan Batal', desc: 'Dibatalkan Pengguna' }; return { title: 'Pesanan Berjalan', desc: 'Menunggu Pembayaran...' }; };
  const statusBar = getStatusBarText();

  return (
    <div className="min-h-screen bg-slate-100 relative">
      <DraggableWhatsApp number={settings.whatsapp} orderId={currentTxId} />

      {/* --- FLOATING ADMIN BUTTON (PASTI KELIHATAN) --- */}
      <Link to="/admin" className="fixed top-4 right-4 z-[9999] bg-white text-rose-600 p-3 rounded-full shadow-2xl hover:scale-110 transition-transform ring-4 ring-rose-100 border-2 border-rose-500">
         <ShieldCheck size={24} strokeWidth={2.5} />
      </Link>

      {/* Header */}
      <div className="yakult-gradient px-6 pt-12 pb-24 rounded-b-[48px] text-white shadow-xl relative overflow-hidden z-20">
        <div className="relative z-10 text-center sm:text-left">
          <h1 className="text-3xl font-black tracking-tight uppercase drop-shadow-sm">{settings.storeName}</h1>
          <p className="opacity-90 text-sm font-medium mb-3">Fresh & Fast Delivery</p>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
              <Star className="fill-amber-400 text-amber-400" size={16} />
              <span className="font-bold text-sm">{content.shopRating || '5.0'} / 5.0</span>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10"><ShoppingCart size={180} /></div>
      </div>

      {/* Grid Produk - Background Abu-abu */}
      <div className="bg-slate-100 pb-20 relative z-10">
          <div className="px-5 -mt-12 grid grid-cols-2 gap-4 max-w-4xl mx-auto relative z-20">
            {products.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="relative aspect-square mb-3 bg-slate-50 rounded-2xl overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{p.name}</h3>
                <p className="text-[10px] text-slate-400 mb-2 truncate">{p.desc}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="yakult-text font-black text-sm">{formatCurrency(p.price)}</span>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
                    <button onClick={() => updateCart(p.id, -1)} className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm"><Minus size={12}/></button>
                    <span className="text-[10px] font-bold w-4 text-center">{cart[p.id] || 0}</span>
                    <button onClick={() => updateCart(p.id, 1)} className="w-6 h-6 yakult-bg text-white rounded-full flex items-center justify-center shadow-sm"><Plus size={12}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="bg-white rounded-t-[48px] -mt-12 pt-16 pb-32 relative z-20 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] border-t border-white/50">
          
          {content.infos.length > 0 && (
              <div className="px-5 max-w-4xl mx-auto mb-16">
                  <h3 className="text-lg font-black text-slate-800 mb-6 px-2 flex items-center gap-2"><Info size={20} className="text-rose-500"/> Info Toko</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {content.infos.map((info) => (
                          <div key={info.id} className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 flex items-start gap-4 hover:bg-slate-100 transition-colors">
                              <div className="p-3 bg-white text-rose-500 shadow-sm rounded-2xl">
                                  <Info size={24}/>
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{info.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{info.content}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {content.gallery.length > 0 && (
              <div className="px-5 max-w-4xl mx-auto mb-16">
                  <h3 className="text-lg font-black text-slate-800 mb-6 px-2 flex items-center gap-2"><Camera size={20} className="text-rose-500"/> Dokumentasi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {content.gallery.map((g) => (
                          <div key={g.id} className="relative aspect-square rounded-[24px] overflow-hidden shadow-sm group">
                              <img src={g.img} alt={g.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <p className="text-[10px] text-white font-bold truncate">{g.title}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="mb-16 overflow-hidden">
              <div className="px-5 max-w-4xl mx-auto mb-6 flex justify-between items-end">
                  <div>
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><MessageCircle size={20} className="text-rose-500"/> Apa Kata Mereka?</h3>
                      <p className="text-xs text-slate-500 mt-1">Ulasan asli dari pelanggan kami.</p>
                  </div>
                  <button onClick={() => setShowReviewModal(true)} className="flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl transition-all shadow-sm">
                      <Edit3 size={14} /> Beri Ulasan
                  </button>
              </div>
              {content.testimonials.length > 0 ? (
                  <div className="flex overflow-x-auto snap-x snap-mandatory px-5 pb-6 gap-4 max-w-4xl mx-auto custom-scrollbar">
                      {content.testimonials.map((t) => (
                          <div key={t.id} className="snap-center shrink-0 w-[280px] bg-white p-6 rounded-[32px] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col hover:-translate-y-1 transition-transform">
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden ring-2 ring-white shadow-sm">
                                      {t.img ? <img src={t.img} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">{t.name[0]}</div>}
                                  </div>
                                  <div>
                                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{t.name}</h4>
                                      <div className="flex gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400"/><span className="text-[10px] font-bold text-slate-600">{t.rating}.0</span></div>
                                  </div>
                              </div>
                              <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-3">"{t.text}"</p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="px-5">
                      <div className="p-6 bg-slate-50 rounded-[24px] border border-dashed border-slate-300 text-center text-slate-400 text-sm italic">
                          Belum ada ulasan. Jadilah yang pertama!
                      </div>
                  </div>
              )}
          </div>

          {content.faqs.length > 0 && (
              <div className="px-5 max-w-4xl mx-auto mb-16">
                  <h3 className="text-lg font-black text-slate-800 mb-6 px-2 flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px]">?</div> Tanya Jawab</h3>
                  <div className="space-y-3">
                      {content.faqs.map((f, i) => (
                          <div key={f.id} className="bg-white rounded-[24px] overflow-hidden border border-slate-100 hover:border-rose-100 transition-colors shadow-sm group">
                              <button onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)} className="w-full flex justify-between items-center p-5 text-left font-bold text-sm text-slate-800 hover:bg-slate-50 transition-colors">
                                  <span className="pr-4">{f.question}</span>
                                  <div className={`p-2 rounded-full bg-slate-100 group-hover:bg-rose-50 transition-colors ${openFaqIndex === i ? 'text-rose-500' : 'text-slate-400'}`}>
                                    <ChevronDown size={16} className={`transition-transform duration-300 ${openFaqIndex === i ? 'rotate-180' : ''}`}/>
                                  </div>
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ${openFaqIndex === i ? 'max-h-40' : 'max-h-0'}`}>
                                  <p className="px-5 pb-5 pt-0 text-xs text-slate-500 leading-relaxed">
                                      {f.answer}
                                  </p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* Footer with Admin Link (Backup) */}
          <div className="py-8 text-center text-slate-400 text-xs">
              <p>&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
              <Link to="/admin" className="mt-4 inline-flex items-center gap-1.5 font-bold text-slate-400 hover:text-rose-500 transition-colors px-4 py-2 rounded-full hover:bg-rose-50">
                  <Lock size={12}/> Login Administrator
              </Link>
          </div>
      </div>

      {/* Cart Float */}
      {cartTotal > 0 && !currentTxId && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-md glass border border-white/40 rounded-[32px] p-4 shadow-[0_10px_40px_-10px_rgba(225,29,72,0.3)] z-50 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500 gap-2 ring-1 ring-white/50 backdrop-blur-xl">
          <div className="flex-1 min-w-0 pl-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Bayar</p>
            <p className="text-xl font-black yakult-text truncate">{formatCurrency(cartTotal)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCartModal(true)} className="p-3 bg-white text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-50 transition-colors shadow-sm active:scale-90"><ShoppingBag size={20} /></button>
            <button onClick={() => { setSelectedPayment('cash'); setShowForm(true); }} className="p-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors font-bold text-xs flex flex-col items-center justify-center min-w-[60px] active:scale-95"><Wallet size={18} className="mb-0.5"/> CASH</button>
            <button onClick={() => { setSelectedPayment('qris'); setShowForm(true); }} className="px-4 py-3 yakult-bg text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-200 flex flex-col items-center justify-center min-w-[70px] active:scale-95 hover:brightness-110"><QrCode size={18} className="mb-0.5"/> QRIS</button>
          </div>
        </div>
      )}

      {/* --- FLOATING STATUS BAR --- */}
      {currentTxId && activeTx && !isPopupOpen && (
        <div onClick={() => setIsPopupOpen(true)} className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md ${getStatusBarColor()} text-white p-4 rounded-3xl z-40 flex items-center justify-between cursor-pointer transition-all duration-500 animate-in slide-in-from-bottom-4`}>
          <div className="flex items-center gap-3">
            {activeTx.status === 'pending' ? <Loader2 className="animate-spin" size={24} /> : activeTx.status === 'confirmed' ? <Check className="animate-check" size={24} /> : <X className="animate-pop" size={24} />}
            <div className="text-left"><p className="font-bold text-[10px] uppercase opacity-90">{statusBar.title}</p><p className="font-black text-sm">{statusBar.desc}</p></div>
          </div>
          <div className="flex items-center gap-2"><ChevronUp size={24} />{activeTx.status !== 'pending' && (<button onClick={(e) => { e.stopPropagation(); closeTransactionCycle(); }} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full transition-colors ml-2 active:scale-90"><X size={16} strokeWidth={3} /></button>)}</div>
        </div>
      )}

      {/* Overlay Status Pesanan & Cart Modal & Form Order Modal (Standard) - NO CHANGES TO LOGIC */}
      {currentTxId && activeTx && isPopupOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {activeTx.status === 'pending' ? (
                <div className="p-8 text-center">
                    <div className="flex justify-between items-start mb-2"><div className="text-left"><h2 className="text-2xl font-black text-slate-800">Scan & Bayar</h2><p className="text-slate-400 text-xs">QRIS TOKO RESMI</p></div><button onClick={() => setIsPopupOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"><X size={20}/></button></div>
                    {activeTx.type === 'qris' ? (
                        <>
                            <div className="bg-white p-3 border-4 border-rose-600 rounded-[32px] inline-block mb-4 shadow-xl relative group min-h-[250px] flex items-center justify-center overflow-hidden">{qrisToShow ? <img src={qrisToShow} alt="QR" className="w-48 h-48 rounded-xl object-contain"/> : <div className="text-xs text-rose-400 font-bold text-center">QRIS Error</div>}</div>
                            <div className="flex items-center justify-center gap-2 text-rose-600 font-black text-xl mb-6 bg-rose-50 py-2 rounded-xl"><Clock size={20} className="animate-pulse"/><span>{timerStr}</span></div>
                            <label className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${activeTx.proofUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer'}`}><input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} disabled={isExpired || isUploading} />{isUploading ? <Loader2 className="animate-spin text-slate-400" size={24}/> : activeTx.proofUrl ? <><Check size={18}/> Bukti Terkirim</> : <><Camera size={18}/> Upload Bukti</>}</label>
                        </>
                    ) : (
                        <div className="py-6">
                            <div className="bg-emerald-100 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 float-animation"><Wallet size={40}/></div><h2 className="text-2xl font-black text-slate-800">Bayar di Tempat</h2><p className="text-slate-500 text-sm px-2 mb-6">Siapkan uang pas <b>{formatCurrency(activeTx.total)}</b>.</p>
                        </div>
                    )}
                    <button type="button" onClick={handleCancelOrder} disabled={isCancelling} className="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold text-sm hover:bg-rose-100 flex items-center justify-center gap-2 mt-4">{isCancelling ? <Loader2 className="animate-spin"/> : <><Trash2 size={16}/> Batalkan Pesanan</>}</button>
                </div>
            ) : activeTx.status === 'confirmed' ? (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
                    <div className="w-48 h-48 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-200 animate-pop border-[8px] border-white ring-4 ring-emerald-100"><Check size={96} className="text-white drop-shadow-lg animate-check" strokeWidth={5} /></div>
                    <h2 className="text-3xl font-black text-emerald-600">PEMBAYARAN<br/>DITERIMA!</h2>
                    <button onClick={closeTransactionCycle} className="mt-auto w-full py-5 bg-slate-900 text-white rounded-3xl font-black shadow-lg hover:bg-slate-800 transition-all active:scale-95 z-20 relative">SELESAI</button>
                </div>
            ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
                    <div className="w-48 h-48 bg-gradient-to-br from-rose-500 to-rose-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-rose-200 animate-shake border-[8px] border-white ring-4 ring-rose-100">{activeTx.status === 'cancelled' ? <Ban size={96} className="text-white"/> : <X size={96} className="text-white drop-shadow-lg animate-pop" strokeWidth={5} />}</div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase">{activeTx.status === 'cancelled' ? 'PESANAN\nDIBATALKAN' : 'PESANAN\nDITOLAK'}</h2>
                    <button onClick={closeTransactionCycle} className="mt-auto w-full py-5 bg-slate-100 text-slate-500 rounded-3xl font-bold hover:bg-slate-200 transition-all active:scale-95">TUTUP</button>
                </div>
            )}
          </div>
        </div>
      )}

      {showCartModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4"><h3 className="text-xl font-black text-slate-800">Keranjang Belanja</h3><button onClick={() => setShowCartModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"><X size={20}/></button></div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(cart).map(([id, qty]) => {
                        const p = products.find(x => x.id === Number(id));
                        if(!p) return null;
                        return (
                            <div key={id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-2xl transition-colors"><img src={p.img} className="w-14 h-14 rounded-xl object-cover bg-slate-50" /><div className="flex-1"><h4 className="font-bold text-slate-800 text-sm">{p.name}</h4><p className="text-xs text-rose-500 font-bold">{formatCurrency(p.price * (qty as number))}</p></div><div className="flex items-center gap-2 bg-slate-100 rounded-full p-1"><button onClick={() => updateCart(Number(id), -1)} className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm"><Minus size={12}/></button><span className="text-xs font-bold w-4 text-center">{qty as number}</span><button onClick={() => updateCart(Number(id), 1)} className="w-6 h-6 yakult-bg text-white rounded-full flex items-center justify-center shadow-sm"><Plus size={12}/></button></div></div>
                        );
                    })}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100"><div className="flex justify-between items-center mb-4"><span className="font-bold text-slate-500">Total Tagihan</span><span className="font-black text-xl yakult-text">{formatCurrency(cartTotal)}</span></div><button onClick={() => setShowCartModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">Tutup & Lanjut Belanja</button></div>
            </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800">Data Pengiriman</h2><button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"><X size={20}/></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Nama Lengkap" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all" />
              <div className="flex items-center bg-slate-50 rounded-2xl border border-transparent focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200 transition-all relative">
                  <button onClick={() => setIsCountryPickerOpen(true)} className="flex items-center gap-2 pl-4 pr-3 py-4 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-l-2xl transition-colors"><span className="text-xl">{waCountry.flag}</span><span className="text-sm">{waCountry.code}</span><ChevronDown size={14} className="text-slate-400"/></button><div className="w-px h-6 bg-slate-300 mx-1"></div><input type="tel" placeholder="812..." value={waNumber} onChange={handleWaNumberChange} className="flex-1 bg-transparent border-none p-4 font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 w-full" />
                  {isCountryPickerOpen && (<div className="absolute top-full left-0 mt-2 w-full sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left max-h-[300px] flex flex-col"><div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10"><div className="bg-slate-50 rounded-xl flex items-center px-3 py-2 border border-slate-200 focus-within:border-rose-500 transition-colors"><Search size={14} className="text-slate-400 mr-2"/><input autoFocus type="text" placeholder="Cari negara..." className="bg-transparent text-xs font-bold outline-none w-full text-slate-700" value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)}/></div></div><div className="overflow-y-auto flex-1 custom-scrollbar p-1">{filteredCountries.map((c) => (<button key={c.code + c.name} onClick={() => selectCountry(c)} className="w-full text-left flex items-center gap-3 p-2.5 hover:bg-rose-50 rounded-xl transition-colors group"><span className="text-xl">{c.flag}</span><div className="flex-1"><p className="text-xs font-bold text-slate-700 group-hover:text-rose-600">{c.name}</p><p className="text-[10px] text-slate-400 font-medium">{c.code}</p></div>{waCountry.code === c.code && <Check size={14} className="text-rose-500"/>}</button>))}</div></div>)}
                  {isCountryPickerOpen && (<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsCountryPickerOpen(false)}></div>)}
              </div>
              <textarea placeholder="Alamat Lengkap" value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium min-h-[100px] focus:ring-2 focus:ring-rose-500 outline-none transition-all" />
              <button onClick={getGeolocation} className={`w-full py-4 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm transition-all ${location ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'}`}><MapPin size={18}/> {location ? 'Lokasi Terkunci ✓' : 'Bagikan Lokasi (Wajib)'}</button>
              <button onClick={handleCheckout} disabled={isSubmitting} className="w-full py-5 yakult-bg text-white rounded-3xl font-black shadow-xl shadow-rose-200 mt-4 hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <>ORDER SEKARANG <Send className="inline ml-2" size={18}/></>}</button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
          <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="text-center mb-6">
                      <h3 className="text-2xl font-black text-slate-800">Beri Ulasan</h3>
                      <p className="text-slate-500 text-sm">Bagaimana pengalaman belanja Anda?</p>
                  </div>
                  
                  <div className="space-y-4">
                      {/* Rating Stars */}
                      <div className="flex justify-center gap-2 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                  key={star}
                                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                  className={`transition-all duration-200 ${reviewForm.rating >= star ? 'scale-110' : 'scale-100 opacity-30 hover:opacity-50'}`}
                              >
                                  <Star size={36} className="fill-amber-400 text-amber-400" />
                              </button>
                          ))}
                      </div>

                      <input type="text" placeholder="Nama Lengkap" className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:border-rose-300 transition-colors" value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} />
                      <input type="email" placeholder="Email" className="w-full bg-slate-50 p-4 rounded-2xl font-medium outline-none border border-transparent focus:border-rose-300 transition-colors" value={reviewForm.email} onChange={e => setReviewForm({...reviewForm, email: e.target.value})} />
                      <input type="tel" placeholder="No. WhatsApp" className="w-full bg-slate-50 p-4 rounded-2xl font-medium outline-none border border-transparent focus:border-rose-300 transition-colors" value={reviewForm.phone} onChange={e => setReviewForm({...reviewForm, phone: e.target.value})} />
                      <textarea placeholder="Tulis pengalaman Anda di sini (opsional)..." className="w-full bg-slate-50 p-4 rounded-2xl font-medium outline-none h-24 resize-none border border-transparent focus:border-rose-300 transition-colors" value={reviewForm.message} onChange={e => setReviewForm({...reviewForm, message: e.target.value})} />

                      <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowReviewModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200">Batal</button>
                          <button onClick={handleSubmitReview} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">Kirim Ulasan</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ShopPage;