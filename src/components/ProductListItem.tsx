import React from 'react';
import { Part, Shop } from '../types';
import { Heart, Phone, MapPin, Package, Store, Eye, Car } from 'lucide-react';
import { CAR_LOGOS } from '../utils/carData';

interface ProductListItemProps {
  key?: React.Key;
  part: Part & { shop?: Shop };
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onImageClick: (part: Part) => void;
}

export function ProductListItem({ part, isSaved, onToggleSave, onImageClick }: ProductListItemProps) {
  const carLogo = part.carMake ? CAR_LOGOS[part.carMake] : null;

  return (
    <div 
      className="flex flex-col bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => onImageClick(part)}
    >
      <div className="flex flex-row-reverse p-3 gap-3">
        {/* Image Section (Left) */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-brand-bg rounded-lg overflow-hidden">
          {part.imageUrls && part.imageUrls.length > 0 ? (
            <img src={part.imageUrls[0]} alt={part.partName} className="w-full h-full object-cover" />
          ) : carLogo ? (
            <div className="w-full h-full flex items-center justify-center bg-white p-4">
               <img src={carLogo} alt={part.carMake} className="w-full h-full object-contain opacity-60" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
               <Package className="w-8 h-8 opacity-50" />
            </div>
          )}
          
          {/* Favorite Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSave(part.id); }} 
            className="absolute top-1.5 left-1.5 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-colors"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
          </button>

          {/* Condition Badge */}
          <div className={`absolute bottom-0 right-0 text-[10px] px-2 py-0.5 rounded-tl-lg font-bold text-white ${
            part.condition === 'new' ? 'bg-brand-primary' : 'bg-orange-500'
          }`}>
             {part.condition === 'new' ? 'جديد' : 'مستعمل'}
          </div>
        </div>

        {/* Content Section (Right) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-start">
           <div>
             <h3 className="text-sm sm:text-base font-bold text-brand-dark line-clamp-2 leading-tight">
               {part.partName}
             </h3>
             <div className="text-lg font-bold text-brand-primary mt-1">
               ${part.price.toFixed(2)}
             </div>
             
             {/* Car Details with Logo */}
             <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-secondary">
               {[part.carMake, part.carModel, part.year].filter(Boolean).length > 0 && (
                 <span className="flex items-center gap-1.5 bg-brand-bg px-2 py-1 rounded-md border border-brand-border">
                   {carLogo ? (
                     <img src={carLogo} alt={part.carMake} className="w-4 h-4 object-contain" />
                   ) : (
                     <Car className="w-3.5 h-3.5 text-gray-400" />
                   )}
                   <span className="font-medium text-brand-dark">
                     {[part.carMake, part.carModel, part.year].filter(Boolean).join(' ')}
                   </span>
                 </span>
               )}
               {part.partNumber && (
                 <span className="font-mono text-gray-400 flex items-center">#{part.partNumber}</span>
               )}
             </div>
           </div>
           
           <div className="mt-2">
             {part.shop && (
               <div className="flex flex-col gap-0.5 mb-1.5">
                 <div className="flex items-center gap-1 text-xs text-brand-secondary">
                   <Store className="w-3.5 h-3.5 text-gray-400" />
                   <span className="truncate">{part.shop.name}</span>
                 </div>
                 <div className="flex items-center gap-1 text-xs text-brand-secondary">
                   <MapPin className="w-3.5 h-3.5 text-gray-400" />
                   <span className="truncate">{part.shop.city}</span>
                 </div>
               </div>
             )}
             
             <div className="flex items-center gap-2">
               <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${part.quantity > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                 {part.quantity > 0 ? 'متوفر' : 'نفذت الكمية'}
               </span>
               {part.quantity > 0 && (
                 <span className="text-[10px] text-brand-secondary">
                   الكمية: {part.quantity}
                 </span>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex border-t border-gray-100 p-2 gap-2 bg-brand-bg">
        {part.shop?.phone && (
          <a 
            href={`tel:${part.shop.phone}`} 
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-primary/10 text-brand-primary py-2 rounded-lg text-sm font-bold hover:bg-brand-primary/20 transition-colors"
          >
            <Phone className="w-4 h-4" />
            اتصال
          </a>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onImageClick(part); }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-brand-border text-brand-dark py-2 rounded-lg text-sm font-bold hover:bg-brand-bg transition-colors"
        >
          <Eye className="w-4 h-4 text-brand-secondary" />
          التفاصيل
        </button>
      </div>
    </div>
  );
}
