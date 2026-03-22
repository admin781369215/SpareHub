import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Store, MapPin, Phone, Building, Globe } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { ARAB_COUNTRIES } from '../utils/countries';

export function ShopRegistration() {
  const { user, updateRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    country: 'SA',
    city: '',
    location: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create shop document
      await addDoc(collection(db, 'shops'), {
        ...formData,
        ownerUid: user.uid,
        rating: 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update user role to shop_owner
      await updateRole('shop_owner');
      
      navigate('/shop');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shops');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Store className="h-12 w-12 text-brand-primary" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-dark">
          سجل محلك التجاري
        </h2>
        <p className="mt-2 text-center text-sm text-brand-secondary">
          انضم إلى SpareHub وابدأ ببيع قطع الغيار لآلاف العملاء.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-dark">
                اسم المحل *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-brand-dark">
                رقم الهاتف *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  required
                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border text-end"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-brand-dark">
                الدولة *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="country"
                  name="country"
                  required
                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border appearance-none"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  {ARAB_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-brand-dark">
                المدينة *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  className="focus:ring-brand-primary focus:border-brand-primary block w-full ps-10 sm:text-sm border-brand-border rounded-md py-2 border"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                العنوان بالتفصيل
              </label>
              <div className="mt-1">
                <textarea
                  id="location"
                  name="location"
                  rows={3}
                  className="shadow-sm focus:ring-brand-primary focus:border-brand-primary block w-full sm:text-sm border border-brand-border rounded-md p-2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-4 min-h-[44px] border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition-colors"
              >
                {loading ? 'جاري التسجيل...' : 'تسجيل المحل'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
