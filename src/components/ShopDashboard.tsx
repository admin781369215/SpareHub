import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';
import { Part, Shop, PartRequest, RequestResponse, AppNotification } from '../types';
import { Plus, Edit2, Trash2, Package, Tag, DollarSign, Hash, MessageCircle, CheckCircle, Image as ImageIcon, X, Settings, Star, Upload, Download } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { CAR_MAKES, CAR_MODELS, getYears } from '../utils/carData';
import { LocationPicker } from './LocationPicker';
import { EditPartModal } from './EditPartModal';

export function ShopDashboard() {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'settings'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new' | 'used'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  
  // Requests State
  const [customerRequests, setCustomerRequests] = useState<PartRequest[]>([]);
  const [myResponses, setMyResponses] = useState<RequestResponse[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({ price: 0, quantity: 1 });

  const [newPart, setNewPart] = useState<{
    partNumber: string;
    partName: string;
    carMake?: string;
    carModel?: string;
    year?: number;
    condition?: 'new' | 'used';
    manufacturer: string;
    price: number;
    quantity: number;
  }>({
    partNumber: '',
    partName: '',
    carMake: '',
    carModel: '',
    manufacturer: '',
    price: 0,
    quantity: 1
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch shop details for the current user
    const qShop = query(collection(db, 'shops'), where('ownerUid', '==', user.uid));
    const unsubscribeShop = onSnapshot(qShop, (snapshot) => {
      if (!snapshot.empty) {
        const shopData = snapshot.docs[0].data() as Shop;
        shopData.id = snapshot.docs[0].id;
        setShop(shopData);
        
        // Fetch parts for this shop
        const qParts = query(collection(db, 'parts'), where('shopId', '==', shopData.id));
        const unsubscribeParts = onSnapshot(qParts, (partsSnapshot) => {
          const partsList: Part[] = [];
          partsSnapshot.forEach((doc) => {
            partsList.push({ id: doc.id, ...doc.data() } as Part);
          });
          setParts(partsList);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'parts');
        });
        
        // Fetch open requests
        const qRequests = query(collection(db, 'partRequests'), where('status', '==', 'open'));
        const unsubscribeRequests = onSnapshot(qRequests, (reqSnapshot) => {
          const reqList: PartRequest[] = [];
          reqSnapshot.forEach((doc) => {
            reqList.push({ id: doc.id, ...doc.data() } as PartRequest);
          });
          reqList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setCustomerRequests(reqList);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'partRequests');
        });

        // Fetch shop's responses
        const qResponses = query(collection(db, 'requestResponses'), where('shopId', '==', shopData.id));
        const unsubscribeResponses = onSnapshot(qResponses, (respSnapshot) => {
          const respList: RequestResponse[] = [];
          respSnapshot.forEach((doc) => {
            respList.push({ id: doc.id, ...doc.data() } as RequestResponse);
          });
          setMyResponses(respList);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'requestResponses');
        });

        return () => {
          unsubscribeParts();
          unsubscribeRequests();
          unsubscribeResponses();
        };
      } else {
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shops');
    });

    return () => unsubscribeShop();
  }, [user]);

  const savePart = async (keepOpen: boolean) => {
    if (!shop || !newPart.partName || !newPart.partNumber || newPart.price <= 0 || newPart.quantity < 0) return;

    setUploadingImages(true);
    try {
      const imageUrls: string[] = [];
      
      for (const file of imageFiles) {
        const fileRef = ref(storage, `parts/${shop.id}/${Date.now()}_${file.name}`);
        const uploadTask = await uploadBytesResumable(fileRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        imageUrls.push(downloadURL);
      }

      const partData: Omit<Part, 'id'> = {
        ...newPart,
        shopId: shop.id,
        createdAt: new Date().toISOString()
      };

      if (imageUrls.length > 0) {
        partData.imageUrls = imageUrls;
      }

      await addDoc(collection(db, 'parts'), partData);
      
      if (!keepOpen) {
        setIsAddingPart(false);
      }
      setNewPart({ partNumber: '', partName: '', carMake: '', carModel: '', manufacturer: '', price: 0, quantity: 1 });
      setImageFiles([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'parts');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    savePart(false);
  };

  const downloadCsvTemplate = () => {
    const headers = ['اسم القطعة', 'الشركة المصنعة', 'الموديل', 'رقم القطعة', 'السعر', 'الكمية', 'الحالة (new/used)'];
    const sampleRow = ['مساعدات أمامية', 'تويوتا', 'كامري', 'TY-1234', '150', '5', 'new'];
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_parts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const rows = text.split('\n');
      let addedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',');
        if (row.length < 5) continue; // Skip invalid rows

        const [partName, carMake, carModel, partNumber, priceStr, quantityStr, condition] = row;
        
        if (!partName?.trim()) continue;

        try {
          const partData: Omit<Part, 'id'> = {
            shopId: shop.id,
            partName: partName.trim(),
            carMake: carMake?.trim() || '',
            carModel: carModel?.trim() || '',
            partNumber: partNumber?.trim() || '',
            price: parseFloat(priceStr) || 0,
            quantity: parseInt(quantityStr) || 1,
            condition: condition?.trim() === 'used' ? 'used' : 'new',
            createdAt: new Date().toISOString()
          };

          await addDoc(collection(db, 'parts'), partData);
          addedCount++;
        } catch (error) {
          console.error("Error adding row", i, error);
        }
      }
      
      alert(`تم استيراد ${addedCount} قطعة بنجاح!`);
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      // Limit to 5 images
      setImageFiles(prev => [...prev, ...filesArray].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const [partToDelete, setPartToDelete] = useState<string | null>(null);

  const handleDeletePart = async (partId: string) => {
    console.log('Attempting to delete part:', partId);
    try {
      console.log('Confirmed deletion for:', partId);
      await deleteDoc(doc(db, 'parts', partId));
      console.log('Deleted successfully');
      setPartToDelete(null);
    } catch (error) {
      console.error('Error deleting part:', error);
      handleFirestoreError(error, OperationType.DELETE, `parts/${partId}`);
    }
  };

  const handleRespondToRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !respondingTo || responseForm.price <= 0 || responseForm.quantity <= 0) return;

    try {
      const responseData: Omit<RequestResponse, 'id'> = {
        requestId: respondingTo,
        shopId: shop.id,
        price: responseForm.price,
        quantity: responseForm.quantity,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'requestResponses'), responseData);
      
      // Find the request to get the customerUid
      const request = customerRequests.find(r => r.id === respondingTo);
      if (request) {
        // Create a notification for the customer
        const notificationData: Omit<AppNotification, 'id'> = {
          userId: request.customerUid,
          title: 'رد جديد على طلبك',
          message: `قام محل "${shop.name}" بالرد على طلبك للقطعة: ${request.partName}`,
          read: false,
          type: 'request_response',
          relatedId: docRef.id,
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'notifications'), notificationData);
      }

      setRespondingTo(null);
      setResponseForm({ price: 0, quantity: 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requestResponses');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!shop) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-lg leading-6 font-medium text-brand-dark">سجل محلك</h3>
            <div className="mt-2 max-w-xl text-sm text-brand-secondary mx-auto">
              <p>تحتاج إلى تسجيل تفاصيل محلك قبل أن تتمكن من إضافة المخزون.</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:text-sm"
              >
                تسجيل المحل
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold leading-7 text-brand-dark sm:text-3xl sm:truncate">
              لوحة تحكم {shop.name}
            </h2>
            {shop.rating && (
              <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(shop.rating!) ? 'text-yellow-500 fill-current' : 'text-yellow-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-brand-dark font-bold text-sm mr-2">{shop.rating.toFixed(1)}</span>
                <span className="text-brand-secondary font-normal text-xs mr-1">({shop.reviewCount || 0})</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-secondary">إدارة المخزون والرد على الطلبات.</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ms-4 gap-3">
          <button
            onClick={downloadCsvTemplate}
            type="button"
            className="inline-flex items-center px-4 py-2 border border-brand-border rounded-md shadow-sm text-sm font-medium text-brand-dark bg-white hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            <Download className="-ms-1 me-2 h-5 w-5 text-gray-400" aria-hidden="true" />
            تحميل نموذج CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="csvUpload" 
            onChange={handleCsvUpload} 
          />
          <label
            htmlFor="csvUpload"
            className="inline-flex items-center px-4 py-2 border border-brand-border rounded-md shadow-sm text-sm font-medium text-brand-dark bg-white hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary cursor-pointer"
          >
            <Upload className="-ms-1 me-2 h-5 w-5 text-gray-400" aria-hidden="true" />
            استيراد من CSV
          </label>
          <button
            onClick={() => {
              setActiveTab('inventory');
              setIsAddingPart(!isAddingPart);
            }}
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            <Plus className="-ms-1 me-2 h-5 w-5" aria-hidden="true" />
            إضافة قطعة جديدة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-brand-border">
        <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`${
              activeTab === 'inventory'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            المخزون
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`${
              activeTab === 'requests'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-gray-700 hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            طلبات العملاء
            {customerRequests.length > 0 && (
              <span className="ms-2 bg-brand-primary/20 text-brand-primary py-0.5 px-2.5 rounded-full text-xs font-medium">
                {customerRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-gray-700 hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Settings className="me-2 h-4 w-4" />
            إعدادات المتجر
          </button>
        </nav>
      </div>

      {activeTab === 'inventory' && isAddingPart && (
        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-brand-dark mb-4">إضافة قطعة جديدة للمخزون</h3>
            <form onSubmit={handleAddPart} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="partName" className="block text-sm font-medium text-gray-700">
                    اسم القطعة *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="partName"
                      id="partName"
                      required
                      className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border"
                      value={newPart.partName}
                      onChange={(e) => setNewPart({ ...newPart, partName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="partNumber" className="block text-sm font-medium text-gray-700">
                    رقم القطعة (OEM) *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="partNumber"
                      id="partNumber"
                      required
                      className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border text-start"
                      dir="ltr"
                      value={newPart.partNumber}
                      onChange={(e) => setNewPart({ ...newPart, partNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="carMake" className="block text-sm font-medium text-gray-700">
                    الشركة المصنعة (اختياري)
                  </label>
                  <div className="mt-1">
                    <select
                      id="carMake"
                      name="carMake"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={newPart.carMake || ''}
                      onChange={(e) => setNewPart({ ...newPart, carMake: e.target.value, carModel: '' })}
                    >
                      <option value="">غير محدد</option>
                      {CAR_MAKES.map(make => (
                        <option key={make} value={make}>{make}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="carModel" className="block text-sm font-medium text-gray-700">
                    الموديل (اختياري)
                  </label>
                  <div className="mt-1">
                    <select
                      id="carModel"
                      name="carModel"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3 disabled:bg-gray-100 disabled:text-gray-400"
                      value={newPart.carModel || ''}
                      onChange={(e) => setNewPart({ ...newPart, carModel: e.target.value })}
                      disabled={!newPart.carMake}
                    >
                      <option value="">غير محدد</option>
                      {newPart.carMake && CAR_MODELS[newPart.carMake]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    سنة الصنع (اختياري)
                  </label>
                  <div className="mt-1">
                    <select
                      id="year"
                      name="year"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={newPart.year || ''}
                      onChange={(e) => setNewPart({ ...newPart, year: parseInt(e.target.value) || undefined })}
                    >
                      <option value="">غير محدد</option>
                      {getYears().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                    حالة القطعة (اختياري)
                  </label>
                  <div className="mt-1">
                    <select
                      id="condition"
                      name="condition"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={newPart.condition || ''}
                      onChange={(e) => setNewPart({ ...newPart, condition: e.target.value as 'new' | 'used' | undefined })}
                    >
                      <option value="">غير محدد</option>
                      <option value="new">جديد</option>
                      <option value="used">مستعمل</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    السعر *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      min="0"
                      step="0.01"
                      required
                      className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border text-start"
                      dir="ltr"
                      value={newPart.price}
                      onChange={(e) => setNewPart({ ...newPart, price: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    الكمية *
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      min="0"
                      required
                      className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border text-start"
                      dir="ltr"
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    صور القطعة (كحد أقصى 5 صور)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-brand-border border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-brand-secondary justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary"
                        >
                          <span>اختر صور</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageChange} disabled={imageFiles.length >= 5 || uploadingImages} />
                        </label>
                        <p className="ps-1">أو اسحب وأفلت هنا</p>
                      </div>
                      <p className="text-xs text-brand-secondary">PNG, JPG, GIF حتى 10 ميجابايت</p>
                    </div>
                  </div>
                  
                  {imageFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {imageFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="h-24 w-full object-cover rounded-md border border-brand-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPart(false);
                    setImageFiles([]);
                  }}
                  className="bg-white py-2 px-4 border border-brand-border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                  disabled={uploadingImages}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => savePart(true)}
                  disabled={uploadingImages}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                >
                  {uploadingImages ? 'جاري الحفظ...' : 'حفظ وإضافة قطعة أخرى'}
                </button>
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
                >
                  {uploadingImages ? 'جاري الحفظ...' : 'حفظ القطعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPart && (
        <EditPartModal 
          part={editingPart} 
          onClose={() => setEditingPart(null)} 
        />
      )}

      {partToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-medium text-brand-dark mb-4">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-6">هل أنت متأكد من حذف هذه القطعة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPartToDelete(null)}
                className="bg-white py-2 px-4 border border-brand-border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-brand-bg"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeletePart(partToDelete)}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="flex flex-col">
          {/* Search and Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم القطعة..."
              className="px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as 'all' | 'new' | 'used')}
            >
              <option value="all">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="used">مستعمل</option>
            </select>
            <select
              className="px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'inStock' | 'outOfStock')}
            >
              <option value="all">كل التوافر</option>
              <option value="inStock">متوفر</option>
              <option value="outOfStock">غير متوفر</option>
            </select>
          </div>

          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-brand-border sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-brand-bg">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-brand-secondary uppercase tracking-wider">
                        تفاصيل القطعة
                      </th>
                      <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-brand-secondary uppercase tracking-wider">
                        السيارة
                      </th>
                      <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-brand-secondary uppercase tracking-wider">
                        السعر
                      </th>
                      <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-brand-secondary uppercase tracking-wider">
                        المخزون
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">إجراءات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parts
                      .filter(part => {
                        const matchesSearch = part.partName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                              part.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCondition = conditionFilter === 'all' || part.condition === conditionFilter;
                        const matchesAvailability = availabilityFilter === 'all' || 
                                                    (availabilityFilter === 'inStock' ? part.quantity > 0 : part.quantity === 0);
                        return matchesSearch && matchesCondition && matchesAvailability;
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-brand-secondary">
                          لا توجد قطع تطابق معايير البحث.
                        </td>
                      </tr>
                    ) : (
                      parts
                        .filter(part => {
                          const matchesSearch = part.partName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                part.partNumber.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesCondition = conditionFilter === 'all' || part.condition === conditionFilter;
                          const matchesAvailability = availabilityFilter === 'all' || 
                                                      (availabilityFilter === 'inStock' ? part.quantity > 0 : part.quantity === 0);
                          return matchesSearch && matchesCondition && matchesAvailability;
                        })
                        .map((part) => (
                        <tr key={part.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {part.imageUrls && part.imageUrls.length > 0 ? (
                                  <img className="h-10 w-10 rounded-full object-cover" src={part.imageUrls[0]} alt={part.partName} />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ms-4">
                                <div className="text-sm font-medium text-brand-dark">{part.partName}</div>
                                <div className="text-sm text-brand-secondary" dir="ltr">PN: {part.partNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-brand-dark">
                              {part.carMake && <span className="me-1">{part.carMake}</span>}
                              {part.carModel && <span>{part.carModel}</span>}
                              {!part.carMake && !part.carModel && '-'}
                            </div>
                            <div className="text-xs text-brand-secondary">
                              {part.year && <span className="me-2">سنة: {part.year}</span>}
                              {part.condition && <span>حالة: {part.condition === 'new' ? 'جديد' : 'مستعمل'}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-secondary">
                            ${part.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${part.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {part.quantity} في المخزن
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                            <button onClick={() => setEditingPart(part)} className="text-brand-primary hover:text-brand-primary-hover me-4">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => { console.log('Delete button clicked for:', part.id); setPartToDelete(part.id); }} className="text-red-600 hover:text-red-900 relative z-10">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {customerRequests.length === 0 ? (
              <li className="px-6 py-10 text-center text-sm text-brand-secondary">
                لا توجد طلبات مفتوحة حالياً.
              </li>
            ) : (
              customerRequests.map((request) => {
                const hasResponded = myResponses.some(r => r.requestId === request.id);
                const isResponding = respondingTo === request.id;

                return (
                  <li key={request.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-brand-primary truncate">
                          {request.partName} {request.partNumber && `(${request.partNumber})`}
                        </p>
                        <div className="ms-2 flex-shrink-0 flex">
                          {hasResponded ? (
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              تم الرد
                            </p>
                          ) : (
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              بانتظار الرد
                            </p>
                          )}
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

                      {!hasResponded && !isResponding && (
                        <div className="mt-4">
                          <button
                            onClick={() => setRespondingTo(request.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-brand-primary-hover bg-brand-primary\/20 hover:bg-brand-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                          >
                            <MessageCircle className="me-1.5 h-4 w-4" />
                            تقديم عرض سعر
                          </button>
                        </div>
                      )}

                      {hasResponded && (
                        <div className="mt-4 bg-brand-bg p-4 rounded-md border border-brand-border">
                          <h4 className="text-sm font-medium text-brand-dark mb-2">عرض السعر المقدم:</h4>
                          {myResponses.filter(r => r.requestId === request.id).map(response => (
                            <div key={response.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex gap-6">
                                <div className="flex items-center text-sm text-gray-700">
                                  <DollarSign className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                  <span className="font-semibold">${response.price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                  <Package className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                  <span>الكمية: {response.quantity}</span>
                                </div>
                              </div>
                              <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  response.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  response.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {response.status === 'accepted' && <CheckCircle className="w-3 h-3 me-1" />}
                                  {response.status === 'accepted' ? 'تم القبول' :
                                   response.status === 'rejected' ? 'تم الرفض' : 'بانتظار رد العميل'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isResponding && (
                        <div className="mt-4 bg-brand-bg p-4 rounded-md border border-brand-border">
                          <form onSubmit={handleRespondToRequest} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="w-full sm:w-auto">
                              <label htmlFor={`price-${request.id}`} className="block text-xs font-medium text-gray-700 mb-1">السعر *</label>
                              <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                                  <DollarSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="number"
                                  id={`price-${request.id}`}
                                  min="0"
                                  step="0.01"
                                  required
                                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-9 sm:text-sm border-brand-border rounded-md py-1.5 border text-start"
                                  dir="ltr"
                                  value={responseForm.price}
                                  onChange={(e) => setResponseForm({ ...responseForm, price: parseFloat(e.target.value) })}
                                />
                              </div>
                            </div>
                            <div className="w-full sm:w-auto">
                              <label htmlFor={`qty-${request.id}`} className="block text-xs font-medium text-gray-700 mb-1">الكمية *</label>
                              <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                                  <Package className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="number"
                                  id={`qty-${request.id}`}
                                  min="1"
                                  required
                                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-9 sm:text-sm border-brand-border rounded-md py-1.5 border text-start"
                                  dir="ltr"
                                  value={responseForm.quantity}
                                  onChange={(e) => setResponseForm({ ...responseForm, quantity: parseInt(e.target.value) })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <button
                                type="submit"
                                className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                              >
                                إرسال
                              </button>
                              <button
                                type="button"
                                onClick={() => setRespondingTo(null)}
                                className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-brand-border text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                              >
                                إلغاء
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-brand-dark mb-4">تعديل بيانات المتجر</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!shop) return;
              try {
                await updateDoc(doc(db, 'shops', shop.id), {
                  name: shop.name,
                  phone: shop.phone,
                  city: shop.city,
                  location: shop.location || '',
                  latitude: shop.latitude || null,
                  longitude: shop.longitude || null
                });
                alert('تم تحديث بيانات المتجر بنجاح');
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'shops');
              }
            }} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                    اسم المتجر
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="shopName"
                      id="shopName"
                      required
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={shop.name}
                      onChange={(e) => setShop({ ...shop, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shopPhone" className="block text-sm font-medium text-gray-700">
                    رقم الهاتف
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="shopPhone"
                      id="shopPhone"
                      required
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3 text-start"
                      dir="ltr"
                      value={shop.phone}
                      onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shopCity" className="block text-sm font-medium text-gray-700">
                    المدينة
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="shopCity"
                      id="shopCity"
                      required
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={shop.city}
                      onChange={(e) => setShop({ ...shop, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shopLocation" className="block text-sm font-medium text-gray-700">
                    العنوان التفصيلي (اختياري)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="shopLocation"
                      id="shopLocation"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3"
                      value={shop.location || ''}
                      onChange={(e) => setShop({ ...shop, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    موقع المتجر على الخريطة
                  </label>
                  <LocationPicker 
                    initialLat={shop.latitude} 
                    initialLng={shop.longitude}
                    onLocationSelect={(lat, lng) => {
                      setShop({ ...shop, latitude: lat, longitude: lng });
                    }}
                  />
                  <p className="mt-2 text-xs text-brand-secondary">
                    اضغط على الخريطة لتحديد موقع المتجر بدقة. سيتم تحديث خط العرض وخط الطول تلقائياً.
                  </p>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shopLatitude" className="block text-sm font-medium text-gray-700">
                    خط العرض (Latitude)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      step="any"
                      name="shopLatitude"
                      id="shopLatitude"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3 bg-brand-bg"
                      value={shop.latitude || ''}
                      readOnly
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="shopLongitude" className="block text-sm font-medium text-gray-700">
                    خط الطول (Longitude)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      step="any"
                      name="shopLongitude"
                      id="shopLongitude"
                      className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border-brand-border rounded-md py-2 border px-3 bg-brand-bg"
                      value={shop.longitude || ''}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
