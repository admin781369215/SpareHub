import React from 'react';
import { X, ExternalLink, MapPin } from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export function MapModal({ isOpen, onClose, shopName, latitude, longitude, location }: MapModalProps) {
  if (!isOpen) return null;

  const hasCoordinates = latitude && longitude;
  const query = hasCoordinates ? `${latitude},${longitude}` : location;
  
  if (!query) return null;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=ar&z=15&output=embed`;
  const externalUrl = `https://maps.google.com/?q=${encodeURIComponent(query)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-bold text-brand-dark">موقع {shopName}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-full h-[60vh] bg-gray-100 relative">
          <iframe 
            src={embedUrl}
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title={`خريطة ${shopName}`}
          ></iframe>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <a 
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-blue-100"
          >
            <ExternalLink className="w-4 h-4" />
            فتح في تطبيق خرائط جوجل
          </a>
        </div>
      </div>
    </div>
  );
}
