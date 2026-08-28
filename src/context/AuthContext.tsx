import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  User,
  db
} from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // Auth prompt modal management
  isAuthModalOpen: boolean;
  authModalContext: string;
  openAuthModal: (contextMessage?: string) => void;
  closeAuthModal: () => void;
  requireAuth: (callback: () => void, contextMessage?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalContext, setAuthModalContext] = useState<string>('');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const data = snap.data();
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: (data.role as UserRole) || 'USER',
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt || Date.now()
            });
          } else {
            // New user registration - strictly assign role = 'USER'
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'USER',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await setDoc(userRef, {
              ...newProfile,
              createdAtServer: serverTimestamp()
            });
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching/creating user profile in Firestore:', err);
          // Fallback profile with standard USER role
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            role: 'USER',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const openAuthModal = (contextMessage?: string) => {
    setAuthModalContext(contextMessage || 'Log masuk dengan Google untuk mencipta, menyesuaikan dan menyimpan pelan StayPlan peribadi anda.');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingCallback(null);
  };

  const requireAuth = (callback: () => void, contextMessage?: string) => {
    if (user) {
      callback();
    } else {
      setPendingCallback(() => callback);
      openAuthModal(contextMessage);
    }
  };

  const role: UserRole = userProfile?.role || 'USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAuthenticated: !!user,
        isLoading,
        signInWithGoogle,
        signOut,
        isAuthModalOpen,
        authModalContext,
        openAuthModal,
        closeAuthModal,
        requireAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
