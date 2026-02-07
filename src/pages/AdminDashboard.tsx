import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, History, TrendingDown, 
  Wallet, Check, X, Eye, 
  MapPin, MessageCircle, Menu, Search, Download, Wifi, Package, Loader2,
  Settings, Save, PlusCircle, Edit, Database, Clock, Server, Copy, AlertCircle, UploadCloud, Image as ImageIcon, QrCode, ChevronDown, CheckCircle, XCircle,
  Store, Trash2, BookOpen, Star, HelpCircle, Info, Image as ImgIcon, Plus, ChevronUp, MoreHorizontal, FileCode2, Sparkles, Brain
} from 'lucide-react';
import { Transaction, LossRecord, Product, StoreSettings, StoreContent, Testimonial, GalleryItem, FaqItem, InfoSection } from '../types';
import { ADMIN_CREDENTIALS, COUNTRY_CODES } from '../constants';
import { formatCurrency, compressImage } from '../utils';
import JSZip from 'jszip';
import { PROJECT_FILES } from '../source_code_data';

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
  
  const [activeTab, setActiveTab] = useState<'dash' | 'active' | 'history' | 'losses' | 'products' | 'settings' | 'content' | 'ai'>('dash');
  const [contentSubTab, setContentSubTab] = useState<'testimoni' | 'gallery' | 'faq' | 'info'>('testimoni');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false); 
  const [isZipping, setIsZipping] = useState(false);
  
  // AI States
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
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

  const stats = useMemo(() => {
    const confirmed = historyTransactions.filter(t => t.status === 'confirmed');
    const revenue = confirmed.reduce((sum, t) => sum + (t.total - t.fee), 0);
    const fees = confirmed.reduce((sum, t) => sum + t.fee, 0);
    const totalItems = confirmed.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0);
    const totalLoss = losses.reduce((sum, l) => sum + l.amount, 0);
    
    return {
      revenue, fees, totalItems, loss: totalLoss,
      net: revenue + fees - totalLoss,
      pending: activeTransactions.length,
      txCount: confirmed.length
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

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- AI FUNCTION ---
  const handleAskAI = async () => {
      setIsAiThinking(true);
      setAiResponse('');
      
      const prompt = `
          Analisa data toko saya berikut ini dan berikan saran bisnis yang singkat, padat, dan memotivasi.
          
          DATA TOKO:
          - Nama: ${settings.storeName}
          - Total Pendapatan Bersih: ${formatCurrency(stats.net)}
          - Total Produk Terjual: ${stats.totalItems} unit
          - Jumlah Transaksi Sukses: ${stats.txCount}
          - Total Kerugian (Barang Rusak/Hilang): ${formatCurrency(stats.loss)}
          - Rating Toko: ${content.shopRating} / 5.0
          
          Berikan output dalam format Markdown yang rapi. Fokus pada:
          1. Evaluasi performa penjualan.
          2. Saran untuk meningkatkan rating (jika dibawah 5) atau mempertahankannya.
          3. Strategi mengurangi kerugian.
          4. Ide promosi kreatif untuk produk Yakult.
      `;

      try {
          // Call Vercel Serverless Function
          const res = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt })
          });
          
          const data = await res.json();
          
          if (res.ok && data.text) {
              setAiResponse(data.text);
          } else {
              setAiResponse("Maaf, fitur AI belum dikonfigurasi dengan benar di Vercel. Pastikan GEMINI_API_KEY sudah dimasukkan di Environment Variables.");
          }
      } catch (e) {
          setAiResponse("Gagal menghubungi server AI. Pastikan internet stabil.");
      } finally {
          setIsAiThinking(false);
      }
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

  const handleAddLoss = async () => {
      if(!lossForm.amt || !lossForm.desc) return alert('Data tidak lengkap!');
      setIsGlobalLoading(true);
      await new Promise(r => setTimeout(r, 800));
      addLoss({ id: `LOSS-${Date.now()}`, amount: Number(lossForm.amt), description: lossForm.desc, timestamp: Date.now() });
      setIsGlobalLoading(false);
      setShowLossModal(false); 
      setLossForm({ amt: '', desc: '' });
  };

  // --- CONTENT FUNCTIONS ---
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

  // --- DOWNLOAD SOURCE CODE (ZIP) ---
  const handleDownloadSource = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // Add files from the data mapping
      Object.entries(PROJECT_FILES).forEach(([filename, content]) => {
        zip.file(filename, content);
      });
      
      const blob = await zip.generateAsync({type:"blob"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yakult-shop-source-code.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Source Code berhasil didownload!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal membuat ZIP.', 'error');
    } finally {
      setIsZipping(false);
    }
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

  if (!isAuthenticated) return (<div className="min-h-screen bg-slate-950 flex items-center justify-center p-6"><div className="w-full max-w-md bg-white rounded-[40px] p-8 text-center"><h1 className="text-2xl font-black mb-4">Admin Login</h1><input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full bg-slate-100 p-4 rounded-xl mb-3" placeholder="Username" /><input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-slate-100 p-4 rounded-xl mb-4" placeholder="Password" /><button onClick={handleLogin} disabled={isLoggingIn} className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold">{isLoggingIn ? '...' : 'MASUK'}</button></div></div>);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      
      {/* Toast */}
      {toast && (<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl bg-slate-800 text-white font-bold">{toast.msg}</div>)}
      
      {/* Mobile Menu */}
      <div className="md:hidden fixed top-4 right-4 z-[60]"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-slate-900 text-white rounded-full"><Menu size={24}/></button></div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <h1 className="text-2xl font-black text-rose-500 mb-6 px-2">ADMIN</h1>
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dash', label: 'Dashboard', icon: LayoutDashboard }, 
            { id: 'active', label: 'Pesanan', icon: ShoppingBag, badge: stats.pending }, 
            { id: 'products', label: 'Produk', icon: Package },
            { id: 'ai', label: 'AI Consultant', icon: Brain }, // NEW TAB
            { id: 'content', label: 'Konten', icon: BookOpen }, 
            { id: 'settings', label: 'Pengaturan', icon: Settings }, 
            { id: 'history', label: 'Riwayat', icon: History }, 
            { id: 'losses', label: 'Kerugian', icon: TrendingDown }
            ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <div className="flex items-center gap-3"><item.icon size={18}/> {item.label}</div>{item.badge ? <span className="bg-white text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-black">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        
        {/* Sidebar Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <button onClick={() => navigate('/')} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm">BUKA TOKO</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowLossModal(true)} className="w-full py-3 border border-amber-500/30 text-amber-500 rounded-2xl font-bold text-xs">Rugi</button>
            <button onClick={generatePDF} className="w-full py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold text-xs">PDF</button>
          </div>
          <button onClick={handleDownloadSource} disabled={isZipping} className="w-full py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-2xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
            {isZipping ? <Loader2 size={16} className="animate-spin"/> : <><FileCode2 size={16}/> DOWNLOAD SOURCE</>}
          </button>
          <button onClick={handleClearData} disabled={isGlobalLoading} className="w-full py-3 border border-rose-500/20 text-rose-500/50 rounded-2xl font-bold text-xs">RESET</button>
          <button onClick={handleLogout} className="w-full py-3 bg-white/5 text-slate-500 rounded-2xl font-bold text-xs">LOGOUT</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        {activeTab === 'dash' && (<div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><div className="bg-white p-6 rounded-[32px] shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Pendapatan</p><p className="text-2xl font-black text-slate-800">{formatCurrency(stats.revenue)}</p></div><div className="bg-white p-6 rounded-[32px] shadow-sm"><p className="text-xs text-slate-400 font-bold uppercase">Bersih</p><p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.net)}</p></div></div>)}
        {activeTab === 'active' && (<div className="space-y-4">{activeTransactions.map(t => (<div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100"><div className="flex justify-between mb-2"><h3 className="font-bold">{t.customer.name}</h3><span className="text-rose-600 font-black">{formatCurrency(t.total)}</span></div><div className="flex gap-2"><button onClick={() => updateStatus(t.id, 'confirmed')} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm">Terima</button><button onClick={() => updateStatus(t.id, 'rejected')} className="flex-1 py-2 bg-rose-500 text-white rounded-xl font-bold text-sm">Tolak</button></div></div>))}</div>)}
        {activeTab === 'products' && (<div><button onClick={() => openProductModal()} className="mb-6 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold">+ Tambah</button><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{products.map(p => (<div key={p.id} className="bg-white p-4 rounded-[24px] shadow-sm"><p className="font-bold">{p.name}</p><p className="text-rose-600 font-bold">{formatCurrency(p.price)}</p><div className="mt-2 flex gap-2"><button onClick={() => openProductModal(p)} className="text-blue-500 font-bold text-xs">Edit</button><button onClick={() => handleDeleteProduct(p.id)} className="text-rose-500 font-bold text-xs">Hapus</button></div></div>))}</div></div>)}
        
        {/* AI CONSULTANT TAB */}
        {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-10 rounded-[40px] text-white mb-8 shadow-2xl shadow-indigo-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Brain size={32} /></div>
                        <h2 className="text-3xl font-black">AI Consultant</h2>
                    </div>
                    <p className="text-indigo-100 mb-8 max-w-lg leading-relaxed">Analisis performa toko Anda secara instan menggunakan kecerdasan buatan Google Gemini. Dapatkan saran strategi untuk meningkatkan penjualan.</p>
                    <button onClick={handleAskAI} disabled={isAiThinking} className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-3 active:scale-95">
                        {isAiThinking ? <Loader2 className="animate-spin"/> : <><Sparkles size={20}/> ANALISA TOKO SAYA</>}
                    </button>
                </div>

                {aiResponse && (
                    <div className="bg-white p-8 rounded-[40px] shadow-xl border border-indigo-50 animate-in slide-in-from-bottom-8 duration-700">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Sparkles className="text-amber-400" size={24}/> Hasil Analisis AI</h3>
                        <div className="prose prose-slate prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed text-sm bg-transparent border-none p-0">
                                {aiResponse}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {activeTab === 'settings' && (<div className="bg-white p-8 rounded-[32px]"><input value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold mb-4" /><input type="file" onChange={handleQrisUpload} className="mb-4"/><button onClick={handleSaveSettings} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Simpan</button></div>)}
        {activeTab === 'content' && (<div className="space-y-4"><div className="flex gap-2"><button onClick={() => setContentSubTab('testimoni')} className="px-4 py-2 bg-white rounded-xl font-bold text-xs">Testimoni</button></div>{contentSubTab === 'testimoni' && (<div><button onClick={() => setShowTestiModal(true)} className="mb-4 text-xs font-bold text-rose-500">+ Tambah</button>{content.testimonials.map(t => (<div key={t.id} className="bg-white p-4 rounded-2xl mb-2"><p className="font-bold">{t.name}</p><p className="text-xs text-slate-500">{t.text}</p></div>))}</div>)}</div>)}
        {(activeTab === 'history' || activeTab === 'losses') && (<div className="bg-white p-6 rounded-[32px]">{activeTab === 'history' ? historyTransactions.map(t=>(<div key={t.id} className="border-b py-2">{t.customer.name} - {t.status}</div>)) : losses.map(l=>(<div key={l.id}>{l.description}: {l.amount}</div>))}</div>)}
      </div>

      {showProductModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8"><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Nama" /><input value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Harga" /><input type="file" onChange={e => handleProductImageUpload(e, 'img')} className="mb-4"/><button onClick={handleSaveProduct} disabled={isUploadingProductImg} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold">Simpan</button><button onClick={() => setShowProductModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div>)}
      {showTestiModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8"><input value={testiForm.name || ''} onChange={e => setTestiForm({...testiForm, name: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Nama" /><textarea value={testiForm.text || ''} onChange={e => setTestiForm({...testiForm, text: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Ulasan" /><button onClick={handleSaveTesti} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Simpan</button><button onClick={() => setShowTestiModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div>)}
      {showLossModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500"><h3 className="text-2xl font-black text-slate-800 mb-6">Input Kerugian</h3><div className="space-y-4"><input type="number" placeholder="Nominal" value={lossForm.amt} onChange={e => setLossForm({...lossForm, amt: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" /><input type="text" placeholder="Keterangan" value={lossForm.desc} onChange={e => setLossForm({...lossForm, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" /><button onClick={handleAddLoss} disabled={isGlobalLoading} className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black shadow-xl mt-4 flex items-center justify-center">{isGlobalLoading ? <Loader2 className="animate-spin" size={20}/> : 'SIMPAN'}</button><button onClick={() => setShowLossModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showGalleryModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Upload Dokumentasi</h3><div className="space-y-4"><input type="text" placeholder="Judul Foto" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={galleryForm.title} onChange={e => setGalleryForm({...galleryForm, title: e.target.value})} /><label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50">{galleryForm.img ? <img src={galleryForm.img} className="h-full object-contain"/> : <div className="text-center text-slate-400"><UploadCloud className="mx-auto mb-2"/><span className="text-xs font-bold">Klik Upload</span></div>}<input type="file" className="hidden" onChange={handleGalleryImage} /></label><button onClick={handleSaveGallery} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowGalleryModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showFaqModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Edit FAQ</h3><div className="space-y-3"><input type="text" placeholder="Pertanyaan (Q)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={faqForm.q} onChange={e => setFaqForm({...faqForm, q: e.target.value})} /><textarea placeholder="Jawaban (A)" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-32" value={faqForm.a} onChange={e => setFaqForm({...faqForm, a: e.target.value})} /><button onClick={handleSaveFaq} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowFaqModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showInfoModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Edit Info Section</h3><div className="space-y-3"><input type="text" placeholder="Judul Info (e.g. Pengiriman)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={infoForm.title || ''} onChange={e => setInfoForm({...infoForm, title: e.target.value})} /><textarea placeholder="Konten Info" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-24" value={infoForm.content || ''} onChange={e => setInfoForm({...infoForm, content: e.target.value})} /><button onClick={handleSaveInfo} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowInfoModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
    </div>
  );
};

export default AdminDashboard;