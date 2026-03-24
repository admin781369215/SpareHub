import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop, Order, User } from '../types';
import { Building, ShoppingBag, Users, CheckCircle, XCircle, DollarSign, Activity, Settings } from 'lucide-react';

export function SuperAdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(100);
  const [subscriptionDays, setSubscriptionDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'orders' | 'users' | 'settings'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shopsSnap, ordersSnap, usersSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'shops'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDoc(doc(db, 'settings', 'platform'))
      ]);

      setShops(shopsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop)));
      setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSubscriptionPrice(data.subscriptionPrice || 100);
        setSubscriptionDays(data.subscriptionDays || 30);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShopStatusUpdate = async (shopId: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'shops', shopId), { status: newStatus });
      setShops(shops.map(shop => shop.id === shopId ? { ...shop, status: newStatus } : shop));
    } catch (error) {
      console.error("Error updating shop status:", error);
      alert("حدث خطأ أثناء تحديث حالة المتجر");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'platform'), {
        subscriptionPrice,
        subscriptionDays,
        updatedAt: Date.now()
      }, { merge: true });
      alert("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRenewSubscription = async (shopId: string, days: number) => {
    try {
      const newEndDate = Date.now() + (days * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, 'shops', shopId), { 
        subscriptionStatus: 'active',
        subscriptionEndDate: newEndDate
      });
      setShops(shops.map(shop => shop.id === shopId ? { ...shop, subscriptionStatus: 'active', subscriptionEndDate: newEndDate } : shop));
      alert("تم تجديد الاشتراك بنجاح");
    } catch (error) {
      console.error("Error renewing subscription:", error);
      alert("حدث خطأ أثناء تجديد الاشتراك");
    }
  };

  const handleUpdateShopTier = async (shopId: string, newTier: 'free' | 'basic' | 'pro') => {
    try {
      await updateDoc(doc(db, 'shops', shopId), { subscriptionTier: newTier });
      setShops(shops.map(shop => shop.id === shopId ? { ...shop, subscriptionTier: newTier } : shop));
      alert("تم تحديث باقة المتجر بنجاح");
    } catch (error) {
      console.error("Error updating shop tier:", error);
      alert("حدث خطأ أثناء تحديث باقة المتجر");
    }
  };

  const handleToggleVerification = async (shopId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'shops', shopId), { isVerified: newStatus });
      setShops(shops.map(shop => shop.id === shopId ? { ...shop, isVerified: newStatus } : shop));
      alert(`تم ${newStatus ? 'توثيق' : 'إلغاء توثيق'} المتجر بنجاح`);
    } catch (error) {
      console.error("Error toggling shop verification:", error);
      alert("حدث خطأ أثناء تحديث حالة توثيق المتجر");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const totalSales = orders.filter(o => o.status === 'delivered').reduce((sum, order) => sum + order.totalPrice, 0);
  const activeSubscriptionsCount = shops.filter(s => s.subscriptionStatus === 'active' || s.subscriptionStatus === 'trial').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-brand-dark">لوحة تحكم الإدارة العليا</h1>
        <p className="mt-2 text-sm text-brand-secondary">إدارة المنصة، المتاجر، والطلبات</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-brand-border mb-8">
        <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center min-h-[44px]`}
          >
            <Activity className="w-5 h-5 ml-2" />
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('shops')}
            className={`${
              activeTab === 'shops'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center min-h-[44px]`}
          >
            <Building className="w-5 h-5 ml-2" />
            المتاجر ({shops.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`${
              activeTab === 'orders'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center min-h-[44px]`}
          >
            <ShoppingBag className="w-5 h-5 ml-2" />
            الطلبات ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center min-h-[44px]`}
          >
            <Users className="w-5 h-5 ml-2" />
            المستخدمين ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-secondary hover:text-brand-dark hover:border-brand-border'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center min-h-[44px]`}
          >
            <Settings className="w-5 h-5 ml-2" />
            الإعدادات
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg border border-brand-border">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-brand-secondary truncate">إجمالي المبيعات (مكتملة)</dt>
                      <dd className="text-lg font-bold text-brand-dark">${totalSales.toFixed(2)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border border-brand-border">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 text-green-500" aria-hidden="true" />
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-brand-secondary truncate">الاشتراكات النشطة</dt>
                      <dd className="text-lg font-bold text-green-600">{activeSubscriptionsCount}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border border-brand-border">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building className="h-6 w-6 text-blue-500" aria-hidden="true" />
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-brand-secondary truncate">إجمالي المتاجر</dt>
                      <dd className="text-lg font-bold text-brand-dark">{shops.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border border-brand-border">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-500" aria-hidden="true" />
                  </div>
                  <div className="mr-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-brand-secondary truncate">إجمالي المستخدمين</dt>
                      <dd className="text-lg font-bold text-brand-dark">{users.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shops' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-brand-border">
          <ul className="divide-y divide-brand-border">
            {shops.map((shop) => (
              <li key={shop.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-brand-primary truncate">{shop.name}</p>
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        shop.status === 'approved' || !shop.status ? 'bg-green-100 text-green-800' :
                        shop.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {shop.status === 'approved' || !shop.status ? 'معتمد' :
                         shop.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </span>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex gap-2">
                      {shop.status !== 'approved' && shop.status !== undefined && (
                        <button
                          onClick={() => handleShopStatusUpdate(shop.id, 'approved')}
                          className="inline-flex items-center justify-center px-4 min-h-[44px] border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-5 h-5 ml-1.5" /> قبول
                        </button>
                      )}
                      {shop.status !== 'rejected' && (
                        <button
                          onClick={() => handleShopStatusUpdate(shop.id, 'rejected')}
                          className="inline-flex items-center justify-center px-4 min-h-[44px] border border-transparent text-sm font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-5 h-5 ml-1.5" /> رفض
                        </button>
                      )}
                      {shop.status === 'approved' && (
                        <button
                          onClick={() => handleRenewSubscription(shop.id, subscriptionDays)}
                          className="inline-flex items-center justify-center px-4 min-h-[44px] border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          <Activity className="w-5 h-5 ml-1.5" /> تجديد الاشتراك
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex flex-col gap-1">
                      <p className="flex items-center text-sm text-brand-secondary">
                        المدينة: {shop.city}
                      </p>
                      <p className="flex items-center text-sm text-brand-secondary">
                        الهاتف: <span dir="ltr" className="ml-1">{shop.phone}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex flex-col items-end text-sm text-brand-secondary sm:mt-0 gap-2">
                      <p>تاريخ التسجيل: {new Date(shop.createdAt).toLocaleDateString('ar-SA')}</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span>الباقة:</span>
                        <select
                          value={shop.subscriptionTier || 'free'}
                          onChange={(e) => handleUpdateShopTier(shop.id, e.target.value as 'free' | 'basic' | 'pro')}
                          className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary"
                        >
                          <option value="free">مجانية</option>
                          <option value="basic">أساسية</option>
                          <option value="pro">احترافية</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shop.isVerified || false}
                            onChange={() => handleToggleVerification(shop.id, shop.isVerified || false)}
                            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary h-4 w-4"
                          />
                          <span className="text-sm">متجر موثق</span>
                        </label>
                      </div>

                      <p className="mt-1">
                        حالة الاشتراك: 
                        <span className={`ml-2 font-bold ${
                          shop.subscriptionStatus === 'active' ? 'text-green-600' :
                          shop.subscriptionStatus === 'trial' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>
                          {shop.subscriptionStatus === 'active' ? 'نشط' :
                           shop.subscriptionStatus === 'trial' ? 'تجريبي' : 'منتهي / غير محدد'}
                        </span>
                      </p>
                      {shop.subscriptionEndDate && (
                        <p className="mt-1 text-xs">
                          ينتهي في: {new Date(shop.subscriptionEndDate).toLocaleDateString('ar-SA')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {shops.length === 0 && (
              <li className="px-4 py-8 text-center text-brand-secondary">لا توجد متاجر مسجلة</li>
            )}
          </ul>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-brand-border">
          <ul className="divide-y divide-brand-border">
            {orders.map((order) => (
              <li key={order.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-brand-primary truncate">
                      طلب #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status === 'pending' ? 'قيد الانتظار' :
                         order.status === 'confirmed' ? 'مؤكد' :
                         order.status === 'shipped' ? 'قيد التوصيل' :
                         order.status === 'delivered' ? 'تم التوصيل' : 'ملغي'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-brand-secondary">
                        المبلغ: ${order.totalPrice.toFixed(2)}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-brand-secondary sm:mt-0 sm:ml-6">
                        عدد القطع: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-brand-secondary sm:mt-0">
                      <p>التاريخ: {new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="px-4 py-8 text-center text-brand-secondary">لا توجد طلبات</li>
            )}
          </ul>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-brand-border">
          <ul className="divide-y divide-brand-border">
            {users.map((user) => (
              <li key={user.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-brand-primary truncate">
                      {user.name}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'shop_owner' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? 'مدير' :
                         user.role === 'shop_owner' ? 'تاجر' : 'عميل'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-brand-secondary">
                        البريد الإلكتروني: {user.email}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-brand-secondary sm:mt-0">
                      <p>تاريخ التسجيل: {new Date(user.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {users.length === 0 && (
              <li className="px-4 py-8 text-center text-brand-secondary">لا يوجد مستخدمين</li>
            )}
          </ul>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-white shadow sm:rounded-lg border border-brand-border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-brand-dark">
              إعدادات المنصة
            </h3>
            <div className="mt-2 max-w-xl text-sm text-brand-secondary">
              <p>
                قم بتحديث إعدادات اشتراكات المتاجر.
              </p>
            </div>
            <div className="mt-5 sm:flex sm:items-center gap-4">
              <div className="w-full sm:max-w-xs">
                <label htmlFor="subscriptionPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  سعر الاشتراك
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="subscriptionPrice"
                    id="subscriptionPrice"
                    className="focus:ring-brand-primary focus:border-brand-primary block w-full pr-10 sm:text-sm border-brand-border rounded-md"
                    placeholder="100"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                    min="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-brand-secondary sm:text-sm">$</span>
                  </div>
                </div>
              </div>
              <div className="w-full sm:max-w-xs mt-4 sm:mt-0">
                <label htmlFor="subscriptionDays" className="block text-sm font-medium text-gray-700 mb-1">
                  مدة الاشتراك (بالأيام)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    name="subscriptionDays"
                    id="subscriptionDays"
                    className="focus:ring-brand-primary focus:border-brand-primary block w-full pr-10 sm:text-sm border-brand-border rounded-md"
                    placeholder="30"
                    value={subscriptionDays}
                    onChange={(e) => setSubscriptionDays(Number(e.target.value))}
                    min="1"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-brand-secondary sm:text-sm">يوم</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="mt-6 w-full inline-flex items-center justify-center px-6 min-h-[44px] border border-transparent shadow-sm font-bold rounded-lg text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary sm:w-auto sm:text-sm disabled:opacity-50 transition-colors"
              >
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
