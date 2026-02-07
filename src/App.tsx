import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Changed to BrowserRouter
import ShopPage from './pages/ShopPage';
import AdminDashboard from './pages/AdminDashboard';
import { Transaction, LossRecord, Product, StoreSettings, StoreContent, Testimonial } from './types';
import { PRODUCTS } from './constants';
import { getDB, saveDB } from './storage'; 

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

const App: React.FC = () => {
  // --- ATOMIC STATE ---
  const [storeData, setStoreData] = useState<{
      active: Transaction[];
      history: Transaction[];
      losses: LossRecord[];
      products: Product[];
      settings: StoreSettings;
      content: StoreContent; 
  }>({
      active: [],
      history: [],
      losses: [],
      products: PRODUCTS,
      settings: {
        storeName: 'TOKOTOPARYA', 
        whatsapp: '628123456789', 
        qrisImageUrl: '', 
        qrisTimerMinutes: 10
      },
      content: { testimonials: [], gallery: [], faqs: [], infos: [], shopRating: 5 }
  });

  // --- REFS ---
  const activeRef = useRef<Transaction[]>([]);
  const historyRef = useRef<Transaction[]>([]);
  const lossesRef = useRef<LossRecord[]>([]);
  const productsRef = useRef<Product[]>(PRODUCTS);
  const settingsRef = useRef<StoreSettings>(storeData.settings);
  const contentRef = useRef<StoreContent>(storeData.content);

  // --- HELPER: SAVE & SYNC ---
  const saveAndSync = (
    newActive: Transaction[] | null,
    newHistory: Transaction[] | null,
    newLosses: LossRecord[] | null,
    newProducts: Product[] | null,
    newSettings: StoreSettings | null,
    newContent: StoreContent | null
  ) => {
    const finalActive = newActive ?? activeRef.current;
    const finalHistory = newHistory ?? historyRef.current;
    const finalLosses = newLosses ?? lossesRef.current;
    const finalProducts = newProducts ?? productsRef.current;
    const finalSettings = newSettings ?? settingsRef.current;
    const finalContent = newContent ?? contentRef.current;

    saveDB({
        transactions: finalActive,
        history: finalHistory,
        losses: finalLosses,
        products: finalProducts,
        settings: finalSettings,
        content: finalContent
    });

    activeRef.current = finalActive;
    historyRef.current = finalHistory;
    lossesRef.current = finalLosses;
    productsRef.current = finalProducts;
    settingsRef.current = finalSettings;
    contentRef.current = finalContent;

    setStoreData({
        active: finalActive,
        history: finalHistory,
        losses: finalLosses,
        products: finalProducts,
        settings: finalSettings,
        content: finalContent
    });
  };

  const prevTxCountRef = useRef(0);

  // --- LOAD DATA ---
  const loadDataFromStorage = useCallback(() => {
    const localData = getDB();
    if (localData) {
        activeRef.current = localData.transactions || [];
        historyRef.current = localData.history || [];
        lossesRef.current = localData.losses || [];
        if (localData.products) productsRef.current = localData.products;
        if (localData.settings) settingsRef.current = localData.settings;
        if (localData.content) contentRef.current = localData.content;
        
        setStoreData({
            active: localData.transactions || [],
            history: localData.history || [],
            losses: localData.losses || [],
            products: localData.products || PRODUCTS,
            settings: localData.settings || storeData.settings,
            content: localData.content || storeData.content
        });
        
        const currentCount = localData.transactions?.length || 0;
        if (currentCount > prevTxCountRef.current) {
             notificationSound.currentTime = 0;
             notificationSound.play().catch(() => {});
        }
        prevTxCountRef.current = currentCount;
    }
  }, []);

  useEffect(() => { loadDataFromStorage(); }, [loadDataFromStorage]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'yakult_shop_db') loadDataFromStorage();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDataFromStorage]);


  // ============================================================
  // 🟢 LOGIKA PROSES DATA
  // ============================================================

  const addTransaction = (tx: Transaction) => {
      const newActive = [tx, ...activeRef.current];
      saveAndSync(newActive, null, null, null, null, null);
  };

  const updateTransactionStatus = (id: string, status: 'confirmed' | 'rejected' | 'cancelled') => {
      const currentActive = [...activeRef.current];
      const index = currentActive.findIndex(t => t.id === id);

      if (index !== -1) {
          const tx = currentActive[index];
          const updatedTx = { ...tx, status };
          currentActive.splice(index, 1);
          const currentHistory = [updatedTx, ...historyRef.current];
          saveAndSync(currentActive, currentHistory, null, null, null, null);
      } else {
          const currentHistory = [...historyRef.current];
          const hIndex = currentHistory.findIndex(t => t.id === id);
          if (hIndex !== -1) {
              currentHistory[hIndex] = { ...currentHistory[hIndex], status };
              saveAndSync(null, currentHistory, null, null, null, null);
          } else {
              loadDataFromStorage();
          }
      }
  };

  const cancelTransaction = (id: string) => {
      updateTransactionStatus(id, 'cancelled');
  };

  const setProof = (id: string, proofUrl: string) => {
      const newActive = activeRef.current.map(t => t.id === id ? { ...t, proofUrl } : t);
      const newHistory = historyRef.current.map(t => t.id === id ? { ...t, proofUrl } : t);
      saveAndSync(newActive, newHistory, null, null, null, null);
  };
  
  const addLoss = (loss: LossRecord) => {
      const newLosses = [loss, ...lossesRef.current];
      saveAndSync(null, null, newLosses, null, null, null);
  };
  
  const saveProductsFn = (newProducts: Product[]) => {
      saveAndSync(null, null, null, newProducts, null, null);
  };
  
  const saveSettingsFn = (newSettings: StoreSettings) => {
      saveAndSync(null, null, null, null, newSettings, null);
  };

  const saveContentFn = (newContent: StoreContent) => {
      saveAndSync(null, null, null, null, null, newContent);
  }

  // New function to handle user testimonial submission
  const handleAddTestimonial = (testi: Testimonial) => {
      const newTestimonials = [testi, ...contentRef.current.testimonials];
      
      // Calculate new average rating
      const totalRating = newTestimonials.reduce((sum, item) => sum + item.rating, 0);
      const newAverage = parseFloat((totalRating / newTestimonials.length).toFixed(1));

      const newContent: StoreContent = {
          ...contentRef.current,
          testimonials: newTestimonials,
          shopRating: newAverage
      };
      
      saveContentFn(newContent);
  };
  
  const clearAllData = () => {
      saveAndSync([], [], [], null, null, null);
  };

  if (!storeData.settings.storeName) return null; 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ShopPage 
            addTransaction={addTransaction} 
            cancelTransaction={cancelTransaction}
            allTransactions={[...storeData.active, ...storeData.history]} 
            updateProof={setProof}
            products={storeData.products}
            settings={storeData.settings}
            content={storeData.content} 
            onAddTestimonial={handleAddTestimonial} // Pass handler
          />
        } />
        <Route path="/admin" element={
          <AdminDashboard 
            activeTransactions={storeData.active}
            historyTransactions={storeData.history}
            losses={storeData.losses}
            products={storeData.products}
            settings={storeData.settings}
            content={storeData.content}
            updateStatus={updateTransactionStatus}
            addLoss={addLoss}
            saveProducts={saveProductsFn}
            saveSettings={saveSettingsFn}
            saveContent={saveContentFn}
            clearData={clearAllData}
          />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;