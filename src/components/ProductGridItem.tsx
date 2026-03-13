import React from 'react';
import { Part, Shop } from '../types';
import { Heart, Star } from 'lucide-react';
import { CAR_LOGOS } from '../utils/carData';

interface ProductGridItemProps {
  key?: React.Key;
  part: Part & { shop?: Shop };
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClick: (part: Part) => void;
}

export function ProductGridItem({ part, isSaved, onToggleSave, onClick }: ProductGridItemProps) {
  const carLogo = part.carMake ? CAR_LOGOS[part.carMake] : null;

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
          className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-brand-secondary hover:text-red-500 shadow-sm transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
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
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-border">
          <div className="flex flex-col">
            <span className="text-xs text-brand-secondary">السعر</span>
            <span className="text-xl font-bold text-brand-primary">${part.price}</span>
          </div>
          <button 
            onClick={() => onClick(part)}
            className="bg-brand-bg text-brand-dark hover:bg-brand-primary hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            التفاصيل
          </button>
        </div>
      </div>
    </div>
  );
}
