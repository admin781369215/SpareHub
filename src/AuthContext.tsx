import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Role } from './types';
import { handleFirestoreError, OperationType } from './utils/firestore-errors';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            if (firebaseUser.email === '781369216a@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(userDocRef, data, { merge: true });
            }
            
            // Auto-approve shop for specific test user
            if (firebaseUser.email === 'a43995642@gmail.com') {
              if (data.role !== 'shop_owner') {
                data.role = 'shop_owner';
                await setDoc(userDocRef, data, { merge: true });
              }
              
              try {
                const qShop = query(collection(db, 'shops'), where('ownerUid', '==', firebaseUser.uid));
                const shopSnap = await getDocs(qShop);
                if (shopSnap.empty) {
                  await addDoc(collection(db, 'shops'), {
                    ownerUid: firebaseUser.uid,
                    name: 'متجر التجربة',
                    city: 'الرياض',
                    phone: '0500000000',
                    rating: 5,
                    reviewCount: 0,
                    status: 'approved',
                    subscriptionStatus: 'active',
                    subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    createdAt: new Date().toISOString()
                  });
                } else {
                  const shopDoc = shopSnap.docs[0];
                  if (shopDoc.data().status !== 'approved') {
                    await setDoc(doc(db, 'shops', shopDoc.id), { 
                      status: 'approved',
                      subscriptionStatus: 'active',
                      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }, { merge: true });
                  }
                }
              } catch (err) {
                console.error("Error auto-approving shop:", err);
              }
            }
            
            setDbUser(data);
          } else {
            // Create new user document
            let initialRole: Role = 'customer';
            if (firebaseUser.email === '781369216a@gmail.com') initialRole = 'admin';
            if (firebaseUser.email === 'a43995642@gmail.com') initialRole = 'shop_owner';
            
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              role: initialRole,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            setDbUser(newUser);
            
            if (firebaseUser.email === 'a43995642@gmail.com') {
              try {
                await addDoc(collection(db, 'shops'), {
                  ownerUid: firebaseUser.uid,
                  name: 'متجر التجربة',
                  city: 'الرياض',
                  phone: '0500000000',
                  rating: 5,
                  reviewCount: 0,
                  status: 'approved',
                  subscriptionStatus: 'active',
                  subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  createdAt: new Date().toISOString()
                });
              } catch (err) {
                console.error("Error auto-creating shop:", err);
              }
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const updateRole = async (role: Role) => {
    if (!user || !dbUser) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { ...dbUser, role }, { merge: true });
      setDbUser({ ...dbUser, role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signIn, logout, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
