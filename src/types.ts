export type Role = 'customer' | 'shop_owner' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  createdAt: string;
}

export interface Shop {
  id: string;
  ownerUid: string;
  name: string;
  phone: string;
  city: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface Part {
  id: string;
  shopId: string;
  partNumber: string;
  partName: string;
  carMake?: string;
  carModel?: string;
  year?: number;
  manufacturer?: string;
  condition?: 'new' | 'used';
  price: number;
  quantity: number;
  imageUrls?: string[];
  createdAt: string;
}

export interface PartRequest {
  id: string;
  customerUid: string;
  partNumber?: string;
  partName: string;
  carModel?: string;
  status: 'open' | 'fulfilled' | 'closed';
  createdAt: string;
}

export interface RequestResponse {
  id: string;
  requestId: string;
  shopId: string;
  price: number;
  quantity: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface SavedPart {
  id: string;
  userId: string;
  partId: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'request_response' | 'general';
  relatedId?: string;
  createdAt: number;
}

export interface Review {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}
