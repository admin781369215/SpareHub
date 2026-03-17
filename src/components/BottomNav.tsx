import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, ShoppingCart, User, Bell, LogOut, Store, X, Settings, Heart } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCart } from '../contexts/CartContext';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification } from '../types';
import { useScrollDirection } from '../hooks/useScrollDirection';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, dbUser, signIn, logout } = useAuth();
  const { items } = useCart();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { scrollDirection, isAtTop } = useScrollDirection();

  // Only show for customers or logged out users
  if (user && (dbUser?.role === 'shop_owner' || dbUser?.role === 'admin')) return null;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      
      // Sort by date descending
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.search.includes('tab=wishlist');
    return location.pathname === path;
  };

  const openCart = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-cart'));
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
  };

  const isHidden = scrollDirection === 'down' && !isAtTop && !isAccountMenuOpen && !isNotificationsOpen;

  return (
    <>
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border pb-[env(safe-area-inset-bottom)] z-40 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-transform duration-300 ${isHidden ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex justify-around items-center h-16">
          <Link 
            to="/" 
            onClick={() => setIsAccountMenuOpen(false)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-brand-primary' : 'text-brand-secondary'}`}
          >
            <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </Link>
          
          <Link 
            to="/my-requests" 
            onClick={() => setIsAccountMenuOpen(false)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/my-requests') ? 'text-brand-primary' : 'text-brand-secondary'}`}
          >
            <ClipboardList className={`w-6 h-6 ${isActive('/my-requests') ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">طلباتي</span>
          </Link>
          
          <button 
            onClick={(e) => {
              setIsAccountMenuOpen(false);
              openCart(e);
            }}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-brand-secondary relative"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-sm">
                  {items.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">السلة</span>
          </button>
          
          <button 
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isAccountMenuOpen ? 'text-brand-primary' : 'text-brand-secondary'} relative`}
          >
            <div className="relative">
              <User className={`w-6 h-6 ${isAccountMenuOpen ? 'fill-current' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">حسابي</span>
          </button>
        </div>
      </div>

      {/* Account Bottom Sheet */}
      {isAccountMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
            onClick={() => setIsAccountMenuOpen(false)}
          />
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white rounded-t-2xl z-50 md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transform transition-transform duration-300 ease-out">
            <div className="p-4">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              
              {!user ? (
                <div className="text-center pb-6">
                  <div className="h-16 w-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-brand-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-dark mb-2">مرحباً بك في سبيرهب</h3>
                  <p className="text-sm text-brand-secondary mb-6">سجل دخولك لمتابعة طلباتك ومشترياتك</p>
                  <button 
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      signIn();
                    }}
                    className="w-full bg-brand-primary text-brand-dark font-bold py-3 min-h-[44px] rounded-xl hover:bg-brand-primary-hover transition-colors"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </button>
                </div>
              ) : isNotificationsOpen ? (
                <div className="pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-brand-secondary hover:text-brand-dark min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <h3 className="text-lg font-bold text-brand-dark">الإشعارات</h3>
                    {unreadCount > 0 ? (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-brand-primary font-medium"
                      >
                        تحديد الكل كمقروء
                      </button>
                    ) : <div className="w-6" />}
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto -mx-4 px-4">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-500 text-sm">
                        لا توجد إشعارات
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`py-3 border-b border-gray-50 cursor-pointer ${!notif.read ? 'bg-blue-50/30 -mx-4 px-4' : ''}`}
                          onClick={() => {
                            if (!notif.read) markAsRead(notif.id);
                            setIsAccountMenuOpen(false);
                            setIsNotificationsOpen(false);
                            if (notif.type === 'request_response') {
                              navigate('/my-requests');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {notif.title}
                            </h4>
                            {!notif.read && <span className="w-2 h-2 bg-brand-primary rounded-full mt-1.5 shrink-0"></span>}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {new Date(notif.createdAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="pb-4">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div className="h-12 w-12 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-brand-dark">{dbUser?.displayName || user.email?.split('@')[0]}</div>
                      <div className="text-sm text-brand-secondary">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => setIsNotificationsOpen(true)}
                      className="w-full flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-brand-dark">
                        <Bell className="w-5 h-5 text-brand-secondary" />
                        <span className="font-medium">الإشعارات</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    
                    <Link 
                      to="/my-orders"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl hover:bg-gray-50 transition-colors text-brand-dark"
                    >
                      <ClipboardList className="w-5 h-5 text-brand-secondary" />
                      <span className="font-medium">سجل الطلبات</span>
                    </Link>
                    
                    <Link 
                      to="/?tab=wishlist"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl hover:bg-gray-50 transition-colors text-brand-dark"
                    >
                      <Heart className="w-5 h-5 text-brand-secondary" />
                      <span className="font-medium">المفضلة</span>
                    </Link>

                    <Link 
                      to="/register-shop"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl hover:bg-gray-50 transition-colors text-brand-dark"
                    >
                      <Store className="w-5 h-5 text-brand-secondary" />
                      <span className="font-medium">سجل متجرك</span>
                    </Link>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">تسجيل خروج</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
