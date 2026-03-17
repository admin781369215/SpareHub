import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Order, Shop } from '../types';
import { Package, Clock, CheckCircle, XCircle, Truck, Star } from 'lucide-react';
import { ShopProfileModal } from './ShopProfileModal';

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, 'orders'),
          where('customerUid', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'shipped': return <Truck className="w-5 h-5 text-indigo-500" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const handleReviewShop = async (shopId: string) => {
    if (!shopId) return;
    try {
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      if (shopDoc.exists()) {
        setSelectedShop({ id: shopDoc.id, ...shopDoc.data() } as Shop);
      } else {
        alert('المتجر غير موجود');
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
      alert('حدث خطأ أثناء جلب بيانات المتجر');
    }
  };

  if (loading) return <div className="p-8 text-center">جاري تحميل الطلبات...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">طلباتي</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-brand-border">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">لا توجد طلبات حالياً.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-brand-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-lg">طلب #{order.id.slice(-6)}</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {getStatusIcon(order.status)}
                  {order.status === 'pending' && 'قيد المراجعة'}
                  {order.status === 'confirmed' && 'مؤكد'}
                  {order.status === 'shipped' && 'تم الشحن'}
                  {order.status === 'delivered' && 'تم التوصيل'}
                  {order.status === 'cancelled' && 'ملغي'}
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm py-2 border-b border-gray-50 last:border-0">
                    <div className="mb-2 sm:mb-0">
                      <span className="font-medium">{item.partName}</span>
                      <span className="text-gray-500 mx-2">x {item.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      {order.status === 'delivered' && item.shopId && (
                        <button
                          onClick={() => handleReviewShop(item.shopId)}
                          className="flex items-center justify-center gap-1 text-sm font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 px-4 min-h-[44px] rounded-lg transition-colors"
                        >
                          <Star className="w-4 h-4 fill-current" />
                          تقييم المتجر
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold">
                <span>الإجمالي:</span>
                <span className="text-brand-primary">${order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedShop && (
        <ShopProfileModal
          shop={selectedShop}
          isOpen={!!selectedShop}
          onClose={() => setSelectedShop(null)}
        />
      )}
    </div>
  );
}
