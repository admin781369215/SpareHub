import React, { useState } from 'react';
import { Part, Shop } from '../types';
import { X, Heart, ShoppingBag, Star, MapPin, Phone, Shield, ChevronRight, ChevronLeft, Info, Package } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { CAR_LOGOS } from '../utils/carData';
import { MapModal } from './MapModal';

interface ProductDetailsModalProps {
  part: Part & { shop?: Shop };
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
}

export function ProductDetailsModal({ part, isOpen, onClose, isSaved, onToggleSave }: ProductDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { addToCart } = useCart();
  const carLogo = part.carMake ? CAR_LOGOS[part.carMake] : null;

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery */}
        <div className="w-full md:w-1/2 bg-gray-50 relative flex flex-col">
          <div className="relative flex-grow flex items-center justify-center min-h-[300px] md:min-h-full p-4">
            {part.imageUrls && part.imageUrls.length > 0 ? (
              <>
                <img 
                  src={part.imageUrls[currentImageIndex]} 
                  alt={part.partName} 
                  className="max-w-full max-h-[400px] md:max-h-[600px] object-contain rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
                
                {part.imageUrls.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev === 0 ? part.imageUrls!.length - 1 : prev - 1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md hover:bg-white text-brand-dark transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev === part.imageUrls!.length - 1 ? 0 : prev + 1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-md hover:bg-white text-brand-dark transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : carLogo ? (
              <img 
                src={carLogo} 
                alt={part.carMake} 
                className="max-w-[60%] max-h-[60%] object-contain opacity-20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Package className="w-16 h-16 mb-2 opacity-50" />
                <span>لا توجد صورة</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className={`text-sm font-bold px-3 py-1 rounded-full text-white shadow-sm ${part.condition === 'new' ? 'bg-brand-primary' : 'bg-orange-500'}`}>
                {part.condition === 'new' ? 'جديد' : 'مستعمل'}
              </span>
            </div>
          </div>

          {/* Thumbnails */}
          {part.imageUrls && part.imageUrls.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto hide-scrollbar bg-white border-t border-gray-100">
              {part.imageUrls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === idx ? 'border-brand-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-full md:w-1/2 flex flex-col max-h-[50vh] md:max-h-full overflow-y-auto bg-white">
          <div className="p-6 md:p-8 flex-grow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-2">{part.partName}</h2>
                <div className="flex items-center gap-2 text-brand-secondary font-medium">
                  {carLogo && <img src={carLogo} alt={part.carMake} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />}
                  <span>{part.carMake} {part.carModel} {part.year}</span>
                </div>
              </div>
              <button 
                onClick={() => onToggleSave(part.id)} 
                className={`p-3 rounded-full transition-colors ${isSaved ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
              >
                <Heart className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="mb-8">
              <span className="text-sm text-brand-secondary block mb-1">السعر</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-brand-primary">${part.price}</span>
                <span className="text-gray-500 text-sm">شامل الضريبة</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Description */}
              {part.description && (
                <div>
                  <h3 className="text-lg font-bold text-brand-dark mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-brand-primary" />
                    الوصف
                  </h3>
                  <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">
                    {part.description}
                  </p>
                </div>
              )}

              {/* Shop Info */}
              {part.shop && (
                <div>
                  <h3 className="text-lg font-bold text-brand-dark mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-primary" />
                    معلومات البائع
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-brand-dark text-lg">{part.shop.name}</h4>
                        {part.shop.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-bold text-sm">{part.shop.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2 text-sm text-gray-600">
                        {(part.shop.location || part.shop.city) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-secondary" />
                            <span>{part.shop.location || part.shop.city}</span>
                          </div>
                        )}
                        {part.shop.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-brand-secondary" />
                            <span dir="ltr">{part.shop.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        {part.shop.phone && (
                          <a 
                            href={`tel:${part.shop.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg font-bold text-sm transition-colors border border-green-100"
                          >
                            <Phone className="w-4 h-4" />
                            اتصال
                          </a>
                        )}
                        {(part.shop.latitude && part.shop.longitude) || part.shop.location || part.shop.city ? (
                          <button 
                            onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg font-bold text-sm transition-colors border border-blue-100"
                          >
                            <MapPin className="w-4 h-4" />
                            الخريطة
                          </button>
                        ) : null}
                      </div>
                      
                      {/* Shop Images */}
                      {part.shop.imageUrls && part.shop.imageUrls.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-bold text-gray-700 mb-3">صور المتجر</h4>
                          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                            {part.shop.imageUrls.map((url, idx) => (
                              <img 
                                key={idx} 
                                src={url} 
                                alt={`صورة المتجر ${idx + 1}`} 
                                className="h-24 w-32 object-cover rounded-lg flex-shrink-0 snap-center border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 md:p-6 border-t border-gray-100 bg-white sticky bottom-0">
            <button 
              onClick={() => {
                addToCart(part);
                onClose();
              }}
              className="w-full bg-brand-primary text-white hover:bg-brand-primary-hover py-4 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-6 h-6" />
              أضف إلى السلة
            </button>
          </div>
        </div>
      </div>
    </div>
    
    {part.shop && (
      <MapModal 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        shopName={part.shop.name}
        latitude={part.shop.latitude}
        longitude={part.shop.longitude}
        location={part.shop.location || part.shop.city}
      />
    )}
    </>
  );
}
