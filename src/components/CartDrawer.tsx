import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-dark flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            عربة التسوق ({items.length})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>عربة التسوق فارغة</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.part.id} className="flex gap-4 border-b border-gray-100 pb-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.part.imageUrls && item.part.imageUrls.length > 0 ? (
                    <img src={item.part.imageUrls[0]} alt={item.part.partName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">لا صورة</div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-brand-dark text-sm line-clamp-1">{item.part.partName}</h3>
                  <p className="text-brand-primary font-bold text-sm mt-1">${item.part.price}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => updateQuantity(item.part.id, item.quantity - 1)}
                      className="w-11 h-11 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.part.id, item.quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeFromCart(item.part.id)}
                      className="mr-auto w-11 h-11 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-brand-dark">الإجمالي:</span>
              <span className="text-xl font-bold text-brand-primary">${totalPrice.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full bg-brand-primary text-white py-3 rounded-lg font-bold hover:bg-brand-primary-hover transition-colors"
            >
              إتمام الطلب
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
