
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, History, TrendingDown, 
  Wallet, Check, X, Eye, 
  MapPin, MessageCircle, Menu, Search, Download, Wifi, Package, Loader2,
  Settings, Save, PlusCircle, Edit, Database, Clock, Server, Copy, AlertCircle, UploadCloud, Image as ImageIcon, QrCode, ChevronDown, CheckCircle, XCircle,
  Store, Trash2, BookOpen, Star, HelpCircle, Info, Image as ImgIcon, Plus, ChevronUp, MoreHorizontal
} from 'lucide-react';
import { Transaction, LossRecord, Product, StoreSettings, StoreContent, Testimonial, GalleryItem, FaqItem, InfoSection } from '../types';
import { ADMIN_CREDENTIALS, COUNTRY_CODES } from '../constants';
import { formatCurrency, compressImage } from '../utils';

declare global {
  interface Window {
    jspdf: any;
  }
}

interface AdminDashboardProps {
  activeTransactions: Transaction[];
  historyTransactions: Transaction[];
  losses: LossRecord[];
  products: Product[];
  settings: StoreSettings;
  content: StoreContent;
  updateStatus: (id: string, status: 'confirmed' | 'rejected') => void;
  addLoss: (loss: LossRecord) => void;
  saveProducts: (products: Product[]) => void;
  saveSettings: (settings: StoreSettings) => void;
  saveContent: (content: StoreContent) => void;
  clearData: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  activeTransactions, historyTransactions, losses, products, settings, content,
  updateStatus, addLoss, saveProducts, saveSettings, saveContent, clearData
}) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'dash' | 'active' | 'history' | 'losses' | 'products' | 'settings' | 'content'>('dash');
  const [contentSubTab, setContentSubTab] = useState<'testimoni' | 'gallery' | 'faq' | 'info'>('testimoni');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false); 
  
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [cancelNotification, setCancelNotification] = useState<string | null>(null);
  const prevHistoryLen = useRef(historyTransactions.length);

  // Modals
  const [showLossModal, setShowLossModal] = useState(false);
  const [lossForm, setLossForm] = useState({ amt: '', desc: '' });
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Product Edit
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', desc: '', price: '', img: '', qrisUrl: '' });
  const [isUploadingProductImg, setIsUploadingProductImg] = useState(false);

  // Settings
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [waCountry, setWaCountry] = useState(COUNTRY_CODES[0]);
  const [waNumber, setWaNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // --- CONTENT STATES ---
  const [testimonials, setTestimonials] = useState<Testimonial[]>(content.testimonials);
  const [gallery, setGallery] = useState<GalleryItem[]>(content.gallery);
  const [faqs, setFaqs] = useState<FaqItem[]>(content.faqs);
  const [infos, setInfos] = useState<InfoSection[]>(content.infos);

  // Content Modals
  const [showTestiModal, setShowTestiModal] = useState(false);
  const [testiForm, setTestiForm] = useState<Partial<Testimonial>>({ rating: 5 });
  
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryForm, setGalleryForm] = useState({ title: '', img: '' });

  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqForm, setFaqForm] = useState({ q: '', a: '' });

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoForm, setInfoForm] = useState<Partial<InfoSection>>({});

  const filteredCountries = COUNTRY_CODES.filter(c => 
    c.name.toLowerCase().includes(searchCountry.toLowerCase()) || 
    c.code.includes(searchCountry)
  );

  useEffect(() => {
    setSettingsForm(settings);
    setTestimonials(content.testimonials);
    setGallery(content.gallery);
    setFaqs(content.faqs);
    setInfos(content.infos);

    if (settings.whatsapp) {
        const found = COUNTRY_CODES.find(c => settings.whatsapp.startsWith(c.code.replace('+','')));
        if (found) {
            setWaCountry(found);
            setWaNumber(settings.whatsapp.substring(found.code.replace('+','').length));
        } else if (settings.whatsapp.startsWith('62')) {
            setWaCountry(COUNTRY_CODES.find(c => c.code === '+62') || COUNTRY_CODES[0]);
            setWaNumber(settings.whatsapp.substring(2));
        } else {
             setWaNumber(settings.whatsapp);
        }
    }
  }, [settings, content]);

  useEffect(() => {
    const checkAuth = () => {
       const savedAuth = localStorage.getItem('yakult_admin_auth');
       if (savedAuth) {
         try {
             const { user: u, expire } = JSON.parse(savedAuth);
             if (u === ADMIN_CREDENTIALS.user && new Date().getTime() < expire) {
               setIsAuthenticated(true);
             }
         } catch (e) {
             localStorage.removeItem('yakult_admin_auth');
         }
       }
    };
    checkAuth();
  }, []);

  useEffect(() => {
      if (historyTransactions.length > prevHistoryLen.current) {
          const newest = historyTransactions[0];
          if (newest && newest.status === 'cancelled') {
              setCancelNotification(`Pesanan ${newest.customer.name} telah DIBATALKAN oleh pengguna.`);
              setTimeout(() => setCancelNotification(null), 8000);
          }
      }
      prevHistoryLen.current = historyTransactions.length;
  }, [historyTransactions]);

  const showToast = (msg: string, type: 'success' | 'error') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => {
    const confirmed = historyTransactions.filter(t => t.status === 'confirmed');
    const revenue = confirmed.reduce((sum, t) => sum + (t.total - t.fee), 0);
    const fees = confirmed.reduce((sum, t) => sum + t.fee, 0);
    const totalItems = confirmed.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0);
    const totalLoss = losses.reduce((sum, l) => sum + l.amount, 0);
    
    return {
      revenue, fees, totalItems, loss: totalLoss,
      net: revenue + fees - totalLoss,
      pending: activeTransactions.length
    };
  }, [activeTransactions, historyTransactions, losses]);

  const handleLogin = () => {
    if (!user || !pass) return setLoginError("Isi username dan password!");
    setLoginError('');
    setIsLoggingIn(true);

    setTimeout(() => {
        if (user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass) {
            setIsAuthenticated(true);
            const expire = new Date().getTime() + (rememberMe ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000);
            localStorage.setItem('yakult_admin_auth', JSON.stringify({ user, expire }));
        } else {
            setLoginError("Username atau Password Salah!");
        }
        setIsLoggingIn(false);
    }, 800);
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('yakult_admin_auth');
      setUser('');
      setPass('');
  };

  const handleAction = (e: React.MouseEvent, id: string, status: 'confirmed' | 'rejected') => {
      e.preventDefault();
      e.stopPropagation();
      try {
          updateStatus(id, status);
          status === 'confirmed' ? showToast('Pesanan Diterima!', 'success') : showToast('Pesanan Ditolak.', 'error');
      } catch (err) {
          showToast('Gagal memproses.', 'error');
      }
  };

  const handleClearData = async () => {
      if(!window.confirm("Yakin ingin menghapus SEMUA data?")) return;
      setIsGlobalLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      clearData();
      setIsGlobalLoading(false);
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      showToast('Teks berhasil disalin!', 'success');
  };

  const getTimeAgo = (timestamp: number) => {
      const minutes = Math.floor((Date.now() - timestamp) / 60000);
      if (minutes < 1) return 'Baru saja';
      if (minutes > 60) return `${Math.floor(minutes/60)} jam lalu`;
      return `${minutes} menit lalu`;
  };

  // --- PRODUCT LOGIC ---
  const openProductModal = (product: Product | null = null) => {
      setEditingProduct(product);
      if (product) {
          setProductForm({ name: product.name, desc: product.desc, price: product.price.toString(), img: product.img, qrisUrl: product.qrisUrl || '' });
      } else {
          setProductForm({ name: '', desc: '', price: '', img: '', qrisUrl: '' });
      }
      setShowProductModal(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'img' | 'qrisUrl') => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploadingProductImg(true);
          try {
              const compressedBase64 = await compressImage(file);
              setProductForm(prev => ({ ...prev, [field]: compressedBase64 }));
          } catch (error) {
              alert("Gagal memproses gambar.");
          } finally {
              setIsUploadingProductImg(false);
          }
      }
  };

  const handleSaveProduct = async () => {
      if (!productForm.name || !productForm.price) return alert("Nama dan Harga wajib diisi!");
      setIsGlobalLoading(true);
      await new Promise(r => setTimeout(r, 800));
      const price = Number(productForm.price);
      let newProducts = [...products];
      if (editingProduct) {
          newProducts = newProducts.map(p => p.id === editingProduct.id ? { ...p, ...productForm, price } : p);
      } else {
          const newId = Math.max(...products.map(p => p.id), 0) + 1;
          newProducts.push({ id: newId, ...productForm, price });
      }
      saveProducts(newProducts);
      setIsGlobalLoading(false);
      setShowProductModal(false);
  };

  const handleDeleteProduct = (id: number) => {
      if (confirm('Hapus produk ini?')) {
          saveProducts(products.filter(p => p.id !== id));
      }
  };

  // --- SETTINGS LOGIC ---
  const handleWaNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value.replace(/\D/g, ''); 
      if (val.startsWith('0')) val = val.substring(1); 
      setWaNumber(val);
      const cleanPrefix = waCountry.code.replace('+', '');
      setSettingsForm(prev => ({ ...prev, whatsapp: `${cleanPrefix}${val}` }));
  };

  const selectCountry = (c: typeof COUNTRY_CODES[0]) => {
      setWaCountry(c);
      setIsCountryPickerOpen(false);
      setSearchCountry('');
      const cleanPrefix = c.code.replace('+', '');
      setSettingsForm(prev => ({ ...prev, whatsapp: `${cleanPrefix}${waNumber}` }));
  };

  const handleSaveSettings = async () => {
      if (!settingsForm.storeName || !settingsForm.whatsapp) return alert("Nama Toko & WA Wajib diisi!");
      setIsGlobalLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      saveSettings(settingsForm);
      setIsGlobalLoading(false);
      showToast('Pengaturan Berhasil Disimpan!', 'success');
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressedBase64 = await compressImage(file);
              setSettingsForm({ ...settingsForm, qrisImageUrl: compressedBase64 });
          } catch (e) {
              alert("Gagal memproses gambar.");
          }
      }
  };

  // --- LOSS LOGIC ---
  const handleAddLoss = async () => {
      if(!lossForm.amt || !lossForm.desc) return alert('Data tidak lengkap!');
      setIsGlobalLoading(true);
      await new Promise(r => setTimeout(r, 800));
      addLoss({ id: `LOSS-${Date.now()}`, amount: Number(lossForm.amt), description: lossForm.desc, timestamp: Date.now() });
      setIsGlobalLoading(false);
      setShowLossModal(false); 
      setLossForm({ amt: '', desc: '' });
  };

  // --- CONTENT MANAGEMENT LOGIC ---
  const calculateRating = (items: Testimonial[]) => {
      if (items.length === 0) return 5.0;
      const sum = items.reduce((a, b) => a + b.rating, 0);
      const avg = sum / items.length;
      return avg < 5 ? parseFloat(avg.toFixed(1)) : 5.0;
  };

  const handleSaveTesti = () => {
      if (!testiForm.name || !testiForm.text) return alert("Nama dan Ulasan wajib diisi");
      const newTesti: Testimonial = {
          id: testiForm.id || `T-${Date.now()}`,
          name: testiForm.name,
          text: testiForm.text,
          rating: testiForm.rating || 5,
          img: testiForm.img,
          role: testiForm.role || 'Pelanggan',
          email: testiForm.email || '',
          phone: testiForm.phone || ''
      };
      
      let newTestimonials = [...testimonials];
      if (testiForm.id) {
          newTestimonials = newTestimonials.map(t => t.id === testiForm.id ? newTesti : t);
      } else {
          newTestimonials.push(newTesti);
      }
      
      const newRating = calculateRating(newTestimonials);
      saveContent({ ...content, testimonials: newTestimonials, shopRating: newRating });
      setShowTestiModal(false);
      setTestiForm({ rating: 5 });
  };

  const handleDeleteTesti = (id: string) => {
      if (confirm('Hapus testimoni ini?')) {
          const newTestimonials = testimonials.filter(t => t.id !== id);
          const newRating = calculateRating(newTestimonials);
          saveContent({ ...content, testimonials: newTestimonials, shopRating: newRating });
      }
  };

  const handleTestiImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const base64 = await compressImage(file);
          setTestiForm(prev => ({ ...prev, img: base64 }));
      }
  };

  const handleSaveGallery = () => {
      if (!galleryForm.img) return alert("Gambar wajib upload");
      const newItem: GalleryItem = {
          id: `G-${Date.now()}`,
          title: galleryForm.title || 'Dokumentasi',
          img: galleryForm.img
      };
      const newGallery = [newItem, ...gallery];
      saveContent({ ...content, gallery: newGallery });
      setShowGalleryModal(false);
      setGalleryForm({ title: '', img: '' });
  };

  const handleDeleteGallery = (id: string) => {
      if(confirm('Hapus foto ini?')) {
          const newGallery = gallery.filter(g => g.id !== id);
          saveContent({ ...content, gallery: newGallery });
      }
  };

  const handleGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const base64 = await compressImage(file);
          setGalleryForm(prev => ({ ...prev, img: base64 }));
      }
  };

  const handleSaveFaq = () => {
      if (!faqForm.q || !faqForm.a) return alert("Isi Pertanyaan & Jawaban");
      const newFaq: FaqItem = { id: `F-${Date.now()}`, question: faqForm.q, answer: faqForm.a };
      const newFaqs = [...faqs, newFaq];
      saveContent({ ...content, faqs: newFaqs });
      setShowFaqModal(false);
      setFaqForm({ q: '', a: '' });
  };

  const handleDeleteFaq = (id: string) => {
      saveContent({ ...content, faqs: faqs.filter(f => f.id !== id) });
  };

  const handleSaveInfo = () => {
      if (!infoForm.title || !infoForm.content) return alert("Lengkapi data info");
      const newInfo: InfoSection = {
          id: infoForm.id || `I-${Date.now()}`,
          title: infoForm.title,
          content: infoForm.content,
          icon: infoForm.icon || 'info',
          isActive: true
      };
      let newInfos = [...infos];
      if (infoForm.id) {
          newInfos = newInfos.map(i => i.id === infoForm.id ? newInfo : i);
      } else {
          newInfos.push(newInfo);
      }
      saveContent({ ...content, infos: newInfos });
      setShowInfoModal(false);
      setInfoForm({});
  };

  const handleDeleteInfo = (id: string) => {
      saveContent({ ...content, infos: infos.filter(i => i.id !== id) });
  };

  const generatePDF = () => {
    if (!window.jspdf) return alert('Library PDF belum dimuat. Refresh halaman.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Keuangan', 14, 22);
    doc.setFontSize(11);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 30);
    doc.text(`Pendapatan Bersih: ${formatCurrency(stats.net)}`, 14, 40);
    doc.autoTable({
        startY: 50,
        head: [['Waktu', 'Pelanggan', 'Items', 'Total', 'Status']],
        body: historyTransactions.map(t => [
            new Date(t.timestamp).toLocaleDateString(),
            t.customer.name,
            t.items.map(i => `${i.name} (${i.qty})`).join(', '),
            formatCurrency(t.total),
            t.status.toUpperCase()
        ]),
    });
    doc.save('Laporan_Tokotoparya.pdf');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
        <div className="w-full max-w-md glass border border-white/10 rounded-[40px] p-8 sm:p-10 text-white shadow-2xl relative z-10 backdrop-blur-xl bg-white/5">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-rose-900/50"><LayoutDashboard size={40}/></div>
            <h1 className="text-3xl font-black tracking-tight">Admin Login</h1>
            <p className="text-slate-400 text-sm mt-2">Serverless Mode</p>
          </div>
          <div className="space-y-5">
            <input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600" placeholder="Username" />
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleLogin()} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600" placeholder="Password" />
            <div className="flex items-center gap-2 ml-2">
                <input type="checkbox" id="rem" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900/50" />
                <label htmlFor="rem" className="text-sm text-slate-400">Ingat Saya</label>
            </div>
            {loginError && <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs text-center font-bold">{loginError}</div>}
            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full py-5 bg-gradient-to-r from-rose-600 to-rose-500 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2">
                {isLoggingIn ? <Loader2 className="animate-spin"/> : 'MASUK DASHBOARD'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      
      {/* Toast */}
      {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-rose-900/90 border-rose-500 text-rose-100'}`}>
                  {toast.type === 'success' ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                  <span className="font-bold text-sm">{toast.msg}</span>
              </div>
          </div>
      )}

      {/* Mobile Menu Toggle */}
      <div className="md:hidden fixed top-4 right-4 z-[60]">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-slate-900 text-white rounded-full shadow-lg">
            {isSidebarOpen ? <X size={24}/> : <Menu size={24}/>}
        </button>
      </div>

      {/* Sidebar - SPLIT LAYOUT */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 flex flex-col shadow-2xl z-50 transform transition-transform duration-300 md:relative md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h1 className="text-2xl font-black text-rose-500 mb-2 tracking-tighter px-2">ADMIN SUPER</h1>
        <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-fit bg-blue-500/20 text-blue-400 animate-pulse mx-2">
          <Server size={14} /> SERVER MODE
        </div>

        {/* Top Scrollable Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {[
            { id: 'dash', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'active', label: 'Pesanan Aktif', icon: ShoppingBag, badge: stats.pending },
            { id: 'products', label: 'Produk', icon: Package },
            { id: 'content', label: 'Konten Website', icon: BookOpen }, // NEW
            { id: 'settings', label: 'Pengaturan', icon: Settings },
            { id: 'history', label: 'Riwayat', icon: History },
            { id: 'losses', label: 'Kerugian', icon: TrendingDown }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div>
              {item.badge ? <span className="bg-white text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        {/* Bottom Fixed Actions (Bordered) */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <button onClick={() => navigate('/')} className="w-full py-3.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-bold text-sm hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2">
            <Store size={18}/> BUKA TOKO
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowLossModal(true)} className="w-full py-3.5 border border-amber-500/30 text-amber-500 rounded-2xl font-bold text-xs hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1"><TrendingDown size={14}/> Rugi</button>
            <button onClick={generatePDF} className="w-full py-3.5 bg-slate-800 text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-1"><Download size={14}/> PDF</button>
          </div>

          <button onClick={handleClearData} disabled={isGlobalLoading} className="w-full py-3.5 border border-rose-500/20 text-rose-500/50 rounded-2xl font-bold text-xs hover:bg-rose-500/10 transition-all flex items-center justify-center">
            {isGlobalLoading ? <Loader2 className="animate-spin" size={16}/> : <><Trash2 size={16} className="inline mr-2"/> Reset Data</>}
          </button>
          <button onClick={handleLogout} className="w-full py-3.5 bg-white/5 text-slate-500 rounded-2xl font-bold text-xs hover:bg-white/10 hover:text-white transition-all">LOGOUT</button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        {/* DASHBOARD TAB */}
        {activeTab === 'dash' && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800 mb-8">Ringkasan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { l: 'Produk Terjual', v: formatCurrency(stats.revenue), i: ShoppingBag, c: 'rose' },
                { l: 'Total Fee', v: formatCurrency(stats.fees), i: Wallet, c: 'blue' },
                { l: 'Net Income', v: formatCurrency(stats.net), i: Check, c: 'emerald' },
                { l: 'Kerugian', v: formatCurrency(stats.loss), i: TrendingDown, c: 'amber' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-2xl bg-${s.c}-50 text-${s.c}-600 flex items-center justify-center mb-6`}><s.i size={24}/></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.l}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{s.v}</p>
                </div>
              ))}
            </div>
            {/* Recent Orders Snippet */}
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><div className="w-2 h-8 bg-rose-500 rounded-full"></div>Pesanan Masuk ({stats.pending})</h3>
            <div className="space-y-4">
              {activeTransactions.slice(0, 3).map(t => (
                <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${t.type === 'qris' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{t.type === 'qris' ? <Wifi size={24}/> : <Wallet size={24}/>}</div>
                        <div><h4 className="font-bold text-slate-800">{t.customer.name}</h4><p className="text-xs text-slate-500">{t.items.length} Barang • {formatCurrency(t.total)}</p></div>
                    </div>
                    <button onClick={() => setActiveTab('active')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">Lihat Detail</button>
                </div>
              ))}
              {stats.pending === 0 && <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200"><p className="text-slate-400 font-bold italic">Semua pesanan sudah diproses.</p></div>}
            </div>
          </div>
        )}

        {/* ACTIVE TRANSACTIONS */}
        {activeTab === 'active' && (
            <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div><h2 className="text-3xl font-black text-slate-800 mb-2">Antrian Pesanan</h2><p className="text-slate-500">Kelola pesanan masuk secara real-time.</p></div>
                    <div className="w-full md:w-auto min-w-[300px] relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-slate-400"/></div>
                        <input type="text" className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-2xl focus:ring-rose-500 focus:border-rose-500 block pl-10 p-3 shadow-sm font-bold" placeholder="Cari ID Pesanan / Nama..." value={activeSearch} onChange={(e) => setActiveSearch(e.target.value)} />
                        {activeSearch && <button onClick={() => setActiveSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {activeTransactions.length === 0 && (
                        <div className="col-span-full py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200"><ShoppingBag className="mx-auto h-16 w-16 text-slate-300 mb-4" /><h3 className="text-xl font-bold text-slate-400">Tidak ada pesanan aktif</h3></div>
                    )}
                    {activeTransactions.filter(t => t.id.toLowerCase().includes(activeSearch.toLowerCase()) || t.customer.name.toLowerCase().includes(activeSearch.toLowerCase())).map(t => (
                        <div key={t.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-rose-100 transition-all group">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${t.type === 'qris' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-amber-500 text-white shadow-lg shadow-amber-200'}`}>{t.type === 'qris' ? <Wifi size={24}/> : <Wallet size={24}/>}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1"><h3 className="font-black text-lg text-slate-800">{t.customer.name}</h3><span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">{t.id.slice(-6)}</span></div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Clock size={12}/> {getTimeAgo(t.timestamp)}<span>•</span><span className="uppercase text-slate-700 font-bold">{t.type}</span></div>
                                        <div className="text-[10px] text-slate-400 mt-1 select-all font-mono">{t.id}</div>
                                    </div>
                                </div>
                                <div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Tagihan</p><p className="text-2xl font-black text-rose-600">{formatCurrency(t.total)}</p></div>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kontak & Alamat</label>
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100"><p className="text-sm font-bold text-slate-700 leading-relaxed mb-2">{t.customer.address}</p><div className="flex gap-2"><button onClick={() => copyToClipboard(t.customer.address)} className="flex items-center gap-1 text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors"><Copy size={10}/> Salin</button>{t.customer.lat && <a href={`https://www.google.com/maps?q=${t.customer.lat},${t.customer.lng}`} target="_blank" className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors"><MapPin size={10}/> Maps</a>}</div></div>
                                        </div>
                                    </div>
                                    <a href={`https://wa.me/${t.customer.wa.replace(/\D/g,'')}?text=Halo%20${encodeURIComponent(t.customer.name)},%20pesanan%20Yakult%20anda%20sedang%20kami%20proses.%20Mohon%20ditunggu.`} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-xs hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100"><MessageCircle size={16}/> Chat WhatsApp</a>
                                </div>
                                <div className="flex flex-col h-full">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Rincian Pesanan</label>
                                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-4 overflow-y-auto max-h-[120px] custom-scrollbar">
                                        {t.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"><div className="flex items-center gap-2"><div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">{item.qty}x</div><span className="text-xs font-medium text-slate-700">{item.name}</span></div><span className="text-xs font-bold text-slate-500">{formatCurrency(item.price * item.qty)}</span></div>
                                        ))}
                                    </div>
                                    {t.type === 'qris' && <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl mb-4"><span className="text-xs font-bold text-slate-500">Bukti Transfer</span>{t.proofUrl ? <button onClick={() => setProofModal(t.proofUrl!)} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><Eye size={14}/> Lihat Foto</button> : <span className="text-[10px] font-bold text-slate-400 italic">Belum diupload</span>}</div>}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
                                <button onClick={(e) => handleAction(e, t.id, 'rejected')} className="py-3 bg-white border border-rose-200 text-rose-500 rounded-2xl font-black text-sm hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"><X size={18}/> TOLAK</button>
                                <button onClick={(e) => handleAction(e, t.id, 'confirmed')} className="py-3 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"><Check size={18}/> TERIMA & PROSES</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- TAB KONTEN WEBSITE (NEW) --- */}
        {activeTab === 'content' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-slate-800">Konten Website</h2>
                    <div className="bg-white p-1 rounded-2xl border border-slate-200 flex">
                        {['testimoni', 'gallery', 'faq', 'info'].map((tab) => (
                            <button 
                                key={tab} 
                                onClick={() => setContentSubTab(tab as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase ${contentSubTab === tab ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub-tab: Testimonials */}
                {contentSubTab === 'testimoni' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-[32px] flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-indigo-900 text-lg">Rating Toko Saat Ini</h3>
                                <p className="text-indigo-600 text-sm">Dihitung otomatis dari rata-rata testimoni.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm">
                                <Star className="fill-amber-400 text-amber-400" size={24} />
                                <span className="text-2xl font-black text-slate-800">{content.shopRating}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card Tambah */}
                            <button onClick={() => { setTestiForm({rating: 5}); setShowTestiModal(true); }} className="h-40 border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center text-slate-400 hover:border-rose-500 hover:text-rose-500 transition-all gap-2 group">
                                <PlusCircle size={32} className="group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-sm">Tambah Testimoni</span>
                            </button>

                            {testimonials.map(t => (
                                <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-start gap-4 group hover:border-rose-100 transition-colors">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                        {t.img ? <img src={t.img} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xl">{t.name[0]}</div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{t.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{t.role}</p>
                                            </div>
                                            <div className="flex gap-0.5"><Star size={12} className="fill-amber-400 text-amber-400"/><span className="text-xs font-black ml-1">{t.rating}</span></div>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-2 italic line-clamp-2">"{t.text}"</p>
                                        <div className="flex justify-between items-center mt-3">
                                            {t.email && <span className="text-[10px] text-slate-400">{t.email}</span>}
                                            <button onClick={() => handleDeleteTesti(t.id)} className="text-[10px] text-rose-500 font-bold hover:underline">Hapus</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sub-tab: Gallery */}
                {contentSubTab === 'gallery' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <button onClick={() => setShowGalleryModal(true)} className="aspect-square border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center text-slate-400 hover:border-rose-500 hover:text-rose-500 transition-all gap-2">
                            <ImgIcon size={32} />
                            <span className="font-bold text-xs">Upload Foto</span>
                        </button>
                        {gallery.map(g => (
                            <div key={g.id} className="relative aspect-square rounded-[32px] overflow-hidden group">
                                <img src={g.img} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center">
                                    <p className="text-xs font-bold mb-2">{g.title}</p>
                                    <button onClick={() => handleDeleteGallery(g.id)} className="bg-rose-600 p-2 rounded-full hover:bg-rose-700"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sub-tab: FAQ */}
                {contentSubTab === 'faq' && (
                    <div className="space-y-4">
                        <button onClick={() => setShowFaqModal(true)} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[24px] font-bold text-slate-400 hover:border-rose-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2">
                            <Plus size={20}/> Tambah Pertanyaan
                        </button>
                        {faqs.map(f => (
                            <div key={f.id} className="bg-white p-5 rounded-[24px] border border-slate-100 hover:shadow-md transition-all flex justify-between items-start gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">Q: {f.question}</h4>
                                    <p className="text-sm text-slate-500">A: {f.answer}</p>
                                </div>
                                <button onClick={() => handleDeleteFaq(f.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sub-tab: Info */}
                {contentSubTab === 'info' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-slate-500">Info ini muncul di halaman depan (Pengiriman, Why Us, dll).</p>
                            <button onClick={() => setShowInfoModal(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Tambah Info</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {infos.map(i => (
                                <div key={i.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <Info size={24}/>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800">{i.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{i.content}</p>
                                    </div>
                                    <button onClick={() => handleDeleteInfo(i.id)} className="text-slate-300 hover:text-rose-500 self-start"><X size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'products' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-slate-800">Manajemen Produk</h2><button onClick={() => openProductModal()} className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 flex items-center gap-2 hover:bg-rose-700 transition-colors"><PlusCircle size={20}/> Tambah</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex gap-4 items-center">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50">{p.img ? <img src={p.img} alt={p.name} className="w-full h-full object-cover"/> : <ImageIcon className="w-full h-full p-6 text-slate-300"/>}</div>
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-slate-800 truncate">{p.name}</h4><p className="text-xs text-rose-500 font-black">{formatCurrency(p.price)}</p><span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block font-bold ${p.qrisUrl ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{p.qrisUrl ? 'Ada QRIS Khusus' : 'QRIS Default'}</span></div>
                            <div className="flex flex-col gap-2"><button onClick={() => openProductModal(p)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600"><Edit size={16}/></button><button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button></div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
                <h2 className="text-3xl font-black text-slate-800 mb-8">Pengaturan Toko</h2>
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                    <div><label className="text-xs font-bold text-slate-400 ml-4 mb-2 block uppercase">Nama Toko</label><input type="text" value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:border-rose-500 outline-none transition-colors" /></div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 ml-4 mb-2 block uppercase">Nomor WhatsApp Admin</label>
                        <div className="flex items-center bg-slate-50 rounded-2xl border border-transparent focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200 transition-all relative">
                          <button onClick={() => setIsCountryPickerOpen(true)} className="flex items-center gap-2 pl-4 pr-3 py-4 font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 rounded-l-2xl transition-colors"><span className="text-xl">{waCountry.flag}</span><span className="text-sm">{waCountry.code}</span><ChevronDown size={14} className="text-slate-400"/></button>
                          <div className="w-px h-6 bg-slate-300 mx-1"></div>
                          <input type="tel" placeholder="812..." value={waNumber} onChange={handleWaNumberChange} className="flex-1 bg-transparent border-none p-4 font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400" />
                          {isCountryPickerOpen && (<div className="absolute top-full left-0 mt-2 w-full sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-left max-h-[300px] flex flex-col"><div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10"><div className="bg-slate-50 rounded-xl flex items-center px-3 py-2 border border-slate-200 focus-within:border-rose-500 transition-colors"><Search size={14} className="text-slate-400 mr-2"/><input autoFocus type="text" placeholder="Cari negara..." className="bg-transparent text-xs font-bold outline-none w-full text-slate-700" value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} /></div></div><div className="overflow-y-auto flex-1 custom-scrollbar p-1">{filteredCountries.length > 0 ? (filteredCountries.map((c) => (<button key={c.code + c.name} onClick={() => selectCountry(c)} className="w-full text-left flex items-center gap-3 p-2.5 hover:bg-rose-50 rounded-xl transition-colors group"><span className="text-xl">{c.flag}</span><div className="flex-1"><p className="text-xs font-bold text-slate-700 group-hover:text-rose-600">{c.name}</p><p className="text-[10px] text-slate-400 font-medium">{c.code}</p></div>{waCountry.code === c.code && <Check size={14} className="text-rose-500"/>}</button>))) : (<div className="p-4 text-center text-xs text-slate-400 font-medium">Negara tidak ditemukan.</div>)}</div></div>)}
                          {isCountryPickerOpen && (<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsCountryPickerOpen(false)}></div>)}
                      </div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-400 ml-4 mb-2 block uppercase">Durasi Timer QRIS (Menit)</label><input type="number" min="1" max="60" value={settingsForm.qrisTimerMinutes} onChange={e => setSettingsForm({...settingsForm, qrisTimerMinutes: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-800 focus:border-rose-500 outline-none transition-colors" /></div>
                    
                    {/* RESTORED: QRIS UPLOAD SECTION */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 ml-4 mb-2 block uppercase">Upload Gambar QRIS Default</label>
                        <div className="flex gap-2 mb-2 items-center">
                             <div className="flex-1">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                    <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                        <UploadCloud size={24} className="text-slate-400 group-hover:text-slate-600 mb-1"/>
                                        <p className="text-xs text-slate-500"><span className="font-bold">Klik Upload</span> QRIS Utama</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleQrisUpload} />
                                </label>
                             </div>
                        </div>
                        <div className="mt-4 ml-4 flex items-start gap-4">
                            <div>
                                <p className="text-[10px] text-slate-400 mb-2 uppercase font-bold">Preview Tampilan:</p>
                                <div className="w-32 h-32 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                                    {settingsForm.qrisImageUrl ? <img src={settingsForm.qrisImageUrl} className="w-full h-full object-contain" /> : <div className="flex flex-col items-center text-slate-300"><ImageIcon size={24}/><span className="text-[10px] mt-1">Kosong</span></div>}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 max-w-xs pt-6 leading-relaxed">
                                <p>QRIS ini akan digunakan secara otomatis jika user membeli lebih dari 1 produk, atau jika produk yang dibeli tidak memiliki QRIS khusus.</p>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSaveSettings} disabled={isGlobalLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">{isGlobalLoading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> SIMPAN PENGATURAN</>}</button>
                </div>
            </div>
        )}

        {(activeTab === 'history' || activeTab === 'losses') && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                <h2 className="text-3xl font-black text-slate-800 mb-8">{activeTab === 'history' ? 'Riwayat Transaksi' : 'Laporan Kerugian'}</h2>
                 <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                    {activeTab === 'history' ? (
                       <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50"><tr><th className="p-6 text-xs font-black text-slate-400 uppercase">Data</th><th className="p-6 text-xs font-black text-slate-400 uppercase">Status</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {historyTransactions.map(t => (
                            <tr key={t.id} className="group">
                                <td className="p-6"><p className="font-bold">{t.customer.name}</p><p className="text-xs text-slate-400">{formatCurrency(t.total)}</p></td>
                                <td className="p-6 flex items-center gap-2"><span className={`px-3 py-1 rounded-full text-xs font-bold ${t.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : t.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-600'}`}>{t.status}</span><div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"><button onClick={(e) => handleAction(e, t.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white"><Check size={14}/></button><button onClick={(e) => handleAction(e, t.id, 'rejected')} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white"><X size={14}/></button></div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                       <div className="p-8 grid gap-4">{losses.map(l => (<div key={l.id} className="flex justify-between border-b pb-4"><span className="font-bold">{l.description}</span><span className="text-rose-500 font-bold">{formatCurrency(l.amount)}</span></div>))}{losses.length === 0 && <p className="text-center text-slate-400 italic">Data kosong.</p>}</div>
                    )}
                </div>
            </div>
        )}
      </div>
      
      {/* MODALS: Product, Loss, Proof (Existing) */}
      {showProductModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[48px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-2xl font-black text-slate-800 mb-6">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Nama Produk" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none"/>
                    <input type="number" placeholder="Harga" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none"/>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-2 block">Gambar Produk</label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 h-14 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 cursor-pointer hover:bg-slate-100">
                                {isUploadingProductImg ? <Loader2 className="animate-spin"/> : <><UploadCloud size={16} className="mr-2"/> Upload Gambar</>}
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleProductImageUpload(e, 'img')} disabled={isUploadingProductImg} />
                            </label>
                            {productForm.img && <img src={productForm.img} className="w-14 h-14 rounded-xl object-cover border border-slate-100" />}
                        </div>
                    </div>
                    <div>
                         <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 ml-2 block">QRIS Khusus (Opsional)</label>
                         <div className="flex items-center gap-4">
                            <label className="flex-1 h-14 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400 cursor-pointer hover:bg-slate-100">
                                {isUploadingProductImg ? <Loader2 className="animate-spin"/> : <><QrCode size={16} className="mr-2"/> Upload QRIS</>}
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleProductImageUpload(e, 'qrisUrl')} disabled={isUploadingProductImg} />
                            </label>
                            {productForm.qrisUrl && <img src={productForm.qrisUrl} className="w-14 h-14 rounded-xl object-contain border border-slate-100 p-1" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 ml-2 leading-tight">Jika user hanya membeli produk ini, QRIS ini yang akan muncul.</p>
                    </div>
                    <textarea placeholder="Deskripsi Singkat" value={productForm.desc} onChange={e => setProductForm({...productForm, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm outline-none"/>
                    <div className="flex gap-2 mt-4"><button onClick={handleSaveProduct} disabled={isGlobalLoading || isUploadingProductImg} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black flex items-center justify-center">{isGlobalLoading ? <Loader2 className="animate-spin" size={20}/> : 'SIMPAN'}</button><button onClick={() => setShowProductModal(false)} disabled={isGlobalLoading} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">Batal</button></div>
                </div>
            </div>
          </div>
      )}
      
      {/* Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setProofModal(null)}>
          <div className="max-w-2xl w-full bg-white rounded-[48px] overflow-hidden shadow-2xl">
            <div className="p-6 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">Bukti Pembayaran</h3>
              <button onClick={() => setProofModal(null)} className="p-2 bg-white rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-8 flex justify-center bg-slate-100">
              <img src={proofModal} alt="Bukti" className="max-h-[70vh] rounded-3xl shadow-xl" />
            </div>
          </div>
        </div>
      )}
      
      {/* LOSS MODAL */}
      {showLossModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <h3 className="text-2xl font-black text-slate-800 mb-6">Input Kerugian</h3>
            <div className="space-y-4">
              <input type="number" placeholder="Nominal" value={lossForm.amt} onChange={e => setLossForm({...lossForm, amt: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" />
              <input type="text" placeholder="Keterangan" value={lossForm.desc} onChange={e => setLossForm({...lossForm, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" />
              <button onClick={handleAddLoss} disabled={isGlobalLoading} className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black shadow-xl mt-4 flex items-center justify-center">
                {isGlobalLoading ? <Loader2 className="animate-spin" size={20}/> : 'SIMPAN'}
              </button>
              <button onClick={() => setShowLossModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CONTENT MODALS */}
      {showTestiModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black mb-4">Edit Testimoni</h3>
                  <div className="space-y-3">
                      <input type="text" placeholder="Nama" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={testiForm.name || ''} onChange={e => setTestiForm({...testiForm, name: e.target.value})} />
                      <input type="text" placeholder="Role (e.g. Pelanggan)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={testiForm.role || ''} onChange={e => setTestiForm({...testiForm, role: e.target.value})} />
                      <input type="email" placeholder="Email (Opsional)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={testiForm.email || ''} onChange={e => setTestiForm({...testiForm, email: e.target.value})} />
                      <input type="tel" placeholder="No HP (Opsional)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={testiForm.phone || ''} onChange={e => setTestiForm({...testiForm, phone: e.target.value})} />
                      
                      <textarea placeholder="Ulasan" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-24" value={testiForm.text || ''} onChange={e => setTestiForm({...testiForm, text: e.target.value})} />
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-500">Rating:</span>
                          {[1,2,3,4,5].map(r => (
                              <button key={r} onClick={() => setTestiForm({...testiForm, rating: r})} className={`p-1 ${testiForm.rating && testiForm.rating >= r ? 'text-amber-400' : 'text-slate-300'}`}><Star fill="currentColor" size={24}/></button>
                          ))}
                      </div>
                      <input type="file" onChange={handleTestiImage} className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-100 file:text-slate-700 font-bold"/>
                      <button onClick={handleSaveTesti} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold mt-2">Simpan</button>
                      <button onClick={() => setShowTestiModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button>
                  </div>
              </div>
          </div>
      )}

      {showGalleryModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black mb-4">Upload Dokumentasi</h3>
                  <div className="space-y-4">
                      <input type="text" placeholder="Judul Foto" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={galleryForm.title} onChange={e => setGalleryForm({...galleryForm, title: e.target.value})} />
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50">
                          {galleryForm.img ? <img src={galleryForm.img} className="h-full object-contain"/> : <div className="text-center text-slate-400"><UploadCloud className="mx-auto mb-2"/><span className="text-xs font-bold">Klik Upload</span></div>}
                          <input type="file" className="hidden" onChange={handleGalleryImage} />
                      </label>
                      <button onClick={handleSaveGallery} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button>
                      <button onClick={() => setShowGalleryModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button>
                  </div>
              </div>
          </div>
      )}

      {showFaqModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black mb-4">Edit FAQ</h3>
                  <div className="space-y-3">
                      <input type="text" placeholder="Pertanyaan (Q)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={faqForm.q} onChange={e => setFaqForm({...faqForm, q: e.target.value})} />
                      <textarea placeholder="Jawaban (A)" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-32" value={faqForm.a} onChange={e => setFaqForm({...faqForm, a: e.target.value})} />
                      <button onClick={handleSaveFaq} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button>
                      <button onClick={() => setShowFaqModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button>
                  </div>
              </div>
          </div>
      )}

      {showInfoModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black mb-4">Edit Info Section</h3>
                  <div className="space-y-3">
                      <input type="text" placeholder="Judul Info (e.g. Pengiriman)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={infoForm.title || ''} onChange={e => setInfoForm({...infoForm, title: e.target.value})} />
                      <textarea placeholder="Konten Info" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-24" value={infoForm.content || ''} onChange={e => setInfoForm({...infoForm, content: e.target.value})} />
                      <button onClick={handleSaveInfo} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button>
                      <button onClick={() => setShowInfoModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
