import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { LogOut, User as UserIcon, Settings, Wrench, Store, ClipboardList, Menu, Search, Heart, ShoppingCart, ShieldCheck, Phone, Mail } from 'lucide-react';

export function Header() {
  const { user, dbUser, signIn, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('q') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/`);
    }
  };

  return (
    <header className="bg-brand-dark border-b border-brand-dark sticky top-0 z-50">
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
        <div className="flex justify-between h-20 items-center gap-4 md:gap-8">
          {/* Logo */}
          <div className="flex items-center shrink-0">
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
          <div className="flex-1 max-w-2xl hidden md:flex">
            <form onSubmit={handleSearch} className="w-full relative flex">
              <input 
                type="text" 
                placeholder="ابحث برقم القطعة أو اسمها..." 
                className="w-full pl-12 pr-4 py-2.5 rounded-r-lg border-none focus:ring-2 focus:ring-brand-primary text-brand-dark bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="bg-brand-primary text-brand-dark px-6 rounded-l-lg font-bold hover:bg-brand-primary-hover transition-colors flex items-center justify-center">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Icons */}
          <div className="hidden md:flex items-center gap-6">
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
                  {dbUser?.role === 'shop_owner' ? (
                    <Link to="/shop" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">لوحة التحكم</Link>
                  ) : (
                    <Link to="/register-shop" className="block px-4 py-2 text-sm text-brand-dark hover:bg-brand-bg">سجل متجرك</Link>
                  )}
                  <button onClick={logout} className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50">تسجيل خروج</button>
                </div>
              </div>
            ) : (
              <button onClick={signIn} className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors">
                <UserIcon className="h-6 w-6" />
                <div className="hidden lg:block text-right">
                  <div className="text-xs text-brand-secondary">تسجيل الدخول</div>
                  <div className="text-sm font-bold">حسابي</div>
                </div>
              </button>
            )}

            {/* Favorites */}
            <Link to="/?tab=wishlist" className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors relative">
              <Heart className="h-6 w-6" />
              <div className="hidden lg:block text-right">
                <div className="text-xs text-brand-secondary">المفضلة</div>
                <div className="text-sm font-bold">قائمتي</div>
              </div>
            </Link>

            {/* Cart / Requests */}
            <Link to="/my-requests" className="flex items-center gap-2 text-white hover:text-brand-primary transition-colors relative">
              <ShoppingCart className="h-6 w-6" />
              <div className="hidden lg:block text-right">
                <div className="text-xs text-brand-secondary">الطلبات</div>
                <div className="text-sm font-bold">سلتي</div>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-white hover:bg-brand-secondary/20"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-brand-border hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-8 h-12">
            <Link to="/" className="text-brand-dark font-bold hover:text-brand-primary transition-colors border-b-2 border-brand-primary h-full flex items-center">الصفحة الرئيسية</Link>
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
          <form onSubmit={handleSearch} className="w-full relative flex mb-4">
            <input 
              type="text" 
              placeholder="ابحث برقم القطعة أو اسمها..." 
              className="w-full pl-12 pr-4 py-2.5 rounded-r-lg border-none focus:ring-2 focus:ring-brand-primary text-brand-dark bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-brand-primary text-brand-dark px-4 rounded-l-lg font-bold hover:bg-brand-primary-hover transition-colors flex items-center justify-center">
              <Search className="w-5 h-5" />
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
              
              {dbUser?.role === 'customer' && (
                <Link to="/my-requests" className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-secondary/20 text-white">
                  <ClipboardList className="h-5 w-5 text-brand-primary" />
                  <span>طلباتي</span>
                </Link>
              )}

              {dbUser?.role === 'shop_owner' ? (
                <Link to="/shop" className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-secondary/20 text-white">
                  <Settings className="h-5 w-5 text-brand-primary" />
                  <span>لوحة التحكم</span>
                </Link>
              ) : (
                <Link to="/register-shop" className="flex items-center gap-3 p-3 rounded-lg hover:bg-brand-secondary/20 text-white">
                  <Store className="h-5 w-5 text-brand-primary" />
                  <span>سجل متجرك</span>
                </Link>
              )}

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
