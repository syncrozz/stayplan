import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayType } from '../types';
import { SHOWCASE_STAYS, SHOWCASE_AGENDA_ITEMS, SHOWCASE_CHECKLIST_ITEMS } from '../data/defaultStays';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';

interface StayContextType {
  stays: Stay[];
  activeStay: Stay | null;
  activeStayId: string | null;
  setActiveStayId: (id: string) => void;
  agendaItems: AgendaItem[];
  activeAgendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  activeChecklistItems: ChecklistItem[];
  isPersonalMode: boolean;
  isLoadingStays: boolean;
  addStay: (stay: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<string>;
  updateStay: (id: string, updates: Partial<Stay>) => Promise<void>;
  deleteStay: (id: string) => Promise<void>;
  duplicateStay: (id: string) => Promise<void>;
  addAgendaItem: (item: Omit<AgendaItem, 'id' | 'userId'>) => Promise<string>;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<void>;
  toggleAgendaComplete: (id: string) => Promise<void>;
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'userId'>) => Promise<string>;
  toggleChecklistComplete: (id: string) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  createFromStarterTemplate: (templateType: StayType) => Promise<string>;
  exportDataJson: () => string;
}

const StayContext = createContext<StayContextType | undefined>(undefined);

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, requireAuth } = useAuth();

  // State for authenticated user stays
  const [userStays, setUserStays] = useState<Stay[]>([]);
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>([]);
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>([]);
  const [activeStayId, setActiveStayIdState] = useState<string | null>(null);
  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(false);

  const isPersonalMode = !!user;

  // 1. Subscribe to User's Stays collection when authenticated
  useEffect(() => {
    if (!user) {
      setUserStays([]);
      setUserAgendaItems([]);
      setUserChecklistItems([]);
      setActiveStayIdState(SHOWCASE_STAYS[0].id);
      setIsLoadingStays(false);
      return;
    }

    setIsLoadingStays(true);
    const staysRef = collection(db, 'users', user.uid, 'stays');
    const staysQuery = query(staysRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      staysQuery,
      (snapshot) => {
        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });
        setUserStays(fetchedStays);

        setActiveStayIdState((prevActiveId) => {
          if (fetchedStays.length === 0) return null;
          if (prevActiveId && fetchedStays.some((s) => s.id === prevActiveId)) {
            return prevActiveId;
          }
          return fetchedStays[0].id;
        });

        setIsLoadingStays(false);
      },
      (error) => {
        // Silently handle when database is still being provisioned in console
        console.warn('Firestore sync note:', error.message || error);
        setIsLoadingStays(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Subscribe to Agenda & Checklist of the currently active stay
  useEffect(() => {
    if (!user || !activeStayId) {
      if (user) {
        setUserAgendaItems([]);
        setUserChecklistItems([]);
      }
      return;
    }

    const agendaRef = collection(db, 'users', user.uid, 'stays', activeStayId, 'agendaItems');
    const checklistRef = collection(db, 'users', user.uid, 'stays', activeStayId, 'checklistItems');

    const unsubAgenda = onSnapshot(
      agendaRef,
      (snapshot) => {
        const items: AgendaItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as AgendaItem));
        setUserAgendaItems(items);
      },
      (err) => console.error('Error fetching agenda items:', err)
    );

    const unsubChecklist = onSnapshot(
      checklistRef,
      (snapshot) => {
        const items: ChecklistItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as ChecklistItem));
        setUserChecklistItems(items);
      },
      (err) => console.error('Error fetching checklist items:', err)
    );

    return () => {
      unsubAgenda();
      unsubChecklist();
    };
  }, [user, activeStayId]);

  // Determine current active lists based on mode
  const stays = useMemo(() => {
    return isPersonalMode ? userStays : SHOWCASE_STAYS;
  }, [isPersonalMode, userStays]);

  const activeStay = useMemo(() => {
    if (!stays || stays.length === 0) return null;
    const found = stays.find((s) => s.id === activeStayId);
    return found || stays[0] || null;
  }, [stays, activeStayId]);

  const activeAgendaItems = useMemo(() => {
    if (!activeStay) return [];
    if (isPersonalMode) {
      return userAgendaItems.filter((i) => i.stayId === activeStay.id);
    }
    return SHOWCASE_AGENDA_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [isPersonalMode, activeStay, userAgendaItems]);

  const activeChecklistItems = useMemo(() => {
    if (!activeStay) return [];
    if (isPersonalMode) {
      return userChecklistItems.filter((i) => i.stayId === activeStay.id);
    }
    return SHOWCASE_CHECKLIST_ITEMS.filter((i) => i.stayId === activeStay.id);
  }, [isPersonalMode, activeStay, userChecklistItems]);

  const setActiveStayId = (id: string) => {
    setActiveStayIdState(id);
  };

  // --- ACTIONS (Strictly requiring Authenticated Google User) ---

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mencipta dan menyimpan StayPlan peribadi.');
        return '';
      }

      const stayCol = collection(db, 'users', user.uid, 'stays');
      const stayDoc = doc(stayCol);
      const stayId = stayDoc.id;

      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(stayDoc, newStay);

      // Starter essentials checklist
      const starterChecklist: Array<Omit<ChecklistItem, 'id'>> = [
        { stayId, userId: user.uid, category: 'essentials', text: 'Pakaian & pakaian solat', isCompleted: false },
        { stayId, userId: user.uid, category: 'essentials', text: 'Pengecas telefon & ubatan harian', isCompleted: false },
        { stayId, userId: user.uid, category: 'food_gifts', text: 'Buah tangan / bekalan makanan', isCompleted: false }
      ];

      const batch = writeBatch(db);
      starterChecklist.forEach((item) => {
        const itemRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'checklistItems'));
        batch.set(itemRef, { ...item, id: itemRef.id });
      });

      // Day 1 Starter Agenda
      const day1Ref = doc(collection(db, 'users', user.uid, 'stays', stayId, 'agendaItems'));
      batch.set(day1Ref, {
        id: day1Ref.id,
        stayId,
        userId: user.uid,
        dayNumber: 1,
        timeSlot: 'afternoon',
        timeSpecific: '03:00 PM',
        title: 'Ketibaan & Daftar Masuk',
        description: 'Tiba di lokasi, susun barang dan rehat santai.',
        priority: 'must_do',
        isCompleted: false
      });

      await batch.commit();
      setActiveStayIdState(stayId);
      return stayId;
    },
    [user, requireAuth]
  );

  const updateStay = useCallback(
    async (id: string, updates: Partial<Stay>) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini maklumat Stay.');
        return;
      }
      const stayRef = doc(db, 'users', user.uid, 'stays', id);
      await updateDoc(stayRef, { ...updates, updatedAt: Date.now() });
    },
    [user, requireAuth]
  );

  const deleteStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam Stay.');
        return;
      }

      // Delete subcollections
      const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
      const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));

      const batch = writeBatch(db);
      agendaSnap.forEach((d) => batch.delete(d.ref));
      checklistSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', user.uid, 'stays', id));
      await batch.commit();

      const remaining = userStays.filter((s) => s.id !== id);
      setActiveStayIdState(remaining.length > 0 ? remaining[0].id : null);
    },
    [user, userStays, requireAuth]
  );

  const duplicateStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menduplikasi pelan Stay.');
        return;
      }

      const target = userStays.find((s) => s.id === id);
      if (!target) return;

      const newStayRef = doc(collection(db, 'users', user.uid, 'stays'));
      const newStayId = newStayRef.id;

      const duplicatedStay: Stay = {
        ...target,
        id: newStayId,
        userId: user.uid,
        title: `${target.title} (Salinan)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const batch = writeBatch(db);
      batch.set(newStayRef, duplicatedStay);

      const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
      agendaSnap.forEach((docSnap) => {
        const item = docSnap.data() as AgendaItem;
        const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'agendaItems'));
        batch.set(itemRef, {
          ...item,
          id: itemRef.id,
          stayId: newStayId,
          userId: user.uid,
          isCompleted: false
        });
      });

      const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));
      checklistSnap.forEach((docSnap) => {
        const item = docSnap.data() as ChecklistItem;
        const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'checklistItems'));
        batch.set(itemRef, {
          ...item,
          id: itemRef.id,
          stayId: newStayId,
          userId: user.uid,
          isCompleted: false
        });
      });

      await batch.commit();
      setActiveStayIdState(newStayId);
    },
    [user, userStays, requireAuth]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menambah aktiviti ke agenda anda.');
        return '';
      }

      const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
      const docRef = doc(colRef);
      const newItem: AgendaItem = {
        ...item,
        id: docRef.id,
        stayId: activeStay.id,
        userId: user.uid
      };

      await setDoc(docRef, newItem);
      return docRef.id;
    },
    [user, activeStay, requireAuth]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini aktiviti.');
        return;
      }
      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
      await updateDoc(itemRef, updates);
    },
    [user, activeStay, requireAuth]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam aktiviti.');
        return;
      }
      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
      await deleteDoc(itemRef);
    },
    [user, activeStay, requireAuth]
  );

  const toggleAgendaComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menanda aktiviti siap.');
        return;
      }
      const existing = userAgendaItems.find((i) => i.id === id);
      if (!existing) return;

      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
      await updateDoc(itemRef, { isCompleted: !existing.isCompleted });
    },
    [user, activeStay, userAgendaItems, requireAuth]
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menambah item senarai semak.');
        return '';
      }

      const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
      const docRef = doc(colRef);
      const newItem: ChecklistItem = {
        ...item,
        id: docRef.id,
        stayId: activeStay.id,
        userId: user.uid
      };

      await setDoc(docRef, newItem);
      return docRef.id;
    },
    [user, activeStay, requireAuth]
  );

  const toggleChecklistComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menanda senarai semak.');
        return;
      }
      const existing = userChecklistItems.find((i) => i.id === id);
      if (!existing) return;

      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
      await updateDoc(itemRef, { isCompleted: !existing.isCompleted });
    },
    [user, activeStay, userChecklistItems, requireAuth]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam item.');
        return;
      }
      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
      await deleteDoc(itemRef);
    },
    [user, activeStay, requireAuth]
  );

  const createFromStarterTemplate = useCallback(
    async (templateType: StayType): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memilih templat.');
        return '';
      }

      let title = 'Pelan Percutian Saya';
      let durationDays = 3;
      let location = 'Destinasi Pilihan';

      if (templateType === 'balik_kampung') {
        title = 'Kepulangan Balik Kampung';
        durationDays = 3;
        location = 'Kampung Halaman';
      } else if (templateType === 'homestay') {
        title = 'Percutian Santai Homestay';
        durationDays = 3;
        location = 'Homestay Percutian';
      } else if (templateType === 'weekend_getaway') {
        title = 'Rehat Hujung Minggu (Weekend Getaway)';
        durationDays = 2;
        location = 'Resort / Staycation';
      }

      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const end = new Date(Date.now() + (durationDays - 1) * 24 * 60 * 60 * 1000);
      const endDate = end.toISOString().split('T')[0];

      return await addStay({
        title,
        type: templateType,
        startDate,
        endDate,
        durationDays,
        location,
        companions: [],
        houseRules: []
      });
    },
    [user, addStay, requireAuth]
  );

  const exportDataJson = useCallback((): string => {
    return JSON.stringify(
      {
        userUid: user?.uid || null,
        stays: isPersonalMode ? userStays : SHOWCASE_STAYS,
        agendaItems: isPersonalMode ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
        checklistItems: isPersonalMode ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
        activeStayId
      },
      null,
      2
    );
  }, [user, isPersonalMode, userStays, userAgendaItems, userChecklistItems, activeStayId]);

  return (
    <StayContext.Provider
      value={{
        stays,
        activeStay,
        activeStayId,
        setActiveStayId,
        agendaItems: isPersonalMode ? userAgendaItems : SHOWCASE_AGENDA_ITEMS,
        activeAgendaItems,
        checklistItems: isPersonalMode ? userChecklistItems : SHOWCASE_CHECKLIST_ITEMS,
        activeChecklistItems,
        isPersonalMode,
        isLoadingStays,
        addStay,
        updateStay,
        deleteStay,
        duplicateStay,
        addAgendaItem,
        updateAgendaItem,
        deleteAgendaItem,
        toggleAgendaComplete,
        addChecklistItem,
        toggleChecklistComplete,
        deleteChecklistItem,
        createFromStarterTemplate,
        exportDataJson
      }}
    >
      {children}
    </StayContext.Provider>
  );
};

export const useStay = () => {
  const context = useContext(StayContext);
  if (!context) {
    throw new Error('useStay must be used within a StayProvider');
  }
  return context;
};
