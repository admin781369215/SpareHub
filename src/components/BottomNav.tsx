import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { user, dbUser } = useAuth();
  
  // Only show for customers or logged out users
  if (user && dbUser?.role === 'shop_owner') return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.search.includes('tab=wishlist');
    if (path === '/wishlist') return location.pathname === '/' && location.search.includes('tab=wishlist');
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border pb-safe z-50 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-brand-primary' : 'text-brand-secondary'}`}
        >
          <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">الرئيسية</span>
        </Link>
        
        <Link 
          to="/?tab=wishlist" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/wishlist') ? 'text-brand-primary' : 'text-brand-secondary'}`}
        >
          <Heart className={`w-6 h-6 ${isActive('/wishlist') ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">المفضلة</span>
        </Link>
        
        <Link 
          to="/my-requests" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/my-requests') ? 'text-brand-primary' : 'text-brand-secondary'}`}
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-[10px] font-medium">طلباتي</span>
        </Link>
        
        {/* Profile link could go to a profile page, or just open the menu. For now, let's link to a profile placeholder or keep it simple */}
        <div className="flex flex-col items-center justify-center w-full h-full space-y-1 text-brand-secondary">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">حسابي</span>
        </div>
      </div>
    </div>
  );
}
