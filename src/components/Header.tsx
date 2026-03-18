import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../contexts/CartContext';
import { LogOut, User as UserIcon, Settings, Wrench, Store, ClipboardList, Menu, Search, Heart, ShoppingCart, ShieldCheck, Phone, Mail, Bell, CheckCircle, Camera } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification } from '../types';
import { useScrollDirection } from '../hooks/useScrollDirection';

export function Header() {
  const { user, dbUser, signIn, logout } = useAuth();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const { scrollDirection, isAtTop } = useScrollDirection();
  
  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const qNotifications = query(notificationsRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(qNotifications, (snapshot) => {
      const notifsData: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifsData.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      notifsData.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(notifsData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/`);
    }
  };

  const isHidden = scrollDirection === 'down' && !isAtTop && !isMenuOpen && !showNotifications;

  return (
    <header className={`bg-brand-dark border-b border-brand-dark sticky top-0 z-50 transition-transform duration-300 ${isHidden ? 'md:-translate-y-full' : 'translate-y-0'}`}>
      {/* Top Bar */}
      <div className="bg-brand-dark text-brand-secondary text-xs py-1.5 border-b border-white/10 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> دفع آمن 100%</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +966 50 000 0000</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> support@sparehub.com</span>
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-transparent border-none text-brand-secondary outline-none cursor-pointer">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
            <select className="bg-transparent border-none text-brand-secondary outline-none cursor-pointer">
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between h-20 items-center gap-4 md:gap-8 ${(!user || dbUser?.role === 'customer') ? 'hidden md:flex' : ''}`}>
          {/* Logo */}
          <div className={`flex items-center shrink-0 transition-all duration-300 ${(!user || dbUser?.role === 'customer') && !isAtTop ? 'md:flex hidden' : 'flex'}`}>
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white p-1 rounded-xl group-hover:bg-brand-bg transition-colors shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden w-10 h-10 md:w-12 md:h-12">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <Wrench className="h-5 w-5 md:h-6 md:w-6 text-brand-primary hidden" />
              </div>
              <span className="text-xl md:text-2xl font-bold tracking-tight text-white group-hover:text-brand-primary transition-colors">
                سبير<span className="text-brand-primary">هب</span>
              </span>
            </Link>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="flex-1 max-w-2xl hidden md:flex mx-8">
            <form onSubmit={handleSearch} className="w-full relative flex items-center bg-[#222] rounded-full shadow-sm overflow-hidden p-1 border border-white/10 focus-within:ring-1 focus-within:ring-white/30 transition-all">
              <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
              <input 
                type="text" 
                placeholder="ابحث برقم القطعة أو اسمها..." 
                className="w-full px-3 py-2.5 bg-transparent border-none focus:outline-none focus:ring-0 text-white placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" className="p-3 text-gray-400 hover:text-white shrink-0">
                <Camera className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Icons */}
          <div className="hidden md:flex items-center gap-6">
            {/* Notifications */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-white hover:text-brand-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">الإشعارات</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-brand-primary hover:underline"
                        >
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500 text-sm">
                          لا توجد إشعارات
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/50' : ''}`}
                            onClick={() => {
                              if (!notif.read) markAsRead(notif.id);
                              setShowNotifications(false);
                              if (notif.type === 'request_response') {
                                navigate(dbUser?.role === 'shop_owner' ? '/shop' : '/my-requests');
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
                )}
              </div>
            )}

            {/* User */}
            {user ? (
              <div className="relative group cursor-pointer flex items-center gap-2">
                <div className="h-10 w-10 bg-brand-secondary/20 rounded-full flex items-center justify-center text-white">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="hidden lg:block text-right">
                  <div className="text-xs text-brand-secondary">مرحباً</div>
                  <div className="text-sm font-bold text-white truncate max-w-[100px]">{dbUser?.displayName || user.email?.split('@')[0]}</div>
                </div>
                {/* Dropdown */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block z-50">
                  {dbUser?.role === 'admin' ? (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">لوحة الإدارة العليا</Link>
                  ) : dbUser?.role === 'shop_owner' ? (
                    <Link to="/shop" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">لوحة التحكم</Link>
                  ) : (
                    <>
                      <Link to="/my-requests" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">طلباتي</Link>
                      <Link to="/my-orders" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">سجل الطلبات</Link>
                      <Link to="/register-shop" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">سجل متجرك</Link>
                    </>
                  )}
                  <button onClick={logout} className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50">تسجيل خروج</button>
                </div>
              </div>
            ) : (
              <button onClick={signIn} className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors min-h-[44px] min-w-[44px]">
                <UserIcon className="h-6 w-6" />
                <div className="hidden lg:block text-right">
                  <div className="text-xs text-brand-secondary">تسجيل الدخول</div>
                  <div className="text-sm font-bold">حسابي</div>
                </div>
              </button>
            )}

            {/* Favorites */}
            <Link to="/?tab=wishlist" className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors relative min-h-[44px] min-w-[44px]">
              <Heart className="h-6 w-6" />
              <div className="hidden lg:block text-right">
                <div className="text-xs text-brand-secondary">المفضلة</div>
                <div className="text-sm font-bold">قائمتي</div>
              </div>
            </Link>

            {/* Cart / Requests */}
            <Link to="/my-requests" className="flex items-center gap-3 text-white hover:text-brand-primary transition-colors relative min-h-[44px] min-w-[44px]">
              <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-primary text-brand-dark text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-brand-dark">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-right">
                <div className="text-xs text-brand-secondary">الطلبات</div>
                <div className="text-sm font-bold">سلتي</div>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          {(dbUser?.role === 'shop_owner' || dbUser?.role === 'admin') && (
            <div className="md:hidden flex items-center gap-4">
              {user && (
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setIsMenuOpen(false);
                  }}
                  className="relative text-white hover:text-brand-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setShowNotifications(false);
                }}
                className="p-2 rounded-lg text-white hover:bg-brand-secondary/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          )}

        </div>

        {/* Mobile Header (Customers/Guests) */}
        {(!user || dbUser?.role === 'customer') && (
          <div className={`md:hidden relative w-full transition-all duration-300 ${isAtTop ? 'h-[120px]' : 'h-[72px]'}`}>
            {/* Logo */}
            <div className={`absolute top-4 right-0 transition-all duration-300 origin-right ${isAtTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-90 pointer-events-none'}`}>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden w-10 h-10">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  سبير<span className="text-brand-primary">هب</span>
                </span>
              </Link>
            </div>

            {/* Cart Icon */}
            <div className="absolute top-4 left-0 z-10">
              <button onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))} className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white hover:bg-[#333] transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-primary text-brand-dark text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-brand-dark">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Search Bar */}
            <div className={`absolute transition-all duration-300 ${isAtTop ? 'top-[64px] left-0 right-0' : 'top-4 left-12 right-0'}`}>
              <form onSubmit={handleSearch} className="w-full relative flex items-center bg-[#222] rounded-full shadow-sm overflow-hidden p-1 border border-white/10 focus-within:ring-1 focus-within:ring-white/30 transition-all">
                <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                <input 
                  type="text" 
                  placeholder="ابحث برقم القطعة أو اسمها..." 
                  className="w-full px-2 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-white text-sm placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="button" className="p-2 text-gray-400 hover:text-white shrink-0">
                  <Camera className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Notifications Dropdown */}
      {showNotifications && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-xl z-50 border-b border-gray-100 max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
            <h3 className="font-bold text-gray-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-brand-primary hover:underline font-medium"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          <div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                لا توجد إشعارات
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    setShowNotifications(false);
                    if (notif.type === 'request_response') {
                      navigate(dbUser?.role === 'shop_owner' ? '/shop' : '/my-requests');
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
      )}

      {/* Navigation Bar */}
      <div className="bg-white border-b border-brand-border hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-8 h-12">
            <Link to="/" className="text-brand-dark font-bold hover:text-brand-primary transition-colors border-b-2 border-brand-primary h-full flex items-center">الصفحة الرئيسية</Link>
            {dbUser?.role === 'shop_owner' && (
              <Link to="/shop" className="text-brand-dark font-bold hover:text-brand-primary transition-colors h-full flex items-center">لوحة التحكم</Link>
            )}
            <Link to="/" className="text-brand-dark font-medium hover:text-brand-primary transition-colors h-full flex items-center">العلامات التجارية</Link>
            <Link to="/" className="text-brand-dark font-medium hover:text-brand-primary transition-colors h-full flex items-center">العروض</Link>
            <Link to="/" className="text-brand-dark font-medium hover:text-brand-primary transition-colors h-full flex items-center">المدونة</Link>
            <Link to="/" className="text-brand-dark font-medium hover:text-brand-primary transition-colors h-full flex items-center">تواصل معنا</Link>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-brand-secondary/20 bg-brand-dark p-4 space-y-3">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="w-full relative flex items-center bg-[#222] rounded-full shadow-sm overflow-hidden p-1 border border-white/10 focus-within:ring-1 focus-within:ring-white/30 transition-all mb-4">
            <Search className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            <input 
              type="text" 
              placeholder="ابحث برقم القطعة أو اسمها..." 
              className="w-full px-2 py-2 bg-transparent border-none focus:outline-none focus:ring-0 text-white text-sm placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="button" className="p-2 text-gray-400 hover:text-white shrink-0">
              <Camera className="w-5 h-5" />
            </button>
          </form>

          {user ? (
            <>
              <div className="flex items-center gap-3 pb-4 border-b border-brand-secondary/20">
                <div className="h-10 w-10 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-white">{dbUser?.displayName || user.email}</div>
                  <div className="text-xs text-brand-secondary">{dbUser?.role === 'shop_owner' ? 'تاجر' : 'عميل'}</div>
                </div>
              </div>
              
              {dbUser?.role === 'admin' ? (
                <Link to="/admin" className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-secondary/20 text-white">
                  <Settings className="h-5 w-5 text-brand-primary" />
                  <span>لوحة الإدارة العليا</span>
                </Link>
              ) : dbUser?.role === 'shop_owner' ? (
                <Link to="/shop" className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-secondary/20 text-white">
                  <Settings className="h-5 w-5 text-brand-primary" />
                  <span>لوحة التحكم</span>
                </Link>
              ) : null}

              <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 text-red-500">
                <LogOut className="h-5 w-5" />
                <span>تسجيل خروج</span>
              </button>
            </>
          ) : (
            <button onClick={signIn} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-brand-primary text-brand-dark font-bold">
              <UserIcon className="h-5 w-5" />
              تسجيل الدخول
            </button>
          )}
        </div>
      )}
    </header>
  );
}
