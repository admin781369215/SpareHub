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
    condition: part.condition || 'new'
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(part.imageUrls || []);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url));
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

      await updateDoc(doc(db, 'parts', part.id), {
        ...formData,
        imageUrls: newImageUrls
      });
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
