import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, History, TrendingDown, 
  Wallet, Check, X, Eye, 
  MapPin, MessageCircle, Menu, Search, Download, Wifi, Package, Loader2,
  Settings, Save, PlusCircle, Edit, Database, Clock, Server, Copy, AlertCircle, UploadCloud, Image as ImageIcon, QrCode, ChevronDown, CheckCircle, XCircle,
  Store, Trash2, BookOpen, Star, HelpCircle, Info, Image as ImgIcon, Plus, ChevronUp, MoreHorizontal, FileCode2, LogOut, ArrowLeft, ShieldCheck, Brain, Sparkles
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
  
  // Refs
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

  // Sync state with props
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
             // Cek apakah sesi masih valid
             if (u === ADMIN_CREDENTIALS.user && new Date().getTime() < expire) {
               setIsAuthenticated(true);
             } else {
               // Sesi habis
               localStorage.removeItem('yakult_admin_auth');
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
            // FITUR: KLIK UNTUK TIDAK LOGIN KEMBALI
            // Jika Remember Me dicentang, sesi berlaku 30 hari. Jika tidak, 1 hari (agar tidak annoying saat kerja).
            const expire = new Date().getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
            localStorage.setItem('yakult_admin_auth', JSON.stringify({ user, expire }));
        } else {
            setLoginError("Username atau Password Salah!");
        }
        setIsLoggingIn(false);
    }, 800);
  };

  const handleLogout = () => {
      if(confirm("Yakin ingin keluar?")) {
          setIsAuthenticated(false);
          localStorage.removeItem('yakult_admin_auth');
          setUser('');
          setPass('');
      }
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
      showToast('Produk berhasil disimpan!', 'success');
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
      setSettingsForm((prev: StoreSettings) => ({ ...prev, whatsapp: `${cleanPrefix}${val}` }));
  };

  const selectCountry = (c: typeof COUNTRY_CODES[0]) => {
      setWaCountry(c);
      setIsCountryPickerOpen(false);
      setSearchCountry('');
      const cleanPrefix = c.code.replace('+', '');
      setSettingsForm((prev: StoreSettings) => ({ ...prev, whatsapp: `${cleanPrefix}${waNumber}` }));
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
      showToast('Kerugian dicatat.', 'success');
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
      showToast('Testimoni tersimpan.', 'success');
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
      showToast('Foto ditambahkan.', 'success');
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
      showToast('FAQ ditambahkan.', 'success');
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
      showToast('Info section update.', 'success');
  };

  const handleDeleteInfo = (id: string) => {
      saveContent({ ...content, infos: infos.filter(i => i.id !== id) });
  };

  // --- DOWNLOAD SOURCE CODE (ZIP) ---
  const handleDownloadSource = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
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

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1621236300238-293838275919?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 blur-sm"></div>
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-8 text-center shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-600 shadow-lg shadow-rose-600/40 text-white">
                <ShieldCheck size={40} />
            </div>
            <h1 className="text-3xl font-black mb-2 text-white">Admin Portal</h1>
            <p className="text-slate-300 mb-8 text-sm">Masuk untuk mengelola toko Anda</p>
            {loginError && <div className="bg-rose-500/20 text-rose-300 p-3 rounded-2xl mb-4 text-xs font-bold border border-rose-500/50">{loginError}</div>}
            <input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 text-white p-4 rounded-2xl mb-3 outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500 font-medium" placeholder="Username" />
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 text-white p-4 rounded-2xl mb-4 outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500 font-medium" placeholder="Password" />
            
            {/* FITUR: KLIK UNTUK TIDAK LOGIN KEMBALI */}
            <div className="flex items-center gap-2 mb-6 ml-1">
                <input type="checkbox" id="rem" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/10 text-rose-600 focus:ring-rose-500 accent-rose-600" />
                <label htmlFor="rem" className="text-sm text-slate-300 cursor-pointer">Ingat Saya (Tidak Login Kembali)</label>
            </div>

            <button onClick={handleLogin} disabled={isLoggingIn} className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-2xl font-bold shadow-xl shadow-rose-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {isLoggingIn ? <Loader2 className="animate-spin mx-auto" /> : 'MASUK SEKARANG'}
            </button>
            <button onClick={() => navigate('/')} className="mt-6 text-slate-400 text-xs font-bold hover:text-white flex items-center justify-center gap-1 mx-auto"><ArrowLeft size={12}/> KEMBALI KE TOKO</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Toast */}
      {toast && (<div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{toast.type === 'success' ? <Check size={18}/> : <X size={18}/>} {toast.msg}</div>)}
      
      {/* Proof Modal (Zoom) */}
      {proofModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setProofModal(null)}>
            <div className="relative max-w-2xl w-full">
                <button onClick={() => setProofModal(null)} className="absolute -top-12 right-0 text-white p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                <img src={proofModal} alt="Bukti" className="w-full h-auto rounded-xl shadow-2xl" />
            </div>
        </div>
      )}

      {/* Mobile Menu */}
      <div className="md:hidden fixed top-4 right-4 z-[60]"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-slate-900 text-white rounded-full shadow-lg"><Menu size={24}/></button></div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl md:shadow-none`}>
        <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-black text-lg">Y</div>
            <div>
                <h1 className="text-xl font-black text-white leading-none">ADMIN</h1>
                <p className="text-[10px] text-slate-400 font-medium">Yakult Shop Pro</p>
            </div>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dash', label: 'Dashboard', icon: LayoutDashboard }, 
            { id: 'active', label: 'Pesanan', icon: ShoppingBag, badge: stats.pending }, 
            { id: 'products', label: 'Produk', icon: Package },
            { id: 'ai', label: 'AI Consultant', icon: Brain },
            { id: 'content', label: 'Konten CMS', icon: BookOpen }, 
            { id: 'settings', label: 'Pengaturan', icon: Settings }, 
            { id: 'history', label: 'Riwayat', icon: History }, 
            { id: 'losses', label: 'Kerugian', icon: TrendingDown }
            ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all border border-transparent ${activeTab === item.id ? 'bg-white/10 text-white border-white/5 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-3"><item.icon size={18} className={activeTab === item.id ? 'text-rose-400' : ''}/> {item.label}</div>{item.badge ? <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-lg shadow-rose-500/50">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        
        {/* Sidebar Footer Actions */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <button onClick={() => navigate('/')} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">BUKA TOKO</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowLossModal(true)} className="w-full py-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl font-bold text-xs hover:bg-amber-500 hover:text-white transition-all">Input Rugi</button>
            <button onClick={generatePDF} className="w-full py-3 bg-white/5 border border-white/10 text-slate-300 rounded-2xl font-bold text-xs hover:bg-white hover:text-slate-900 transition-all">Cetak PDF</button>
          </div>
          <button onClick={handleDownloadSource} disabled={isZipping} className="w-full py-3 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-2xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2">
            {isZipping ? <Loader2 size={16} className="animate-spin"/> : <><FileCode2 size={16}/> DOWNLOAD CODE</>}
          </button>
          <button onClick={handleClearData} disabled={isGlobalLoading} className="w-full py-3 border border-rose-500/20 text-rose-500/50 rounded-2xl font-bold text-xs hover:bg-rose-500 hover:text-white transition-all">RESET DATA</button>
          <button onClick={handleLogout} className="w-full py-3 text-slate-500 rounded-2xl font-bold text-xs hover:text-white flex items-center justify-center gap-2"><LogOut size={14}/> LOGOUT</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        {activeTab === 'dash' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
              { l: 'Pendapatan', v: formatCurrency(stats.revenue), i: ShoppingBag, c: 'rose' },
              { l: 'Bersih', v: formatCurrency(stats.net), i: Check, c: 'emerald' },
              { l: 'Transaksi', v: stats.txCount + ' Order', i: History, c: 'blue' },
              { l: 'Kerugian', v: formatCurrency(stats.loss), i: TrendingDown, c: 'amber' },
            ].map((s: { l: string, v: string, i: any, c: string }, i: number) => (
              <div key={i} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 bg-${s.c}-50 text-${s.c}-500`}>
                    <s.i size={20} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{s.l}</p>
                <p className="text-2xl font-black text-slate-800">{s.v}</p>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'active' && (
            <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-800 mb-4">Pesanan Masuk</h2>
                {activeTransactions.length === 0 ? <div className="text-center py-20 text-slate-400">Belum ada pesanan aktif.</div> : activeTransactions.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-6 animate-in slide-in-from-bottom-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">{t.id}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${t.type === 'qris' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{t.type}</span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">{t.customer.name}</h3>
                            <p className="text-sm text-slate-500 mb-3">{t.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
                            
                            {/* ALAMAT & SHARELOC */}
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
                                <div className="flex items-start gap-2">
                                    <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0"/>
                                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{t.customer.address}</p>
                                </div>
                                {t.customer.lat && (
                                    <a href={`https://www.google.com/maps?q=${t.customer.lat},${t.customer.lng}`} target="_blank" className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100">
                                        <MapPin size={12}/> Buka Google Maps (Shareloc)
                                    </a>
                                )}
                            </div>

                            <div className="flex gap-2 text-xs font-bold text-slate-400 mb-2">
                                <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                                <span>•</span>
                                <a href={`https://wa.me/${t.customer.wa.replace(/\D/g,'')}`} target="_blank" className="text-emerald-500 hover:underline flex items-center gap-1"><MessageCircle size={12}/> Chat WA</a>
                            </div>

                            {/* BUKTI PEMBAYARAN */}
                            {t.proofUrl && (
                                <div className="mt-3">
                                    <p className="text-xs font-bold text-slate-400 mb-2">Bukti Transfer:</p>
                                    <div className="relative group w-fit cursor-pointer" onClick={() => setProofModal(t.proofUrl!)}>
                                        <img src={t.proofUrl} className="h-24 rounded-xl border border-slate-200 object-cover" />
                                        <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                                            <Eye size={16} className="mr-1"/> Lihat
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col justify-between items-end min-w-[140px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 mt-4 md:mt-0">
                            <span className="text-2xl font-black text-rose-600">{formatCurrency(t.total)}</span>
                            <div className="flex gap-2 w-full mt-auto">
                                <button onClick={(e) => handleAction(e, t.id, 'rejected')} className="flex-1 py-3 bg-white border border-rose-100 text-rose-500 rounded-2xl font-bold text-xs hover:bg-rose-50 flex items-center justify-center gap-1"><X size={14}/> Tolak</button>
                                <button onClick={(e) => handleAction(e, t.id, 'confirmed')} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs hover:bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center gap-1"><Check size={14}/> Proses</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
        {activeTab === 'products' && (<div><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-slate-800">Manajemen Produk</h2><button onClick={() => openProductModal()} className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-2"><Plus size={18}/> Tambah Produk</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{products.map(p => (<div key={p.id} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 group"><div className="relative h-40 mb-4 rounded-2xl overflow-hidden bg-slate-50"><img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/></div><div className="flex justify-between items-start mb-2"><div><p className="font-bold text-slate-800">{p.name}</p><p className="text-xs text-slate-400 line-clamp-1">{p.desc}</p></div><p className="text-rose-600 font-black">{formatCurrency(p.price)}</p></div><div className="flex gap-2 mt-4"><button onClick={() => openProductModal(p)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100">Edit</button><button onClick={() => handleDeleteProduct(p.id)} className="px-3 py-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100"><Trash2 size={16}/></button></div></div>))}</div></div>)}
        
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
        
        {activeTab === 'settings' && (<div className="max-w-2xl bg-white p-8 rounded-[32px] border border-slate-100"><h2 className="text-2xl font-black text-slate-800 mb-6">Pengaturan Toko</h2><div className="space-y-4"><div className="p-4 bg-slate-50 rounded-2xl"><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nama Toko</label><input value={settingsForm.storeName} onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})} className="w-full bg-white p-3 rounded-xl font-bold outline-none border border-slate-200 focus:border-rose-500 transition-colors" /></div><div className="p-4 bg-slate-50 rounded-2xl"><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">WhatsApp Admin</label><div className="flex gap-2"><button onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)} className="px-4 bg-white border border-slate-200 rounded-xl font-bold flex items-center gap-2">{waCountry.flag} {waCountry.code}</button><input value={waNumber} onChange={handleWaNumberChange} className="flex-1 bg-white p-3 rounded-xl font-bold outline-none border border-slate-200 focus:border-rose-500" placeholder="812xxx" /></div></div><div className="p-4 bg-slate-50 rounded-2xl"><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">QRIS Utama (Toko)</label><div className="flex items-center gap-4">{settingsForm.qrisImageUrl && <img src={settingsForm.qrisImageUrl} className="w-20 h-20 object-contain bg-white rounded-xl border border-slate-200" />}<input type="file" onChange={handleQrisUpload} className="text-sm font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-600 hover:file:bg-rose-100"/></div></div><button onClick={handleSaveSettings} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg">Simpan Perubahan</button></div></div>)}
        {activeTab === 'content' && (<div className="space-y-6"><div className="flex gap-2 overflow-x-auto pb-2"><button onClick={() => setContentSubTab('testimoni')} className={`px-6 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${contentSubTab === 'testimoni' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Testimoni</button><button onClick={() => setContentSubTab('gallery')} className={`px-6 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${contentSubTab === 'gallery' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Dokumentasi</button><button onClick={() => setContentSubTab('faq')} className={`px-6 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${contentSubTab === 'faq' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>FAQ</button><button onClick={() => setContentSubTab('info')} className={`px-6 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${contentSubTab === 'info' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Info Section</button></div>{contentSubTab === 'testimoni' && (<div><button onClick={() => setShowTestiModal(true)} className="mb-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-2"><Plus size={14}/> Tambah Testimoni</button><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{content.testimonials.map(t => (<div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-100"><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">{t.name[0]}</div><div><p className="font-bold text-sm">{t.name}</p><div className="flex"><Star size={10} className="fill-amber-400 text-amber-400"/><span className="text-[10px] ml-1">{t.rating}</span></div></div></div><button onClick={() => handleDeleteTesti(t.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button></div><p className="text-xs text-slate-500">{t.text}</p></div>))}</div></div>)}
        {contentSubTab === 'gallery' && (<div><button onClick={() => setShowGalleryModal(true)} className="mb-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-2"><Plus size={14}/> Upload Foto</button><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{content.gallery.map(g => (<div key={g.id} className="relative group rounded-2xl overflow-hidden bg-slate-100 aspect-square"><img src={g.img} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"><button onClick={() => handleDeleteGallery(g.id)} className="p-2 bg-white text-rose-500 rounded-full"><Trash2 size={16}/></button></div><div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-[10px] font-bold truncate">{g.title}</div></div>))}</div></div>)}
        {contentSubTab === 'faq' && (<div><button onClick={() => setShowFaqModal(true)} className="mb-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-2"><Plus size={14}/> Tambah FAQ</button><div className="space-y-2">{content.faqs.map(f => (<div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center group"><div><p className="font-bold text-sm text-slate-800">{f.question}</p><p className="text-xs text-slate-500">{f.answer}</p></div><button onClick={() => handleDeleteFaq(f.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>))}</div></div>)}
        {contentSubTab === 'info' && (<div><button onClick={() => setShowInfoModal(true)} className="mb-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-2"><Plus size={14}/> Edit Info</button><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{content.infos.map(i => (<div key={i.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4"><div className="p-3 bg-slate-50 rounded-xl text-slate-500"><Info size={20}/></div><div><h4 className="font-bold text-sm">{i.title}</h4><p className="text-xs text-slate-500 mb-2">{i.content}</p><button onClick={() => handleDeleteInfo(i.id)} className="text-[10px] text-rose-500 font-bold hover:underline">Hapus</button></div></div>))}</div></div>)}</div>)}
        {(activeTab === 'history' || activeTab === 'losses') && (<div className="bg-white p-6 rounded-[32px] border border-slate-100"><h2 className="text-xl font-black text-slate-800 mb-6">{activeTab === 'history' ? 'Riwayat Transaksi' : 'Catatan Kerugian'}</h2><div className="space-y-2">{activeTab === 'history' ? historyTransactions.map((t: Transaction) =>(<div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"><div className="flex items-center gap-3"> <div className={`w-2 h-2 rounded-full ${t.status === 'confirmed' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div><div><p className="font-bold text-sm text-slate-800">{t.customer.name}</p><p className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</p></div></div><span className="font-black text-slate-700 text-sm">{formatCurrency(t.total)}</span></div>)) : losses.map(l=>(<div key={l.id} className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl"><div className="flex items-center gap-3"><TrendingDown size={16} className="text-amber-500"/><div><p className="font-bold text-sm text-slate-800">{l.description}</p><p className="text-[10px] text-slate-400">{new Date(l.timestamp).toLocaleDateString()}</p></div></div><span className="font-black text-amber-600 text-sm">-{formatCurrency(l.amount)}</span></div>))}</div></div>)}
      </div>

      {showProductModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[48px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar"><h3 className="text-2xl font-black text-slate-800 mb-6">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3><div className="space-y-4"><input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl font-bold" placeholder="Nama Produk" /><input value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl font-bold" placeholder="Harga (Rp)" /><textarea value={productForm.desc} onChange={e => setProductForm({...productForm, desc: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl font-medium min-h-[100px]" placeholder="Deskripsi Singkat" /><div className="p-4 bg-slate-50 rounded-2xl mb-4"><label className="text-xs font-bold text-slate-400 uppercase block mb-2">Gambar Produk</label><input type="file" onChange={e => handleProductImageUpload(e, 'img')} className="w-full text-sm font-bold text-slate-500"/></div><div className="p-4 bg-slate-50 rounded-2xl mb-6"><label className="text-xs font-bold text-slate-400 uppercase block mb-2">QRIS Khusus (Opsional)</label><input type="file" onChange={e => handleProductImageUpload(e, 'qrisUrl')} className="w-full text-sm font-bold text-slate-500"/><p className="text-[10px] text-slate-400 mt-2 italic">Upload jika produk ini menggunakan QRIS berbeda dari toko.</p></div><button onClick={handleSaveProduct} disabled={isUploadingProductImg} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200">Simpan Produk</button><button onClick={() => setShowProductModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showTestiModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Edit Testimoni</h3><div className="space-y-3"><input value={testiForm.name || ''} onChange={e => setTestiForm({...testiForm, name: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Nama" /><textarea value={testiForm.text || ''} onChange={e => setTestiForm({...testiForm, text: e.target.value})} className="w-full mb-4 p-4 bg-slate-50 rounded-2xl" placeholder="Ulasan" /><button onClick={handleSaveTesti} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Simpan</button><button onClick={() => setShowTestiModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showLossModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500"><h3 className="text-2xl font-black text-slate-800 mb-6">Input Kerugian</h3><div className="space-y-4"><input type="number" placeholder="Nominal" value={lossForm.amt} onChange={e => setLossForm({...lossForm, amt: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" /><input type="text" placeholder="Keterangan" value={lossForm.desc} onChange={e => setLossForm({...lossForm, desc: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-medium" /><button onClick={handleAddLoss} disabled={isGlobalLoading} className="w-full py-5 bg-amber-500 text-white rounded-3xl font-black shadow-xl mt-4 flex items-center justify-center">{isGlobalLoading ? <Loader2 className="animate-spin" size={20}/> : 'SIMPAN'}</button><button onClick={() => setShowLossModal(false)} className="w-full py-4 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showGalleryModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Upload Dokumentasi</h3><div className="space-y-4"><input type="text" placeholder="Judul Foto" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={galleryForm.title} onChange={e => setGalleryForm({...galleryForm, title: e.target.value})} /><label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50">{galleryForm.img ? <img src={galleryForm.img} className="h-full object-contain"/> : <div className="text-center text-slate-400"><UploadCloud className="mx-auto mb-2"/><span className="text-xs font-bold">Klik Upload</span></div>}<input type="file" className="hidden" onChange={handleGalleryImage} /></label><button onClick={handleSaveGallery} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowGalleryModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showFaqModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Edit FAQ</h3><div className="space-y-3"><input type="text" placeholder="Pertanyaan (Q)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={faqForm.q} onChange={e => setFaqForm({...faqForm, q: e.target.value})} /><textarea placeholder="Jawaban (A)" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-32" value={faqForm.a} onChange={e => setFaqForm({...faqForm, a: e.target.value})} /><button onClick={handleSaveFaq} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowFaqModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
      {showInfoModal && (<div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-xl font-black mb-4">Edit Info Section</h3><div className="space-y-3"><input type="text" placeholder="Judul Info (e.g. Pengiriman)" className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none" value={infoForm.title || ''} onChange={e => setInfoForm({...infoForm, title: e.target.value})} /><textarea placeholder="Konten Info" className="w-full bg-slate-50 p-3 rounded-xl font-medium outline-none h-24" value={infoForm.content || ''} onChange={e => setInfoForm({...infoForm, content: e.target.value})} /><button onClick={handleSaveInfo} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Simpan</button><button onClick={() => setShowInfoModal(false)} className="w-full py-3 text-slate-400 font-bold">Batal</button></div></div></div>)}
    </div>
  );
};

export default AdminDashboard;