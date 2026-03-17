import React from 'react';
import { Part, Shop } from '../types';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { CAR_LOGOS } from '../utils/carData';
import { useCart } from '../contexts/CartContext';

interface ProductGridItemProps {
  key?: React.Key;
  part: Part & { shop?: Shop };
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClick: (part: Part) => void;
}

export function ProductGridItem({ part, isSaved, onToggleSave, onClick }: ProductGridItemProps) {
  const carLogo = part.carMake ? CAR_LOGOS[part.carMake] : null;
  const { addToCart } = useCart();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col h-full">
      {/* Image Container */}
      <div 
        className="relative aspect-square bg-brand-bg overflow-hidden cursor-pointer"
        onClick={() => onClick(part)}
      >
        {part.imageUrls && part.imageUrls.length > 0 ? (
          <img 
            src={part.imageUrls[0]} 
            alt={part.partName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : carLogo ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-8">
            <img src={carLogo} alt={part.carMake} className="w-full h-full object-contain opacity-60 group-hover:scale-105 transition-transform duration-500" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-bg">
            <span className="text-brand-secondary font-medium">لا توجد صورة</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm ${part.condition === 'new' ? 'bg-brand-primary' : 'bg-orange-500'}`}>
            {part.condition === 'new' ? 'جديد' : 'مستعمل'}
          </span>
        </div>

        {/* Favorite Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSave(part.id); }} 
          className="absolute top-2 left-2 w-11 h-11 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full text-brand-secondary hover:text-red-500 shadow-sm transition-colors z-10"
          aria-label="حفظ في المفضلة"
        >
          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current text-red-500' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 
            className="font-bold text-brand-dark text-lg line-clamp-2 cursor-pointer hover:text-brand-primary transition-colors"
            onClick={() => onClick(part)}
          >
            {part.partName}
          </h3>
        </div>

        <div className="text-sm text-brand-secondary mb-3 flex-grow">
          {part.carMake} {part.carModel} {part.year}
        </div>

        {/* Shop & Rating */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-brand-dark truncate max-w-[120px]">
            {part.shop?.name || 'محل غير معروف'}
          </span>
          {part.shop?.rating && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
              <span className="text-xs font-bold text-brand-dark">{part.shop.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Price & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto pt-4 border-t border-brand-border">
          <div className="flex flex-col">
            <span className="text-xs text-brand-secondary">السعر</span>
            <span className="text-lg sm:text-xl font-bold text-brand-primary">${part.price}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); onClick(part); }}
              className="flex-1 sm:flex-none bg-brand-bg text-brand-dark hover:bg-brand-primary hover:text-white px-2 sm:px-3 min-h-[44px] rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
            >
              التفاصيل
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); addToCart(part); }}
              className="flex-1 sm:flex-none bg-brand-primary text-white hover:bg-brand-primary-hover px-2 sm:px-3 min-h-[44px] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <ShoppingBag className="w-4 h-4" />
              أضف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
