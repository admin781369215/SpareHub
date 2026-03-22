import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop, Review } from '../types';
import { Star, X, MessageSquare, User, Phone, MapPin, Globe } from 'lucide-react';
import { MapModal } from './MapModal';
import { ARAB_COUNTRIES } from '../utils/countries';

interface ShopProfileModalProps {
  shop: Shop;
  isOpen: boolean;
  onClose: () => void;
  canReview?: boolean;
}

export function ShopProfileModal({ shop, isOpen, onClose, canReview = true }: ShopProfileModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // New review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen, shop.id]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'reviews'), where('shopId', '==', shop.id));
      const snapshot = await getDocs(q);
      const reviewsData: Review[] = [];
      let userReviewed = false;
      
      snapshot.forEach((doc) => {
        const review = { id: doc.id, ...doc.data() } as Review;
        reviewsData.push(review);
        if (auth.currentUser && review.userId === auth.currentUser.uid) {
          userReviewed = true;
        }
      });
      
      reviewsData.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(reviewsData);
      setHasReviewed(userReviewed);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !comment.trim()) return;

    setSubmitting(true);
    try {
      const newReview: Omit<Review, 'id'> = {
        shopId: shop.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'مستخدم',
        rating,
        comment: comment.trim(),
        createdAt: Date.now()
      };

      // We use a transaction to safely update the shop's average rating
      await runTransaction(db, async (transaction) => {
        const shopRef = doc(db, 'shops', shop.id);
        const shopDoc = await transaction.get(shopRef);
        
        if (!shopDoc.exists()) {
          throw new Error("Shop does not exist!");
        }

        const shopData = shopDoc.data() as Shop;
        const currentCount = shopData.reviewCount || 0;
        const currentRating = shopData.rating || 0;
        
        const newCount = currentCount + 1;
        const newTotalScore = (currentRating * currentCount) + rating;
        const newAverageRating = newTotalScore / newCount;

        transaction.update(shopRef, {
          rating: newAverageRating,
          reviewCount: newCount
        });

        const reviewRef = doc(collection(db, 'reviews'));
        transaction.set(reviewRef, newReview);

        // Add notification for the shop owner
        const notificationRef = doc(collection(db, 'notifications'));
        transaction.set(notificationRef, {
          userId: shopData.ownerUid,
          title: 'تقييم جديد!',
          message: `قام ${newReview.userName} بتقييم متجرك بـ ${rating} نجوم.`,
          read: false,
          type: 'general',
          relatedId: shop.id,
          createdAt: Date.now()
        });
      });

      setComment('');
      setRating(5);
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const countryName = shop.country ? ARAB_COUNTRIES.find(c => c.code === shop.country)?.name || shop.country : '';

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-brand-secondary bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-2xl font-bold text-brand-dark" id="modal-title">
                  {shop.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center">
                    {shop.rating ? (
                      <>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(shop.rating!) ? 'text-yellow-400 fill-current' : 'text-yellow-100'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="mr-2 text-brand-dark font-bold text-lg">
                          {shop.rating.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-brand-dark font-bold text-lg">جديد</span>
                    )}
                  </div>
                  <span className="text-brand-secondary text-sm">
                    ({shop.reviewCount || 0} تقييم)
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-gray-600 mt-4">
                  {countryName && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand-secondary" />
                      <span>{countryName}</span>
                    </div>
                  )}
                  {(shop.location || shop.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-secondary" />
                      <span>{shop.location || shop.city}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  {shop.phone && (
                    <a 
                      href={`tel:${shop.phone}`}
                      className="flex items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-green-100"
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </a>
                  )}
                  {(shop.latitude && shop.longitude) || shop.location || shop.city ? (
                    <button 
                      onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                      className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-blue-100"
                    >
                      <MapPin className="w-4 h-4" />
                      الخريطة
                    </button>
                  ) : null}
                </div>
                
                {/* Shop Images */}
                {shop.imageUrls && shop.imageUrls.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">صور المتجر</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                      {shop.imageUrls.map((url, idx) => (
                        <img 
                          key={idx} 
                          src={url} 
                          alt={`صورة المتجر ${idx + 1}`} 
                          className="h-32 w-48 object-cover rounded-xl flex-shrink-0 snap-center border border-gray-200 shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="bg-white rounded-lg text-gray-400 hover:text-brand-secondary focus:outline-none p-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                onClick={onClose}
              >
                <span className="sr-only">إغلاق</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="border-t border-brand-border pt-5">
              {/* Review Form */}
              {canReview && auth.currentUser && !hasReviewed && (
                <div className="bg-brand-bg rounded-xl p-4 mb-6 border border-gray-100">
                  <h4 className="text-lg font-bold text-brand-dark mb-3">أضف تقييمك</h4>
                  <form onSubmit={handleSubmitReview}>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-brand-dark mb-1">التقييم</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none transition-transform hover:scale-110 ${
                              star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            <Star className="w-8 h-8 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="comment" className="block text-sm font-medium text-brand-dark mb-1">تعليقك</label>
                      <textarea
                        id="comment"
                        rows={3}
                        className="shadow-sm focus:ring-brand-primary focus:border-brand-primary/100 block w-full sm:text-sm border-brand-border rounded-md p-2"
                        placeholder="شارك تجربتك مع هذا المحل..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !comment.trim()}
                      className="w-full inline-flex justify-center items-center px-4 min-h-[44px] border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-brand-primary hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
                    </button>
                  </form>
                </div>
              )}

              {/* Reviews List */}
              <div>
                <h4 className="text-lg font-bold text-brand-dark mb-4">آراء العملاء</h4>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-brand-primary/20 p-1.5 rounded-full text-brand-primary">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-brand-dark">{review.userName}</span>
                          </div>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mt-2">{review.comment}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-brand-bg rounded-xl border border-gray-100">
                    <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-brand-secondary">لا توجد تقييمات حتى الآن. كن أول من يقيم هذا المحل!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <MapModal 
      isOpen={isMapOpen}
      onClose={() => setIsMapOpen(false)}
      shopName={shop.name}
      latitude={shop.latitude}
      longitude={shop.longitude}
      location={shop.location || shop.city}
    />
    </>
  );
}
