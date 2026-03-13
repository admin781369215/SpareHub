import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PartRequest, RequestResponse, Shop } from '../types';
import { Package, Clock, CheckCircle, XCircle, DollarSign, MapPin, Phone } from 'lucide-react';

interface RequestWithResponses extends PartRequest {
  responses: (RequestResponse & { shop?: Shop })[];
}

export default function CustomerRequests() {
  const [requests, setRequests] = useState<RequestWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Record<string, Shop>>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch shops first for mapping
    const fetchShops = async () => {
      try {
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        const shopsData: Record<string, Shop> = {};
        shopsSnapshot.forEach(doc => {
          shopsData[doc.id] = { id: doc.id, ...doc.data() } as Shop;
        });
        setShops(shopsData);
      } catch (error) {
        console.error("Error fetching shops:", error);
      }
    };

    fetchShops();

    // Listen to user's requests
    const q = query(
      collection(db, 'partRequests'),
      where('customerUid', '==', auth.currentUser.uid)
    );

    const unsubscribeRequests = onSnapshot(q, async (snapshot) => {
      const requestsData: RequestWithResponses[] = [];
      
      for (const document of snapshot.docs) {
        const request = { id: document.id, ...document.data() } as PartRequest;
        
        // Fetch responses for this request
        const responsesQuery = query(
          collection(db, 'requestResponses'),
          where('requestId', '==', request.id)
        );
        
        const responsesSnapshot = await getDocs(responsesQuery);
        const responses: (RequestResponse & { shop?: Shop })[] = [];
        
        responsesSnapshot.forEach(respDoc => {
          const responseData = { id: respDoc.id, ...respDoc.data() } as RequestResponse;
          responses.push({
            ...responseData,
            shop: shops[responseData.shopId] // Might be undefined initially, but we'll re-render
          });
        });
        
        requestsData.push({ ...request, responses });
      }
      
      // Sort by newest first
      requestsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribeRequests();
  }, [shops]); // Re-run when shops are loaded

  const handleAcceptOffer = async (requestId: string, responseId: string) => {
    try {
      // Update the response status to accepted
      await updateDoc(doc(db, 'requestResponses', responseId), {
        status: 'accepted'
      });

      // Update the request status to fulfilled
      await updateDoc(doc(db, 'partRequests', requestId), {
        status: 'fulfilled'
      });
      
      // Note: In a real app, you might want to reject other pending offers here
    } catch (error) {
      console.error("Error accepting offer:", error);
      alert("حدث خطأ أثناء قبول العرض");
    }
  };

  const handleRejectOffer = async (responseId: string) => {
    try {
      await updateDoc(doc(db, 'requestResponses', responseId), {
        status: 'rejected'
      });
    } catch (error) {
      console.error("Error rejecting offer:", error);
      alert("حدث خطأ أثناء رفض العرض");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-brand-dark mb-8">طلباتي وعروض الأسعار</h1>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-brand-dark">لا توجد طلبات</h3>
          <p className="mt-1 text-sm text-brand-secondary">لم تقم بتقديم أي طلبات لقطع غيار حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {requests.map((request) => (
            <div key={request.id} className="bg-white shadow overflow-hidden sm:rounded-lg border border-brand-border">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-brand-bg border-b border-brand-border">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-brand-dark">
                    {request.partName}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-brand-secondary">
                    {request.carModel && `الموديل: ${request.carModel}`}
                    {request.partNumber && ` | رقم القطعة: ${request.partNumber}`}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'open' ? 'bg-brand-primary/20 text-brand-primary-hover' :
                    request.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'open' ? 'مفتوح' :
                     request.status === 'fulfilled' ? 'مكتمل' : 'مغلق'}
                  </span>
                </div>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-md font-medium text-brand-dark mb-4">عروض الأسعار المستلمة ({request.responses.length})</h4>
                
                {request.responses.length === 0 ? (
                  <p className="text-sm text-brand-secondary italic">بانتظار عروض الأسعار من المحلات...</p>
                ) : (
                  <div className="space-y-4">
                    {request.responses.map((offer) => (
                      <div key={offer.id} className={`border rounded-md p-4 ${
                        offer.status === 'accepted' ? 'border-green-300 bg-green-50' :
                        offer.status === 'rejected' ? 'border-red-200 bg-red-50 opacity-75' :
                        'border-brand-border bg-white'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <h5 className="text-sm font-bold text-brand-dark">{offer.shop?.name || 'محل غير معروف'}</h5>
                              {offer.status === 'accepted' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" /> تم القبول
                                </span>
                              )}
                              {offer.status === 'rejected' && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" /> مرفوض
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 gap-4">
                              <div className="flex items-center text-sm text-brand-dark">
                                <DollarSign className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-lg">${offer.price.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center text-sm text-brand-dark">
                                <Package className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                <span>الكمية: {offer.quantity}</span>
                              </div>
                            </div>
                            
                            {offer.shop && offer.status === 'accepted' && (
                              <div className="mt-3 pt-3 border-t border-brand-border">
                                <div className="flex items-center text-sm text-brand-secondary mb-1">
                                  <MapPin className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                  {offer.shop.city}
                                </div>
                                <div className="flex items-center text-sm text-brand-secondary">
                                  <Phone className="flex-shrink-0 me-1.5 h-4 w-4 text-gray-400" />
                                  <span dir="ltr">{offer.shop.phone}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {request.status === 'open' && offer.status === 'pending' && (
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => handleAcceptOffer(request.id, offer.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                قبول العرض
                              </button>
                              <button
                                onClick={() => handleRejectOffer(offer.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-brand-border text-xs font-medium rounded shadow-sm text-brand-dark bg-white hover:bg-brand-bg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                              >
                                رفض
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
