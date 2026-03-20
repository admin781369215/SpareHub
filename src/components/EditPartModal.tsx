import React, { useState } from 'react';
import { Part } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';
import { X, Tag, DollarSign, Package, Image as ImageIcon } from 'lucide-react';

interface EditPartModalProps {
  part: Part;
  onClose: () => void;
}

export function EditPartModal({ part, onClose }: EditPartModalProps) {
  const [formData, setFormData] = useState({
    partName: part.partName,
    price: part.price,
    quantity: part.quantity,
    condition: part.condition || 'new',
    location: part.location || '',
    shelf: part.shelf || ''
  });
  const [compatibleParts, setCompatibleParts] = useState<string[]>(part.compatibleParts || []);
  const [altInput, setAltInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(part.imageUrls || []);
  const [saving, setSaving] = useState(false);
  const [isSearchingAlternatives, setIsSearchingAlternatives] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url));
  };

  const handleAddAlternative = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = altInput.trim();
    if (trimmed && !compatibleParts.includes(trimmed)) {
      setCompatibleParts([...compatibleParts, trimmed]);
      setAltInput('');
    }
  };

  const removeAlternative = (alt: string) => {
    setCompatibleParts(compatibleParts.filter(p => p !== alt));
  };

  const handleFindAlternatives = async () => {
    if (!part.partNumber) return;
    setIsSearchingAlternatives(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockAlternatives = [`${part.partNumber}-ALT1`, `OEM-${part.partNumber}`];
      const newAlts = mockAlternatives.filter(alt => !compatibleParts.includes(alt));
      if (newAlts.length > 0) {
        setCompatibleParts([...compatibleParts, ...newAlts]);
      }
    } finally {
      setIsSearchingAlternatives(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let newImageUrls = [...existingImages];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const storageRef = ref(storage, `parts/${part.id}/${Date.now()}_${file.name}`);
          const uploadTask = await uploadBytesResumable(storageRef, file);
          const downloadURL = await getDownloadURL(uploadTask.ref);
          newImageUrls.push(downloadURL);
        }
      }

      const updateData: any = {
        ...formData,
        compatibleParts: compatibleParts,
        imageUrls: newImageUrls
      };

      if (!updateData.location) delete updateData.location;
      if (!updateData.shelf) delete updateData.shelf;
      if (!updateData.compatibleParts || updateData.compatibleParts.length === 0) delete updateData.compatibleParts;
      if (!updateData.carMake) delete updateData.carMake;
      if (!updateData.carModel) delete updateData.carModel;
      if (!updateData.manufacturer) delete updateData.manufacturer;

      await updateDoc(doc(db, 'parts', part.id), updateData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `parts/${part.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-brand-dark">تعديل القطعة: {part.partName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">اسم القطعة</label>
            <input
              type="text"
              required
              className="mt-1 block w-full border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              value={formData.partName}
              onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">السعر</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="block w-full ps-9 border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الكمية</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                  <Package className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  className="block w-full ps-9 border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">حالة القطعة</label>
            <select
              className="mt-1 block w-full border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as 'new' | 'used' })}
            >
              <option value="new">جديد</option>
              <option value="used">مستعمل</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">الموقع (القسم)</label>
              <input
                type="text"
                placeholder="مثال: قسم 3"
                className="mt-1 block w-full border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الرف</label>
              <input
                type="text"
                placeholder="مثال: رف أ"
                className="mt-1 block w-full border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">القطع البديلة المتوافقة</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                placeholder="أدخل رقم القطعة البديلة"
                className="block w-full border border-brand-border rounded-md py-2 px-3 shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlternative();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddAlternative}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
              >
                إضافة قطعة أخرى
              </button>
            </div>
            {compatibleParts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {compatibleParts.map((alt, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-bg text-brand-dark border border-brand-border">
                    {alt}
                    <button
                      type="button"
                      onClick={() => removeAlternative(alt)}
                      className="ms-1.5 inline-flex items-center justify-center text-brand-secondary hover:text-red-500 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleFindAlternatives}
              disabled={isSearchingAlternatives || !part.partNumber}
              className="mt-2 inline-flex items-center px-3 py-1.5 border border-brand-border shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50"
            >
              <Tag className="h-4 w-4 me-1.5 text-gray-400" />
              {isSearchingAlternatives ? 'جاري البحث...' : 'البحث عن بدائل (API)'}
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الصور</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {existingImages.map((url, index) => (
                <div key={index} className="relative rounded overflow-hidden">
                  <img src={url} alt="Part" className="h-24 w-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeExistingImage(url)} 
                    className="absolute top-0 right-0 bg-red-500/90 text-white rounded-bl-lg min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary-hover" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-white min-h-[44px] px-6 border border-brand-border rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-brand-bg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center items-center min-h-[44px] px-6 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
