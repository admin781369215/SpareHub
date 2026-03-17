import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
      // Show prompt if not previously dismissed
      if (!localStorage.getItem('pwa-prompt-dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isIosDevice && !isStandalone && !localStorage.getItem('pwa-prompt-dismissed')) {
      setShowPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    if (!promptInstall) return;
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setShowPrompt(false);
    });
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-in slide-in-from-bottom-5">
      <button 
        onClick={dismiss}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="bg-brand-primary/10 p-3 rounded-xl flex-shrink-0">
          <Download className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h3 className="font-bold text-brand-dark mb-1">تثبيت التطبيق</h3>
          <p className="text-sm text-brand-secondary mb-3">
            {isIOS 
              ? 'قم بتثبيت التطبيق على جهازك للوصول السريع. اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".'
              : 'قم بتثبيت التطبيق على جهازك لتجربة أسرع وأفضل.'}
          </p>
          
          {!isIOS && supportsPWA && (
            <button 
              onClick={onClick}
              className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-primary-hover transition-colors min-h-[44px]"
            >
              تثبيت الآن
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
