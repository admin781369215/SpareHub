import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Part, Shop, PartRequest, RequestResponse, SavedPart, AppNotification } from '../types';
import { Search, MapPin, Phone, DollarSign, Package, Plus, X, Filter, Heart, Bell, Camera, Star, Car } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { useAuth } from '../AuthContext';
import { ProductListItem } from './ProductListItem';
import { ProductGridItem } from './ProductGridItem';
import { ShopProfileModal } from './ShopProfileModal';
import { CAR_MAKES, CAR_MODELS, getYears, CAR_LOGOS } from '../utils/carData';

export function CustomerDashboard() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [parts, setParts] = useState<(Part & { shop?: Shop })[]>([]);
  const [similarParts, setSimilarParts] = useState<(Part & { shop?: Shop })[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
          initialParts.push({
            ...partData,
            shop: shopsData[partData.shopId]
          });
        });
        setParts(initialParts);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'shops');
      }
    };
    fetchShops();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const qNotifications = query(notificationsRef, where('userId', '==', user.uid));
    
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      const notifsData: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifsData.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      notifsData.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribeNotifications();
  }, [user]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markNotificationAsRead(notif.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
        // Firestore 'in' query supports up to 10 items. For a real app, we might need a different approach if > 10
        // For now, we'll fetch all responses and filter, or batch if needed.
        // Since we want to keep it simple, let's just fetch all responses where we can, or just fetch all and filter locally for now to avoid complex index/batching issues in this prototype.
        const responsesRef = collection(db, 'requestResponses');
        onSnapshot(responsesRef, (respSnapshot) => {
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setHasSearched(true);
    const hasFilters = filterCarMake || filterCarModel || filterYear || filterCondition || filterMinPrice || filterMaxPrice;
    if (!searchTerm.trim() && !hasFilters) {
      // If empty search, just fetch all parts again
      setLoading(true);
      try {
        const partsSnapshot = await getDocs(collection(db, 'parts'));
        const allParts: (Part & { shop?: Shop })[] = [];
        partsSnapshot.forEach((doc) => {
          const partData = { id: doc.id, ...doc.data() } as Part;
          allParts.push({
            ...partData,
            shop: shops[partData.shopId]
          });
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

      if (searchTerm.trim()) {
        const qName = query(partsRef, where('partName', '>=', searchTerm), where('partName', '<=', searchTerm + '\uf8ff'));
        const qNumber = query(partsRef, where('partNumber', '==', searchTerm));

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

      let partsWithShops = Array.from(results.values()).map(part => ({
        ...part,
        shop: shops[part.shopId]
      }));

      // Apply advanced filters
      if (filterCarMake) {
        partsWithShops = partsWithShops.filter(p => p.carMake?.toLowerCase().includes(filterCarMake.toLowerCase()));
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

      setParts(partsWithShops);

      if (partsWithShops.length === 0 && searchTerm.trim()) {
        // Fetch all parts and do a fuzzy search for similar parts
        const allPartsSnapshot = await getDocs(partsRef);
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        
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
        
        let similarPartsWithShops = Array.from(similarResults.values()).map(part => ({
          ...part,
          shop: shops[part.shopId]
        }));

        // Apply advanced filters to similar parts too
        if (filterCarMake) {
          similarPartsWithShops = similarPartsWithShops.filter(p => p.carMake?.toLowerCase().includes(filterCarMake.toLowerCase()));
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
      {/* Search Area */}
      <div className="bg-white shadow-sm sticky top-0 z-40 md:static md:border-b md:border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Mobile Search Bar (eBay style) */}
            <div className="w-full md:hidden">
              <form onSubmit={handleSearch} className="flex w-full bg-gray-100 rounded-full overflow-hidden px-4 py-2.5 items-center border border-brand-border shadow-inner">
                <Search className="w-5 h-5 text-brand-secondary ml-2" />
                <input
                  type="text"
                  className="flex-grow bg-transparent border-none focus:ring-0 text-sm outline-none placeholder-brand-secondary"
                  placeholder="ابحث عن أي شيء..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="button" className="text-brand-secondary hover:text-brand-primary transition-colors mr-2">
                  <Camera className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex w-full md:flex-grow md:max-w-3xl">
              <form onSubmit={handleSearch} className="flex w-full border-2 border-brand-dark rounded-md overflow-hidden bg-white">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    name="search"
                    id="search"
                    className="block w-full border-0 py-2.5 px-4 pe-12 text-brand-dark placeholder:text-brand-secondary focus:ring-0 sm:text-base outline-none"
                    placeholder="ابحث عن أي شيء (مثال: صدام أمامي كامري 2020)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 end-0 flex items-center pe-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`p-1.5 rounded-md transition-all ${
                        showFilters ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-400 hover:text-brand-secondary hover:bg-brand-bg'
                      }`}
                      title="تصفية النتائج"
                    >
                      <Filter className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-brand-primary text-white px-8 py-2.5 font-bold hover:bg-brand-primary-hover transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'بحث'
                  )}
                </button>
              </form>
            </div>

            {/* Desktop controls */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate('/?tab=wishlist')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors font-medium text-sm ${
                  activeTab === 'wishlist' ? 'text-brand-primary' : 'text-brand-dark hover:text-brand-primary'
                }`}
              >
                <Heart className={`w-5 h-5 ${activeTab === 'wishlist' ? 'fill-current' : ''}`} />
                المفضلة ({savedParts.length})
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors font-medium text-sm relative ${
                    showNotifications ? 'text-brand-primary' : 'text-brand-dark hover:text-brand-primary'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  الإشعارات
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute left-0 mt-3 w-80 bg-white rounded-xl shadow-2xl z-50 ring-1 ring-black ring-opacity-5 overflow-hidden origin-top-left">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-brand-bg/80 backdrop-blur-sm">
                      <h3 className="text-sm font-bold text-brand-dark">الإشعارات</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllNotificationsAsRead}
                          className="text-xs text-brand-primary hover:text-brand-primary-hover font-bold"
                        >
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm text-brand-secondary font-medium">لا توجد إشعارات جديدة</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-50">
                          {notifications.map((notif) => (
                            <li 
                              key={notif.id} 
                              className={`p-4 hover:bg-brand-bg transition-colors cursor-pointer ${!notif.read ? 'bg-brand-primary\/10/30' : ''}`}
                              onClick={() => {
                                if (!notif.read) markNotificationAsRead(notif.id);
                              }}
                            >
                              <div className="flex gap-3">
                                <div className={`flex-shrink-0 w-2.5 h-2.5 mt-1.5 rounded-full ${!notif.read ? 'bg-brand-primary ring-2 ring-brand-primary/20' : 'bg-gray-200'}`}></div>
                                <div>
                                  <p className={`text-sm ${!notif.read ? 'font-bold text-brand-dark' : 'font-medium text-brand-secondary'}`}>
                                    {notif.title}
                                  </p>
                                  <p className="text-sm text-brand-secondary mt-1 leading-relaxed">{notif.message}</p>
                                  <p className="text-xs text-gray-400 mt-2 font-medium">
                                    {new Date(notif.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    handleSearch(new Event('submit') as any);
                  }}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border shadow-sm transition-colors overflow-hidden ${
                    filterCarMake === cat.name ? 'bg-brand-primary\/10 border-brand-primary' : 'bg-white border-brand-border'
                  }`}>
                    {cat.logo ? (
                      <img src={cat.logo} alt={cat.name} className="w-8 h-8 object-contain" />
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
              <button className="bg-white text-brand-primary text-xs font-bold px-4 py-2 rounded-full shadow-sm">
                تسوق الآن
              </button>
            </div>
          </div>

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
                          onClick={() => { setFilterCarMake(''); setSearchTerm(cat); handleSearch(new Event('submit') as any); }}
                          className="w-full text-right px-3 py-2 rounded-lg hover:bg-brand-bg hover:text-brand-primary transition-colors text-sm font-medium"
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
                      <div key={idx} onClick={() => { setFilterCarMake(cat.name); handleSearch(new Event('submit') as any); }} className="bg-white rounded-xl p-4 border border-brand-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center">
                          {cat.logo ? <img src={cat.logo} alt={cat.name} className="w-10 h-10 object-contain" /> : <Car className="w-8 h-8 text-brand-secondary" />}
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
                  <button className="bg-white text-brand-dark px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">استفد من العرض</button>
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
                    className="w-full bg-gray-100 text-gray-800 border border-brand-border px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors mt-2 text-sm"
                  >
                    تطبيق الفلاتر
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full md:w-3/4">
              {parts.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-brand-dark">
                      {hasSearched ? `${parts.length} نتيجة` : 'أحدث القطع المضافة'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className="md:hidden flex items-center gap-2 text-sm font-medium text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full"
                    >
                      <Filter className="h-4 w-4" />
                      تصفية
                    </button>
                  </div>
                  
                  {/* Mobile Vertical List */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {parts.map((part) => {
                      const isSaved = savedParts.some(sp => sp.partId === part.id);
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

                  {/* Desktop Grid Layout */}
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
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
              )}
              
              {/* Similar Results if any */}
              {parts.length === 0 && !loading && searchTerm && similarParts.length > 0 && (
                <div className="mt-12">
                  <div className="text-center mb-6 md:mb-10">
                    <h3 className="mt-2 text-lg font-bold text-brand-dark">قطع مشابهة قد تهمك</h3>
                  </div>
                  
                  {/* Mobile Vertical List */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {similarParts.map((part) => {
                      const isSaved = savedParts.some(sp => sp.partId === part.id);
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

                  {/* Desktop Grid Layout */}
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                                          className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border border-brand-border"
                                        >
                                          <Star className="w-4 h-4" />
                                          <span>تقييم المحل</span>
                                        </button>
                                        <a 
                                          href={`tel:${shop.phone}`} 
                                          className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm"
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

      {/* Image Modal */}
      {selectedImagePart && selectedImagePart.imageUrls && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-brand-secondary bg-opacity-90 transition-opacity" aria-hidden="true" onClick={() => setSelectedImagePart(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-transparent rounded-lg text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full relative">
              <button
                type="button"
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
                onClick={() => setSelectedImagePart(null)}
              >
                <X className="h-6 w-6" />
              </button>

              <div className="relative w-full h-[70vh] flex items-center justify-center">
                <img 
                  src={selectedImagePart.imageUrls[currentImageIndex]} 
                  alt={`${selectedImagePart.partName} - Image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {selectedImagePart.imageUrls.length > 1 && (
                <div className="flex justify-center mt-4 gap-2 overflow-x-auto py-2 px-4">
                  {selectedImagePart.imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 ${
                        currentImageIndex === idx ? 'border-brand-primary' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
                        <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={requesting}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-primary text-base font-medium text-white hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:ms-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {requesting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsRequestModalOpen(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-brand-border shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:mt-0 sm:ms-3 sm:w-auto sm:text-sm"
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
