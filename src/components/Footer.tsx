import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-300 pt-16 pb-8 border-t border-brand-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl font-bold tracking-tight text-white">
                سبير<span className="text-brand-primary">هب</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6 text-gray-400">
              المنصة الأولى في المملكة لبيع وشراء قطع غيار السيارات. نوفر لك أفضل القطع بأسعار تنافسية مع ضمان الجودة وسرعة التوصيل.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-brand-primary transition-colors text-sm inline-flex items-center min-h-[44px]">الرئيسية</Link></li>
              <li><Link to="/about" className="hover:text-brand-primary transition-colors text-sm inline-flex items-center min-h-[44px]">من نحن</Link></li>
              <li><Link to="/terms" className="hover:text-brand-primary transition-colors text-sm inline-flex items-center min-h-[44px]">الشروط والأحكام</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-primary transition-colors text-sm inline-flex items-center min-h-[44px]">سياسة الخصوصية</Link></li>
              <li><Link to="/contact" className="hover:text-brand-primary transition-colors text-sm inline-flex items-center min-h-[44px]">اتصل بنا</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">تواصل معنا</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">المملكة العربية السعودية، الرياض، شارع التحلية</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand-primary flex-shrink-0" />
                <span className="text-sm" dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-primary flex-shrink-0" />
                <span className="text-sm">support@sparehub.com</span>
              </li>
            </ul>
          </div>

          {/* App Download */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">حمل التطبيق</h3>
            <p className="text-sm mb-4 text-gray-400">احصل على تجربة تسوق أفضل من خلال تطبيقنا</p>
            <div className="flex flex-col gap-3">
              <a href="#" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center gap-3 transition-colors">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" />
              </a>
              <a href="#" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 flex items-center gap-3 transition-colors">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} سبيرهب
          </p>
          
          {/* Payment Methods */}
          <div className="flex items-center gap-2">
            <div className="bg-white rounded px-2 py-1 h-8 flex items-center justify-center">
              <span className="text-brand-dark font-bold text-xs">VISA</span>
            </div>
            <div className="bg-white rounded px-2 py-1 h-8 flex items-center justify-center">
              <span className="text-brand-dark font-bold text-xs">MasterCard</span>
            </div>
            <div className="bg-white rounded px-2 py-1 h-8 flex items-center justify-center">
              <span className="text-brand-dark font-bold text-xs">mada</span>
            </div>
            <div className="bg-white rounded px-2 py-1 h-8 flex items-center justify-center">
              <span className="text-brand-dark font-bold text-xs">Apple Pay</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
