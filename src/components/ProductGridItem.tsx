import React from 'react';
import { Part, Shop } from '../types';
import { Heart, Star, ShoppingBag, BadgeCheck, MoreVertical } from 'lucide-react';
import { CAR_LOGOS } from '../utils/carData';
import { useCart } from '../contexts/CartContext';

interface ProductGridItemProps {
  key?: React.Key;
  part: Part & { shop?: Shop };
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClick: (part: Part) => void;
  layout?: 'grid' | 'list';
}

export function ProductGridItem({ part, isSaved, onToggleSave, onClick, layout = 'grid' }: ProductGridItemProps) {
  const carLogo = part.carMake ? CAR_LOGOS[part.carMake] : null;
  const { addToCart } = useCart();

  const isList = layout === 'list';

  return (
    <div 
      className={`group flex h-full cursor-pointer bg-white md:bg-transparent rounded-xl md:rounded-none transition-all ${
        isList 
          ? 'flex-row md:flex-col p-3 md:p-0 border-b border-gray-100 md:border-none gap-4 md:gap-0' 
          : 'flex-col p-0 border-none gap-0'
      }`} 
      onClick={() => onClick(part)}
    >
      {/* Image Container - Flat gray background, rounded corners, no borders */}
      <div className={`relative bg-[#f5f5f5] overflow-hidden shrink-0 ${
        isList 
          ? 'w-28 h-28 md:w-full md:h-auto md:aspect-square rounded-xl md:rounded-2xl md:mb-3' 
          : 'w-full aspect-square rounded-2xl mb-3'
      }`}>
        {part.imageUrls && part.imageUrls.length > 0 ? (
          <img 
            src={part.imageUrls[0]} 
            alt={part.partName} 
            className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" 
            referrerPolicy="no-referrer"
          />
        ) : carLogo ? (
          <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
            <img 
              src={carLogo} 
              alt={part.carMake} 
              className="w-full h-full object-contain opacity-20 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 opacity-50 text-gray-300"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 font-medium text-xs md:text-sm">لا توجد صورة</span>
          </div>
        )}
        
        {/* Favorite Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSave(part.id); }} 
          className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white rounded-full text-gray-600 hover:text-red-500 shadow-sm transition-colors z-10"
          aria-label="حفظ في المفضلة"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
        </button>
      </div>

      {/* Content - No borders, just text on background */}
      <div className={`flex flex-col flex-grow px-1 ${isList ? 'py-1 md:py-0 justify-between md:justify-start' : ''}`}>
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-gray-900 text-sm md:text-base line-clamp-2 hover:underline">
              {part.partName}
            </h3>
            <button className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className={`text-xs text-gray-500 ${isList ? 'mb-1 md:mb-2' : 'mb-2'}`}>
            <div className="truncate">{part.carMake} {part.carModel}</div>
            <div className="truncate">{part.condition === 'new' ? 'جديد' : 'مستعمل'}</div>
          </div>
        </div>

        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-gray-900 text-lg md:text-xl">${part.price}</span>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 max-w-[120px]">
              <span className="text-[10px] md:text-xs text-gray-500 truncate">
                {part.shop?.name || 'محل غير معروف'}
              </span>
              {part.shop?.isVerified && (
                <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" />
              )}
            </div>
            {part.shop?.rating && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-[10px] md:text-xs font-medium text-gray-700">{part.shop.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
