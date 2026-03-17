import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useCart } from '../contexts/CartContext';
import { Order } from '../types';

export function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmOrder = async () => {
    if (!auth.currentUser) {
      alert('يرجى تسجيل الدخول لإتمام الطلب');
      return;
    }
    if (!address || !phone) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      const orderData: Omit<Order, 'id'> = {
        customerUid: auth.currentUser.uid,
        items: items.map(item => ({
          partId: item.part.id,
          partName: item.part.partName,
          price: item.part.price,
          quantity: item.quantity,
          shopId: item.part.shopId
        })),
        totalPrice,
        shippingAddress: address,
        phoneNumber: phone,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      alert('تم إرسال طلبك بنجاح!');
      navigate('/my-requests');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('حدث خطأ أثناء إتمام الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">عربة التسوق فارغة</h2>
        <button 
          onClick={() => navigate('/')} 
          className="inline-flex items-center justify-center px-6 min-h-[44px] bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-hover transition-colors"
        >
          العودة للتسوق
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-border mb-6">
        <h2 className="font-bold mb-4">ملخص الطلب</h2>
        {items.map(item => (
          <div key={item.part.id} className="flex justify-between py-2 border-b">
            <span>{item.part.partName} x {item.quantity}</span>
            <span>${(item.part.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between py-4 font-bold text-lg">
          <span>الإجمالي:</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-border">
        <h2 className="font-bold mb-4">بيانات الشحن</h2>
        <input 
          type="text" 
          placeholder="عنوان التوصيل" 
          className="w-full p-3 border rounded-lg mb-4"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <input 
          type="tel" 
          placeholder="رقم الهاتف" 
          className="w-full p-3 border rounded-lg mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button 
          onClick={handleConfirmOrder}
          disabled={loading}
          className="w-full bg-brand-primary text-white py-3 rounded-lg font-bold hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'جاري المعالجة...' : 'تأكيد الطلب'}
        </button>
      </div>
    </div>
  );
}
