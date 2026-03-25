import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Part, Shop, PartRequest, RequestResponse, SavedPart } from '../types';
import { Search, MapPin, Phone, DollarSign, Package, Plus, X, Filter, Heart, Bell, Camera, Star, Car } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { useAuth } from '../AuthContext';
import { ProductListItem } from './ProductListItem';
import { ProductGridItem } from './ProductGridItem';
import { ProductDetailsModal } from './ProductDetailsModal';
import { ShopProfileModal } from './ShopProfileModal';
import { CAR_MAKES, CAR_MODELS, getYears, CAR_LOGOS } from '../utils/carData';
import { ARAB_COUNTRIES } from '../utils/countries';

export function CustomerDashboard() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [parts, setParts] = useState<(Part & { shop?: Shop })[]>([]);
  const [similarParts, setSimilarParts] = useState<(Part & { shop?: Shop })[]>([]);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  
  // Request Part State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedShopProfile, setSelectedShopProfile] = useState<Shop | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    partName: '',
    partNumber: '',
    carMake: '',
    carModel: '',
    year: ''
  });
  const [myRequests, setMyRequests] = useState<PartRequest[]>([]);
  const [myResponses, setMyResponses] = useState<RequestResponse[]>([]);
  
  // Image Modal State
  const [selectedImagePart, setSelectedImagePart] = useState<Part | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');
  const [filterCarMake, setFilterCarMake] = useState('');
  const [filterCarModel, setFilterCarModel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  // Wishlist State
  const [activeTab, setActiveTab] = useState<'search' | 'wishlist'>('search');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'wishlist') {
      setActiveTab('wishlist');
    } else {
      setActiveTab('search');
    }
  }, [location.search]);

  const [savedParts, setSavedParts] = useState<SavedPart[]>([]);
  const [wishlistParts, setWishlistParts] = useState<(Part & { shop?: Shop })[]>([]);

  useEffect(() => {
    // Fetch all shops to map shopId to shop details
    const fetchShops = async () => {
      try {
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        const shopsData: Record<string, Shop> = {};
        shopsSnapshot.forEach((doc) => {
          shopsData[doc.id] = { id: doc.id, ...doc.data() } as Shop;
        });
        setShops(shopsData);

        // Fetch initial parts
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const initialParts: (Part & { shop?: Shop })[] = [];
        partsSnapshot.forEach((doc) => {
          const partData = { id: doc.id, ...doc.data() } as Part;
          const shop = shopsData[partData.shopId];
          if (shop && (shop.status === 'approved' || !shop.status) && (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial')) {
            initialParts.push({
              ...partData,
              shop
            });
          }
        });
        // Sort parts: Pro shops first, then Basic, then Free
        initialParts.sort((a, b) => {
          const tierOrder = { pro: 3, basic: 2, free: 1 };
          const aTier = a.shop?.subscriptionTier || 'free';
          const bTier = b.shop?.subscriptionTier || 'free';
          return tierOrder[bTier as keyof typeof tierOrder] - tierOrder[aTier as keyof typeof tierOrder];
        });
        setParts(initialParts);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'shops');
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  useEffect(() => {
    if (!user) {
      setMyRequests([]);
      setMyResponses([]);
      return;
    }

    const requestsRef = collection(db, 'partRequests');
    const qRequests = query(requestsRef, where('customerUid', '==', user.uid));
    
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const requestsData: PartRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...doc.data() } as PartRequest);
      });
      // Sort by createdAt descending locally since we don't have a composite index yet
      requestsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyRequests(requestsData);

      // Fetch responses for these requests
      if (requestsData.length > 0) {
        const requestIds = requestsData.map(r => r.id);
        const responsesRef = collection(db, 'requestResponses');
        const qResponses = query(responsesRef, where('customerUid', '==', user.uid));
        
        onSnapshot(qResponses, (respSnapshot) => {
          const respData: RequestResponse[] = [];
          respSnapshot.forEach((doc) => {
            const data = { id: doc.id, ...doc.data() } as RequestResponse;
            if (requestIds.includes(data.requestId)) {
              respData.push(data);
            }
          });
          setMyResponses(respData);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'requestResponses');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'partRequests');
    });

    // Fetch Saved Parts
    const savedPartsRef = collection(db, 'savedParts');
    const qSavedParts = query(savedPartsRef, where('userId', '==', user.uid));
    const unsubscribeSavedParts = onSnapshot(qSavedParts, (snapshot) => {
      const savedData: SavedPart[] = [];
      snapshot.forEach((doc) => {
        savedData.push({ id: doc.id, ...doc.data() } as SavedPart);
      });
      setSavedParts(savedData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'savedParts');
    });

    return () => {
      unsubscribeRequests();
      unsubscribeSavedParts();
    };
  }, [user]);

  useEffect(() => {
    const fetchWishlistParts = async () => {
      if (savedParts.length === 0) {
        setWishlistParts([]);
        return;
      }
      try {
        const partPromises = savedParts.map(sp => getDoc(doc(db, 'parts', sp.partId)));
        const partDocs = await Promise.all(partPromises);
        const parts = partDocs
          .filter(d => d.exists())
          .map(d => ({ id: d.id, ...d.data() } as Part))
          .filter(part => {
            const shop = shops[part.shopId];
            return shop && (shop.status === 'approved' || !shop.status) && (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial');
          })
          .map(part => ({ ...part, shop: shops[part.shopId] }));
        setWishlistParts(parts);
      } catch (error) {
        console.error("Error fetching wishlist parts", error);
      }
    };
    fetchWishlistParts();
  }, [savedParts, shops]);

  const toggleSavePart = async (partId: string) => {
    if (!user) {
      signIn();
      return;
    }
    const existingSave = savedParts.find(sp => sp.partId === partId);
    try {
      if (existingSave) {
        await deleteDoc(doc(db, 'savedParts', existingSave.id));
      } else {
        await addDoc(collection(db, 'savedParts'), {
          userId: user.uid,
          partId: partId,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'savedParts');
    }
  };

  const executeSearch = async (term: string, overrides?: { carMake?: string }) => {
    setHasSearched(true);
    const activeFilterCarMake = overrides?.carMake !== undefined ? overrides.carMake : filterCarMake;
    const hasFilters = filterCountry || activeFilterCarMake || filterCarModel || filterYear || filterCondition || filterMinPrice || filterMaxPrice;
    if (!term.trim() && !hasFilters) {
      // If empty search, just fetch all parts again
      setLoading(true);
      try {
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const allParts: (Part & { shop?: Shop })[] = [];
        partsSnapshot.forEach((doc) => {
          const partData = { id: doc.id, ...doc.data() } as Part;
          const shop = shops[partData.shopId];
          if (shop && (shop.status === 'approved' || !shop.status) && (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial')) {
            allParts.push({
              ...partData,
              shop
            });
          }
        });
        // Sort parts: Pro shops first, then Basic, then Free
        allParts.sort((a, b) => {
          const tierOrder = { pro: 3, basic: 2, free: 1 };
          const aTier = a.shop?.subscriptionTier || 'free';
          const bTier = b.shop?.subscriptionTier || 'free';
          return tierOrder[bTier as keyof typeof tierOrder] - tierOrder[aTier as keyof typeof tierOrder];
        });
        setParts(allParts);
        setSimilarParts([]);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'parts');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const partsRef = collection(db, 'parts');
      let results = new Map<string, Part>();

      if (term.trim()) {
        const qName = query(partsRef, where('partName', '>=', term), where('partName', '<=', term + '\uf8ff'));
        const qNumber = query(partsRef, where('partNumber', '==', term));

        const [nameSnapshot, numberSnapshot] = await Promise.all([
          getDocs(qName),
          getDocs(qNumber)
        ]);

        nameSnapshot.forEach(doc => {
          results.set(doc.id, { id: doc.id, ...doc.data() } as Part);
        });
        
        numberSnapshot.forEach(doc => {
          results.set(doc.id, { id: doc.id, ...doc.data() } as Part);
        });
      } else {
        const allSnapshot = await getDocs(partsRef);
        allSnapshot.forEach(doc => {
          results.set(doc.id, { id: doc.id, ...doc.data() } as Part);
        });
      }

      let partsWithShops = Array.from(results.values())
        .filter(part => {
          const shop = shops[part.shopId];
          return shop && (shop.status === 'approved' || !shop.status) && (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial');
        })
        .map(part => ({
          ...part,
          shop: shops[part.shopId]
        }));

      // Apply advanced filters
      if (filterCountry) {
        partsWithShops = partsWithShops.filter(p => p.shop?.country === filterCountry);
      }
      if (activeFilterCarMake) {
        partsWithShops = partsWithShops.filter(p => p.carMake?.toLowerCase().includes(activeFilterCarMake.toLowerCase()));
      }
      if (filterCarModel) {
        partsWithShops = partsWithShops.filter(p => p.carModel?.toLowerCase().includes(filterCarModel.toLowerCase()));
      }
      if (filterYear) {
        partsWithShops = partsWithShops.filter(p => p.year === parseInt(filterYear));
      }
      if (filterCondition) {
        partsWithShops = partsWithShops.filter(p => p.condition === filterCondition);
      }
      if (filterMinPrice) {
        partsWithShops = partsWithShops.filter(p => p.price >= parseFloat(filterMinPrice));
      }
      if (filterMaxPrice) {
        partsWithShops = partsWithShops.filter(p => p.price <= parseFloat(filterMaxPrice));
      }

      // Sort parts: Pro shops first, then Basic, then Free
      partsWithShops.sort((a, b) => {
        const tierOrder = { pro: 3, basic: 2, free: 1 };
        const aTier = a.shop?.subscriptionTier || 'free';
        const bTier = b.shop?.subscriptionTier || 'free';
        return tierOrder[bTier as keyof typeof tierOrder] - tierOrder[aTier as keyof typeof tierOrder];
      });

      setParts(partsWithShops);

      if (partsWithShops.length === 0 && term.trim()) {
        // Fetch all parts and do a fuzzy search for similar parts
        const allPartsSnapshot = await getDocs(partsRef);
        const searchWords = term.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        
        const similarResults = new Map<string, Part>();
        
        if (searchWords.length > 0) {
          allPartsSnapshot.forEach(doc => {
            const partData = { id: doc.id, ...doc.data() } as Part;
            const partNameLower = partData.partName.toLowerCase();
            const partNumberLower = partData.partNumber.toLowerCase();
            const carModelLower = partData.carModel?.toLowerCase() || '';
            const carMakeLower = partData.carMake?.toLowerCase() || '';
            
            // Check if any search word is in partName, partNumber, carModel, or carMake
            const isSimilar = searchWords.some(word => 
              partNameLower.includes(word) || 
              partNumberLower.includes(word) ||
              carModelLower.includes(word) ||
              carMakeLower.includes(word)
            );
            
            if (isSimilar) {
              similarResults.set(doc.id, partData);
            }
          });
        }
        
        let similarPartsWithShops = Array.from(similarResults.values())
          .filter(part => {
            const shop = shops[part.shopId];
            return shop && (shop.status === 'approved' || !shop.status) && (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial');
          })
          .map(part => ({
            ...part,
            shop: shops[part.shopId]
          }));

        // Apply advanced filters to similar parts too
        if (filterCountry) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.shop?.country === filterCountry);
        }
        if (activeFilterCarMake) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.carMake?.toLowerCase().includes(activeFilterCarMake.toLowerCase()));
        }
        if (filterCarModel) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.carModel?.toLowerCase().includes(filterCarModel.toLowerCase()));
        }
        if (filterYear) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.year === parseInt(filterYear));
        }
        if (filterCondition) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.condition === filterCondition);
        }
        if (filterMinPrice) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.price >= parseFloat(filterMinPrice));
        }
        if (filterMaxPrice) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.price <= parseFloat(filterMaxPrice));
        }
        
        // Sort similar parts: Pro shops first, then Basic, then Free
        similarPartsWithShops.sort((a, b) => {
          const tierOrder = { pro: 3, basic: 2, free: 1 };
          const aTier = a.shop?.subscriptionTier || 'free';
          const bTier = b.shop?.subscriptionTier || 'free';
          return tierOrder[bTier as keyof typeof tierOrder] - tierOrder[aTier as keyof typeof tierOrder];
        });
        
        setSimilarParts(similarPartsWithShops);
      } else {
        setSimilarParts([]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeSearch(searchTerm);
  };

  const lastProcessedSearch = React.useRef<string | null>(null);

  useEffect(() => {
    if (Object.keys(shops).length === 0) return;
    
    const params = new URLSearchParams(location.search);
    
    if (lastProcessedSearch.current !== location.search) {
      lastProcessedSearch.current = location.search;
      const q = params.get('q');
      
      if (q !== null) {
        setSearchTerm(q);
        executeSearch(q);
      } else if (hasSearched && searchTerm !== '') {
        setSearchTerm('');
        executeSearch('');
      }
    }

    // Handle request modal opening separately to allow it to trigger after sign-in
    if (params.get('request') === 'true' && !isRequestModalOpen) {
      if (!user) {
        // If they landed here directly with ?request=true and aren't logged in
        signIn();
      } else {
        setIsRequestModalOpen(true);
        // Clean up the URL so it doesn't keep reopening
        window.history.replaceState({}, '', location.pathname + (params.get('q') ? `?q=${params.get('q')}` : ''));
      }
    }
  }, [location.search, shops, hasSearched, searchTerm, user, isRequestModalOpen, signIn]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      signIn();
      return;
    }

    setRequesting(true);
    try {
      const requestData: Omit<PartRequest, 'id'> = {
        customerUid: user.uid,
        partName: requestForm.partName,
        status: 'open',
        createdAt: new Date().toISOString()
      };

      if (requestForm.partNumber) requestData.partNumber = requestForm.partNumber;
      
      // Combine make, model, year into carModel for backwards compatibility
      const fullCarModel = [requestForm.carMake, requestForm.carModel, requestForm.year].filter(Boolean).join(' ');
      if (fullCarModel) requestData.carModel = fullCarModel;

      await addDoc(collection(db, 'partRequests'), requestData);
      
      // Notify Pro shops about the new request
      const proShops = (Object.values(shops) as Shop[]).filter(shop => 
        shop.subscriptionTier === 'pro' && 
        (shop.status === 'approved' || !shop.status) && 
        (shop.subscriptionStatus === 'active' || shop.subscriptionStatus === 'trial')
      );

      const phoneNumbers: string[] = [];

      for (const shop of proShops) {
        if (shop.phone) {
          phoneNumbers.push(shop.phone);
        }
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: shop.ownerUid,
            title: 'طلب خاص جديد',
            message: `هناك طلب جديد لقطعة: ${requestForm.partName} ${fullCarModel ? `لـ ${fullCarModel}` : ''}`,
            read: false,
            type: 'new_request',
            createdAt: Date.now()
          });
        } catch (e) {
          console.error("Failed to notify pro shop", e);
        }
      }

      // Send SMS/WhatsApp notifications via backend
      if (phoneNumbers.length > 0) {
        try {
          fetch('/api/notify-shops', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phoneNumbers,
              partName: requestForm.partName,
              carMake: requestForm.carMake || 'غير محدد',
              carModel: requestForm.carModel || 'غير محدد',
              requestUrl: window.location.origin + '/shop'
            }),
          }).catch(err => console.error("Failed to send SMS/WhatsApp notifications:", err));
        } catch (e) {
          console.error("Failed to call notify-shops API", e);
        }
      }

      setIsRequestModalOpen(false);
      setRequestForm({ partName: '', partNumber: '', carMake: '', carModel: '', year: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'partRequests');
    } finally {
      setRequesting(false);
    }
  };

  const categories = [
    { name: 'تويوتا', logo: CAR_LOGOS['تويوتا'] },
    { name: 'هيونداي', logo: CAR_LOGOS['هيونداي'] },
    { name: 'فورد', logo: CAR_LOGOS['فورد'] },
    { name: 'نيسان', logo: CAR_LOGOS['نيسان'] },
    { name: 'هوندا', logo: CAR_LOGOS['هوندا'] },
    { name: 'شيفروليه', logo: CAR_LOGOS['شيفروليه'] },
    { name: 'كيا', logo: CAR_LOGOS['كيا'] },
  ];

  return (
    <div className="min-h-screen bg-brand-bg pb-12">
      {activeTab === 'search' && (
        <div className="max-w-7xl mx-auto md:px-4 sm:px-6 lg:px-8 py-0 md:py-6">
          
          {/* Mobile Categories (eBay style) */}
          <div className="md:hidden bg-white border-b border-gray-100">
            <div className="flex overflow-x-auto hide-scrollbar gap-4 py-4 px-4">
              {categories.map((cat, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer" 
                  onClick={() => {
                    setFilterCarMake(cat.name);
                    executeSearch(searchTerm, { carMake: cat.name });
                  }}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors overflow-hidden ${
                    filterCarMake === cat.name ? 'bg-brand-primary/10 ring-2 ring-brand-primary ring-offset-2' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    {cat.logo ? (
                      <img 
                        src={cat.logo} 
                        alt={cat.name} 
                        className="w-8 h-8 object-contain" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
                        }}
                      />
                    ) : (
                      <Car className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${filterCarMake === cat.name ? 'text-brand-primary-hover' : 'text-brand-dark'}`}>
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Promotional Banner */}
          <div className="md:hidden px-4 py-4 bg-white">
            <div className="bg-gradient-to-r from-brand-primary to-brand-primary-hover rounded-xl p-4 text-white flex justify-between items-center shadow-md">
              <div>
                <h3 className="font-bold text-lg mb-1">عروض اليوم</h3>
                <p className="text-xs opacity-90">خصومات تصل إلى 50% على قطع الغيار</p>
              </div>
              <button className="bg-white text-brand-primary text-xs font-bold px-4 min-h-[44px] rounded-full shadow-sm">
                تسوق الآن
              </button>
            </div>
          </div>

          {/* Mobile Deals for you */}
          {!hasSearched && parts.length > 0 && (
            <div className="md:hidden bg-white pt-2 pb-6">
              <div className="px-4 flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-brand-dark">عروض لك</h2>
                <button className="text-sm text-brand-primary font-medium">عرض الكل</button>
              </div>
              <div className="flex overflow-x-auto hide-scrollbar gap-4 px-4 pb-2">
                {parts.slice(0, 5).map((part) => {
                  const isSaved = savedParts.some(sp => sp.partId === part.id);
                  return (
                    <div key={`deal-${part.id}`} className="w-[160px] flex-shrink-0">
                      <ProductGridItem
                        part={part}
                        isSaved={isSaved}
                        onToggleSave={toggleSavePart}
                        onClick={(p) => {
                          setSelectedImagePart(p);
                          setCurrentImageIndex(0);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Recent Views */}
          {!hasSearched && parts.length > 3 && (
            <div className="md:hidden bg-white pt-2 pb-6 border-t border-gray-100">
              <div className="px-4 flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-brand-dark">شوهد مؤخراً</h2>
                <button className="text-sm text-brand-primary font-medium">عرض الكل</button>
              </div>
              <div className="flex overflow-x-auto hide-scrollbar gap-4 px-4 pb-2">
                {parts.slice(3, 8).map((part) => {
                  const isSaved = savedParts.some(sp => sp.partId === part.id);
                  return (
                    <div key={`recent-${part.id}`} className="w-[160px] flex-shrink-0">
                      <ProductGridItem
                        part={part}
                        isSaved={isSaved}
                        onToggleSave={toggleSavePart}
                        onClick={(p) => {
                          setSelectedImagePart(p);
                          setCurrentImageIndex(0);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop Home Layout (Only when not searched) */}
          {!hasSearched && (
            <div className="hidden md:flex flex-col md:flex-row gap-8 mt-4 md:mt-0 px-4 md:px-0">
              {/* Sidebar */}
              <div className="w-full md:w-1/4 flex-shrink-0 space-y-6">
                {/* Categories */}
                <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4">
                  <h3 className="font-bold text-lg mb-4 border-b pb-2">فئات قطع الغيار</h3>
                  <ul className="space-y-2">
                    {['قطع المحرك', 'الفرامل', 'نظام التعليق', 'الفلاتر', 'الإطارات', 'ناقل الحركة'].map(cat => (
                      <li key={cat}>
                        <button 
                          onClick={() => { setFilterCarMake(''); setSearchTerm(cat); executeSearch(cat, { carMake: '' }); }}
                          className="w-full text-right px-3 py-2 rounded-lg hover:bg-brand-bg hover:text-brand-primary transition-colors text-sm font-medium min-h-[44px]"
                        >
                          {cat}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Offers */}
                <div className="bg-white rounded-xl shadow-sm border border-brand-border p-4">
                  <h3 className="font-bold text-lg mb-4 border-b pb-2">عروض اليوم</h3>
                  <div className="space-y-3">
                    <div className="bg-brand-bg p-3 rounded-lg border border-brand-border">
                      <p className="text-sm font-bold text-brand-dark">خصم 15% على الفحمات</p>
                      <p className="text-xs text-brand-secondary mt-1">ينتهي العرض قريباً</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="w-full md:w-3/4 space-y-8">
                {/* Hero Banner */}
                <div className="bg-brand-dark rounded-2xl overflow-hidden relative h-80 flex items-center">
                  <img src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1200" alt="Auto Parts" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
                  <div className="relative z-10 p-12 text-white">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4">أفضل قطع الغيار لسيارتك</h1>
                    <p className="text-lg lg:text-xl mb-8 max-w-lg text-gray-200">اكتشف مجموعتنا الواسعة من قطع الغيار الأصلية بأسعار تنافسية وجودة مضمونة.</p>
                    <button onClick={() => { setHasSearched(true); }} className="bg-brand-primary text-brand-dark px-8 py-3 rounded-lg font-bold hover:bg-brand-primary-hover transition-colors shadow-lg">تسوق الآن</button>
                  </div>
                </div>

                {/* Categories Grid */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">الفئات الرئيسية</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {categories.slice(0, 4).map((cat, idx) => (
                      <div key={idx} onClick={() => { setFilterCarMake(cat.name); executeSearch(searchTerm, { carMake: cat.name }); }} className="bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                          {cat.logo ? (
                            <img 
                              src={cat.logo} 
                              alt={cat.name} 
                              className="w-10 h-10 object-contain" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-brand-secondary"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
                              }}
                            />
                          ) : (
                            <Car className="w-8 h-8 text-brand-secondary" />
                          )}
                        </div>
                        <span className="font-bold text-brand-dark">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trending Products */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">المنتجات الرائجة</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {parts.slice(0, 4).map(part => (
                      <ProductGridItem 
                        key={part.id} 
                        part={part} 
                        onToggleSave={toggleSavePart} 
                        isSaved={savedParts.some(sp => sp.partId === part.id)} 
                        onClick={(p) => {
                          setSelectedImagePart(p);
                          setCurrentImageIndex(0);
                        }} 
                      />
                    ))}
                  </div>
                </div>

                {/* Special Offer Banner */}
                <div className="bg-gradient-to-r from-brand-primary to-orange-500 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold mb-2">خصم 20% على الفلاتر</h2>
                    <p className="text-white/90">استخدم الكود FILTER20 عند الدفع</p>
                  </div>
                  <button className="bg-white text-brand-dark px-6 min-h-[44px] rounded-lg font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">استفد من العرض</button>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Layout (Mobile always, Desktop only when searched) */}
          <div className={`flex flex-col md:flex-row gap-8 mt-4 md:mt-0 px-4 md:px-0 ${!hasSearched ? 'md:hidden' : ''}`}>
            {/* Sidebar Filters */}
            <div className={`w-full md:w-1/4 flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
              <div className="bg-white p-5 rounded-lg border border-brand-border sticky top-24">
                <h2 className="font-bold text-lg text-brand-dark mb-4 border-b border-gray-100 pb-2">تصفية النتائج</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="filterCountry" className="block text-sm font-medium text-gray-700">الدولة</label>
                    <select
                      id="filterCountry"
                      className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2"
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                    >
                      <option value="">كل الدول</option>
                      {ARAB_COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="filterCarMake" className="block text-sm font-medium text-gray-700">الشركة المصنعة</label>
                    <select
                      id="filterCarMake"
                      className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2"
                      value={filterCarMake}
                      onChange={(e) => {
                        setFilterCarMake(e.target.value);
                        setFilterCarModel(''); // Reset model when make changes
                      }}
                    >
                      <option value="">الكل</option>
                      {CAR_MAKES.map(make => (
                        <option key={make} value={make}>{make}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="filterCarModel" className="block text-sm font-medium text-gray-700">الموديل</label>
                    <select
                      id="filterCarModel"
                      className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2 disabled:bg-gray-100 disabled:text-gray-400"
                      value={filterCarModel}
                      onChange={(e) => setFilterCarModel(e.target.value)}
                      disabled={!filterCarMake}
                    >
                      <option value="">الكل</option>
                      {filterCarMake && CAR_MODELS[filterCarMake]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700">سنة الصنع</label>
                    <select
                      id="filterYear"
                      className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2 text-start"
                      dir="ltr"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                    >
                      <option value="">الكل</option>
                      {getYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="filterCondition" className="block text-sm font-medium text-gray-700">حالة القطعة</label>
                    <select
                      id="filterCondition"
                      className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2"
                      value={filterCondition}
                      onChange={(e) => setFilterCondition(e.target.value)}
                    >
                      <option value="">الكل</option>
                      <option value="new">جديد</option>
                      <option value="used">مستعمل</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">السعر</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2 text-center"
                        placeholder="من"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                      />
                      <span className="text-brand-secondary">-</span>
                      <input
                        type="number"
                        className="block w-full border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm py-2 text-center"
                        placeholder="إلى"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSearch}
                    className="w-full bg-gray-100 text-gray-800 border border-brand-border px-4 min-h-[44px] rounded-md font-medium hover:bg-gray-200 transition-colors mt-2 text-sm"
                  >
                    تطبيق الفلاتر
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-3/4">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
              ) : parts.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4 px-4 md:px-0">
                    <h2 className="text-xl font-bold text-brand-dark">
                      {hasSearched ? `${parts.length} نتيجة` : 'أحدث القطع المضافة'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className="md:hidden flex items-center gap-2 text-sm font-medium text-brand-primary bg-brand-primary/10 px-4 min-h-[44px] rounded-full"
                    >
                      <Filter className="h-5 w-5" />
                      تصفية
                    </button>
                  </div>

                  {/* Mobile Explore More Options */}
                  {!hasSearched && (
                    <div className="md:hidden mb-4">
                      <h3 className="text-sm font-bold text-gray-700 px-4 mb-2">استكشف المزيد من الخيارات: الماركات</h3>
                      <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 pb-2">
                        {categories.map((cat, idx) => (
                          <button
                            key={`explore-${idx}`}
                            onClick={() => {
                              setFilterCarMake(cat.name);
                              executeSearch(searchTerm, { carMake: cat.name });
                            }}
                            className="whitespace-nowrap bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium px-4 py-2 rounded-full border border-gray-200 transition-colors"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Unified Grid Layout for Mobile and Desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-6 px-0 md:px-0">
                    {parts.map((part) => {
                      const isSaved = savedParts.some(sp => sp.partId === part.id);
                      return (
                        <ProductGridItem
                          key={part.id}
                          part={part}
                          isSaved={isSaved}
                          onToggleSave={toggleSavePart}
                          onClick={(p) => {
                            setSelectedImagePart(p);
                            setCurrentImageIndex(0);
                          }}
                          layout="list"
                        />
                      );
                    })}
                  </div>
                  
                  {hasSearched && (
                    <div className="mt-8 bg-brand-bg/50 p-6 rounded-xl border border-brand-border text-center">
                      <h3 className="text-lg font-bold text-brand-dark mb-2">لم تجد القطعة المناسبة؟</h3>
                      <p className="text-brand-secondary mb-4 text-sm">
                        يمكنك إرسال طلب خاص بقطعتك وسيقوم أصحاب المحلات بالتواصل معك وتوفيرها لك بأفضل سعر.
                      </p>
                      <button
                        onClick={() => {
                          if (!user) {
                            signIn();
                          } else {
                            setRequestForm(prev => ({ ...prev, partName: searchTerm }));
                            setIsRequestModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all"
                      >
                        <Plus className="-mr-1 ml-2 h-4 w-4" aria-hidden="true" />
                        طلب قطعة غير موجودة
                      </button>
                    </div>
                  )}
                </div>
              ) : hasSearched ? (
                <div className="bg-white p-12 text-center rounded-lg border border-brand-border shadow-sm">
                  <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-brand-dark mb-2">لم يتم العثور على القطعة المطلوبة</h3>
                  <p className="text-brand-secondary mb-6 max-w-md mx-auto">
                    لا تقلق! يمكنك إرسال طلب خاص بقطعتك وسيقوم أصحاب المحلات بالتواصل معك وتوفيرها لك بأفضل سعر.
                  </p>
                  <button
                    onClick={() => {
                      if (!user) {
                        signIn();
                      } else {
                        setRequestForm(prev => ({ ...prev, partName: searchTerm }));
                        setIsRequestModalOpen(true);
                      }
                    }}
                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-base font-bold rounded-xl text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all transform hover:-translate-y-0.5"
                  >
                    <Plus className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                    طلب قطعة غير موجودة
                  </button>
                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-lg border border-brand-border shadow-sm">
                  <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-brand-dark mb-2">لا توجد قطع متاحة حالياً</h3>
                  <p className="text-brand-secondary mb-6 max-w-md mx-auto">
                    لم يتم إضافة أي قطع حتى الآن. يرجى العودة لاحقاً.
                  </p>
                </div>
              )}
              
              {/* Similar Results if any */}
              {parts.length === 0 && !loading && searchTerm && similarParts.length > 0 && (
                <div className="mt-12">
                  <div className="text-center mb-6 md:mb-10">
                    <h3 className="mt-2 text-lg font-bold text-brand-dark">قطع مشابهة قد تهمك</h3>
                  </div>
                  
                  {/* Unified Grid Layout for Mobile and Desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-6 px-0 md:px-0">
                    {similarParts.map((part) => {
                      const isSaved = savedParts.some(sp => sp.partId === part.id);
                      return (
                        <ProductGridItem
                          key={part.id}
                          part={part}
                          isSaved={isSaved}
                          onToggleSave={toggleSavePart}
                          onClick={(p) => {
                            setSelectedImagePart(p);
                            setCurrentImageIndex(0);
                          }}
                          layout="list"
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Requests Section */}
      {activeTab === 'search' && user && myRequests.length > 0 && (
        <div className="mt-16 border-t border-brand-border pt-10">
          <h2 className="text-2xl font-bold text-brand-dark mb-6">طلباتي السابقة</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {myRequests.map((request) => {
                const responses = myResponses.filter(r => r.requestId === request.id);
                return (
                  <li key={request.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-brand-primary truncate">
                          {request.partName} {request.partNumber && `(${request.partNumber})`}
                        </p>
                        <div className="ms-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status === 'open' ? 'مفتوح' : 'مغلق'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-brand-secondary">
                            {request.carModel && `موديل: ${request.carModel}`}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-brand-secondary sm:mt-0">
                          <p>
                            تم الطلب في: {new Date(request.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Responses */}
                      {responses.length > 0 && (
                        <div className="mt-4 bg-brand-bg p-4 rounded-md">
                          <h4 className="text-sm font-medium text-brand-dark mb-3">ردود المحلات ({responses.length})</h4>
                          <ul className="space-y-3">
                            {responses.map(response => {
                              const shop = shops[response.shopId];
                              return (
                                <li key={response.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm bg-white p-4 rounded-xl border border-brand-border shadow-sm gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <button 
                                        onClick={() => shop && setSelectedShopProfile(shop)}
                                        className="font-bold text-lg text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
                                      >
                                        {shop?.name || 'محل غير معروف'}
                                      </button>
                                      {shop?.rating && (
                                        <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                                          <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-3 h-3 ${
                                                  star <= Math.round(shop.rating!) ? 'text-yellow-400 fill-current' : 'text-yellow-200'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-brand-dark font-bold text-xs mr-1">{shop.rating.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center text-brand-secondary gap-3">
                                      <span>السعر: <span className="font-bold text-green-600 text-lg">${response.price}</span></span>
                                      <span className="text-gray-300">|</span>
                                      <span>الكمية: <span className="font-medium">{response.quantity}</span></span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {shop && (
                                      <>
                                        <button 
                                          onClick={() => setSelectedShopProfile(shop)}
                                          className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 min-h-[44px] rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border border-brand-border"
                                        >
                                          <Star className="w-4 h-4" />
                                          <span>تقييم المحل</span>
                                        </button>
                                        <a 
                                          href={`tel:${shop.phone}`} 
                                          className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 min-h-[44px] rounded-lg text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm"
                                        >
                                          <Phone className="w-4 h-4" />
                                          <span>اتصال</span>
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-brand-dark mb-6">قائمة المفضلة</h2>
          {wishlistParts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-brand-border">
              <Heart className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-brand-dark">لا توجد قطع في المفضلة</h3>
              <p className="mt-1 text-sm text-brand-secondary">
                قم بالبحث عن القطع واضغط على أيقونة القلب لحفظها هنا.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              {wishlistParts.map((part) => {
                const isSaved = true; // By definition, it's in the wishlist
                return (
                  <ProductListItem
                    key={part.id}
                    part={part}
                    isSaved={isSaved}
                    onToggleSave={toggleSavePart}
                    onImageClick={(p) => {
                      setSelectedImagePart(p);
                      setCurrentImageIndex(0);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button for Requesting Parts */}
      {activeTab === 'search' && (
        <button
          onClick={() => {
            if (!user) {
              signIn();
            } else {
              setRequestForm(prev => ({ ...prev, partName: searchTerm }));
              setIsRequestModalOpen(true);
            }
          }}
          className="fixed bottom-6 left-6 z-40 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-brand-primary-hover hover:scale-105 transition-all flex items-center justify-center group"
          title="طلب قطعة غير موجودة"
        >
          <Plus className="h-6 w-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap group-hover:ml-2 font-bold">
            طلب قطعة
          </span>
        </button>
      )}

      {/* Product Details Modal */}
      {selectedImagePart && (
        <ProductDetailsModal
          part={selectedImagePart}
          isOpen={!!selectedImagePart}
          onClose={() => setSelectedImagePart(null)}
          isSaved={savedParts.some(sp => sp.partId === selectedImagePart.id)}
          onToggleSave={toggleSavePart}
        />
      )}

      {/* Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-brand-secondary bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsRequestModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-start overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-brand-primary\/20 sm:mx-0 sm:h-10 sm:w-10">
                    <Package className="h-6 w-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ms-4 sm:text-start w-full">
                    <h3 className="text-lg leading-6 font-medium text-brand-dark" id="modal-title">
                      طلب قطعة غيار
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-brand-secondary mb-4">
                        سيتم إرسال هذا الطلب إلى جميع المحلات المسجلة. سيتواصلون معك إذا كانت القطعة متوفرة لديهم.
                      </p>
                      <form onSubmit={handleRequestSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="reqPartName" className="block text-sm font-medium text-gray-700">اسم القطعة *</label>
                          <input
                            type="text"
                            id="reqPartName"
                            required
                            className="mt-1 focus:ring-brand-primary focus:border-brand-primary block w-full shadow-sm sm:text-sm border-brand-border rounded-md p-2 border"
                            value={requestForm.partName}
                            onChange={(e) => setRequestForm({...requestForm, partName: e.target.value})}
                          />
                        </div>
                        <div>
                          <label htmlFor="reqPartNumber" className="block text-sm font-medium text-gray-700">رقم القطعة (اختياري)</label>
                          <input
                            type="text"
                            id="reqPartNumber"
                            dir="ltr"
                            className="mt-1 focus:ring-brand-primary focus:border-brand-primary block w-full shadow-sm sm:text-sm border-brand-border rounded-md p-2 border text-end"
                            value={requestForm.partNumber}
                            onChange={(e) => setRequestForm({...requestForm, partNumber: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="reqCarMake" className="block text-sm font-medium text-gray-700">الشركة المصنعة</label>
                            <select
                              id="reqCarMake"
                              className="mt-1 focus:ring-brand-primary focus:border-brand-primary block w-full shadow-sm sm:text-sm border-brand-border rounded-md p-2 border"
                              value={requestForm.carMake}
                              onChange={(e) => setRequestForm({...requestForm, carMake: e.target.value, carModel: ''})}
                            >
                              <option value="">اختر...</option>
                              {CAR_MAKES.map(make => (
                                <option key={make} value={make}>{make}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="reqCarModel" className="block text-sm font-medium text-gray-700">الموديل</label>
                            <select
                              id="reqCarModel"
                              className="mt-1 focus:ring-brand-primary focus:border-brand-primary block w-full shadow-sm sm:text-sm border-brand-border rounded-md p-2 border disabled:bg-gray-100 disabled:text-gray-400"
                              value={requestForm.carModel}
                              onChange={(e) => setRequestForm({...requestForm, carModel: e.target.value})}
                              disabled={!requestForm.carMake}
                            >
                              <option value="">اختر...</option>
                              {requestForm.carMake && CAR_MODELS[requestForm.carMake]?.map(model => (
                                <option key={model} value={model}>{model}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="reqYear" className="block text-sm font-medium text-gray-700">سنة الصنع</label>
                            <select
                              id="reqYear"
                              className="mt-1 focus:ring-brand-primary focus:border-brand-primary block w-full shadow-sm sm:text-sm border-brand-border rounded-md p-2 border"
                              value={requestForm.year}
                              onChange={(e) => setRequestForm({...requestForm, year: e.target.value})}
                            >
                              <option value="">اختر...</option>
                              {getYears().map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
                          <button
                            type="submit"
                            disabled={requesting}
                            className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-6 min-h-[44px] bg-brand-primary text-base font-bold text-white hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:w-auto sm:text-sm disabled:opacity-50 transition-colors"
                          >
                            {requesting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsRequestModalOpen(false)}
                            className="mt-3 sm:mt-0 w-full inline-flex justify-center items-center rounded-lg border border-brand-border shadow-sm px-6 min-h-[44px] bg-white text-base font-bold text-gray-700 hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:w-auto sm:text-sm transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Profile Modal */}
      {selectedShopProfile && (
        <ShopProfileModal
          shop={selectedShopProfile}
          isOpen={!!selectedShopProfile}
          onClose={() => setSelectedShopProfile(null)}
        />
      )}
    </div>
  );
}
