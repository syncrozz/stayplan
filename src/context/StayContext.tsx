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
  batchUpdateAgendaItems: (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => Promise<void>;
  deleteAgendaItem: (id: string) => Promise<void>;
  toggleAgendaComplete: (id: string) => Promise<void>;
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'userId'>) => Promise<string>;
  toggleChecklistComplete: (id: string) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  createFromStarterTemplate: (templateType: StayType) => Promise<string>;
  exportDataJson: () => string;
}

const StayContext = createContext<StayContextType | undefined>(undefined);

const LOCAL_STAYS_KEY = 'stayplan_local_stays';
const LOCAL_AGENDA_KEY = 'stayplan_local_agenda';
const LOCAL_CHECKLIST_KEY = 'stayplan_local_checklist';
const LOCAL_ACTIVE_ID_KEY = 'stayplan_local_active_id';

function loadLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed reading ${key} from localStorage:`, e);
  }
  return fallback;
}

function saveLocalData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed writing ${key} to localStorage:`, e);
  }
}

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, requireAuth } = useAuth();

  // State for authenticated user stays
  const [userStays, setUserStays] = useState<Stay[]>([]);
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>([]);
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>([]);
  const [activeStayId, setActiveStayIdState] = useState<string | null>(null);
  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(true);

  const isPersonalMode = !!user;

  // 1. Subscribe or load stays
  useEffect(() => {
    if (!user) {
      setUserStays([]);
      setUserAgendaItems([]);
      setUserChecklistItems([]);
      setActiveStayIdState(SHOWCASE_STAYS[0]?.id || null);
      setIsLoadingStays(false);
      return;
    }

    if (user.uid === 'guest-local-user') {
      // Guest local storage mode
      const savedStays = loadLocalData<Stay[]>(LOCAL_STAYS_KEY, []);
      const savedAgenda = loadLocalData<AgendaItem[]>(LOCAL_AGENDA_KEY, []);
      const savedChecklist = loadLocalData<ChecklistItem[]>(LOCAL_CHECKLIST_KEY, []);
      const savedActiveId = loadLocalData<string | null>(LOCAL_ACTIVE_ID_KEY, null);

      if (savedStays.length === 0) {
        // Initialize with default showcase stays as editable copies for the guest
        const guestStays: Stay[] = SHOWCASE_STAYS.map(s => ({
          ...s,
          userId: 'guest-local-user'
        }));
        const guestAgenda: AgendaItem[] = SHOWCASE_AGENDA_ITEMS.map(a => ({
          ...a,
          userId: 'guest-local-user'
        }));
        const guestChecklist: ChecklistItem[] = SHOWCASE_CHECKLIST_ITEMS.map(c => ({
          ...c,
          userId: 'guest-local-user'
        }));

        setUserStays(guestStays);
        setUserAgendaItems(guestAgenda);
        setUserChecklistItems(guestChecklist);
        setActiveStayIdState(guestStays[0]?.id || null);

        saveLocalData(LOCAL_STAYS_KEY, guestStays);
        saveLocalData(LOCAL_AGENDA_KEY, guestAgenda);
        saveLocalData(LOCAL_CHECKLIST_KEY, guestChecklist);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, guestStays[0]?.id || null);
      } else {
        setUserStays(savedStays);
        setUserAgendaItems(savedAgenda);
        setUserChecklistItems(savedChecklist);
        setActiveStayIdState(savedActiveId && savedStays.some(s => s.id === savedActiveId) ? savedActiveId : savedStays[0].id);
      }
      setIsLoadingStays(false);
      return;
    }

    // Standard Firebase Authenticated User
    setIsLoadingStays(true);

    const initAndSubscribeUser = async () => {
      // Check for local guest data to migrate to Firestore
      const localStays = loadLocalData<Stay[]>(LOCAL_STAYS_KEY, []);
      const localAgenda = loadLocalData<AgendaItem[]>(LOCAL_AGENDA_KEY, []);
      const localChecklist = loadLocalData<ChecklistItem[]>(LOCAL_CHECKLIST_KEY, []);

      if (localStays.length > 0) {
        try {
          const batch = writeBatch(db);
          for (const s of localStays) {
            const stayDocRef = doc(db, 'users', user.uid, 'stays', s.id);
            batch.set(stayDocRef, { ...s, userId: user.uid, updatedAt: Date.now() }, { merge: true });

            const sAgendas = localAgenda.filter((a) => a.stayId === s.id);
            for (const a of sAgendas) {
              const aRef = doc(db, 'users', user.uid, 'stays', s.id, 'agendaItems', a.id);
              batch.set(aRef, { ...a, userId: user.uid }, { merge: true });
            }

            const sChecklists = localChecklist.filter((c) => c.stayId === s.id);
            for (const c of sChecklists) {
              const cRef = doc(db, 'users', user.uid, 'stays', s.id, 'checklistItems', c.id);
              batch.set(cRef, { ...c, userId: user.uid }, { merge: true });
            }
          }
          await batch.commit();

          // Clear local cache once safely migrated to cloud
          localStorage.removeItem(LOCAL_STAYS_KEY);
          localStorage.removeItem(LOCAL_AGENDA_KEY);
          localStorage.removeItem(LOCAL_CHECKLIST_KEY);
          localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
        } catch (migErr) {
          console.warn('Auto-migration note:', migErr);
        }
      }
    };

    initAndSubscribeUser();

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
        console.warn('Firestore sync note:', error.message || error);
        setIsLoadingStays(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Subscribe to Agenda & Checklist of the currently active stay (for Firebase User)
  useEffect(() => {
    if (!user || user.uid === 'guest-local-user' || !activeStayId) {
      if (user && user.uid !== 'guest-local-user') {
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

  // --- ACTIONS (Support both Firebase and Guest/Local mode) ---

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mencipta dan menyimpan StayPlan peribadi.');
        return '';
      }

      const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const starterChecklist: ChecklistItem[] = [
        { id: `chk_${Date.now()}_1`, stayId, userId: user.uid, category: 'essentials', text: 'Pakaian & pakaian solat', isCompleted: false },
        { id: `chk_${Date.now()}_2`, stayId, userId: user.uid, category: 'essentials', text: 'Pengecas telefon & ubatan harian', isCompleted: false },
        { id: `chk_${Date.now()}_3`, stayId, userId: user.uid, category: 'food_gifts', text: 'Buah tangan / bekalan makanan', isCompleted: false }
      ];

      const starterAgenda: AgendaItem = {
        id: `agn_${Date.now()}_1`,
        stayId,
        userId: user.uid,
        dayNumber: 1,
        timeSlot: 'afternoon',
        timeSpecific: '03:00 PM',
        title: 'Ketibaan & Daftar Masuk',
        description: 'Tiba di lokasi, susun barang dan rehat santai.',
        priority: 'must_do',
        isCompleted: false
      };

      if (user.uid === 'guest-local-user') {
        setUserStays((prev) => {
          const next = [newStay, ...prev];
          saveLocalData(LOCAL_STAYS_KEY, next);
          return next;
        });
        setUserChecklistItems((prev) => {
          const next = [...prev, ...starterChecklist];
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
        setUserAgendaItems((prev) => {
          const next = [...prev, starterAgenda];
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        setActiveStayIdState(stayId);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, stayId);
        return stayId;
      }

      // Firebase User Mode
      const stayCol = collection(db, 'users', user.uid, 'stays');
      const stayDoc = doc(stayCol, stayId);
      await setDoc(stayDoc, newStay);

      const batch = writeBatch(db);
      starterChecklist.forEach((item) => {
        const itemRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'checklistItems'), item.id);
        batch.set(itemRef, item);
      });

      const day1Ref = doc(collection(db, 'users', user.uid, 'stays', stayId, 'agendaItems'), starterAgenda.id);
      batch.set(day1Ref, starterAgenda);

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

      if (user.uid === 'guest-local-user') {
        setUserStays((prev) => {
          const next = prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
          saveLocalData(LOCAL_STAYS_KEY, next);
          return next;
        });
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

      if (user.uid === 'guest-local-user') {
        setUserStays((prev) => {
          const next = prev.filter((s) => s.id !== id);
          saveLocalData(LOCAL_STAYS_KEY, next);
          setActiveStayIdState(next.length > 0 ? next[0].id : null);
          saveLocalData(LOCAL_ACTIVE_ID_KEY, next.length > 0 ? next[0].id : null);
          return next;
        });
        setUserAgendaItems((prev) => {
          const next = prev.filter((a) => a.stayId !== id);
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        setUserChecklistItems((prev) => {
          const next = prev.filter((c) => c.stayId !== id);
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
        return;
      }

      // Delete subcollections in Firestore
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

      const newStayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const duplicatedStay: Stay = {
        ...target,
        id: newStayId,
        userId: user.uid,
        title: `${target.title} (Salinan)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (user.uid === 'guest-local-user') {
        const sourceAgendas = userAgendaItems.filter((a) => a.stayId === id);
        const dupAgendas: AgendaItem[] = sourceAgendas.map((a, i) => ({
          ...a,
          id: `agn_${Date.now()}_${i}`,
          stayId: newStayId,
          userId: user.uid,
          isCompleted: false
        }));

        const sourceChecklists = userChecklistItems.filter((c) => c.stayId === id);
        const dupChecklists: ChecklistItem[] = sourceChecklists.map((c, i) => ({
          ...c,
          id: `chk_${Date.now()}_${i}`,
          stayId: newStayId,
          userId: user.uid,
          isCompleted: false
        }));

        setUserStays((prev) => {
          const next = [duplicatedStay, ...prev];
          saveLocalData(LOCAL_STAYS_KEY, next);
          return next;
        });
        setUserAgendaItems((prev) => {
          const next = [...prev, ...dupAgendas];
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        setUserChecklistItems((prev) => {
          const next = [...prev, ...dupChecklists];
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
        setActiveStayIdState(newStayId);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, newStayId);
        return;
      }

      const newStayRef = doc(collection(db, 'users', user.uid, 'stays'), newStayId);
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
    [user, userStays, userAgendaItems, userChecklistItems, requireAuth]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menambah aktiviti ke agenda anda.');
        return '';
      }

      const newItemId = `agn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newItem: AgendaItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid
      };

      if (user.uid === 'guest-local-user') {
        setUserAgendaItems((prev) => {
          const next = [...prev, newItem];
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        return newItemId;
      }

      // Ensure the parent stay document exists in the user's stays collection in Firestore
      const stayDocRef = doc(db, 'users', user.uid, 'stays', activeStay.id);
      await setDoc(stayDocRef, { ...activeStay, userId: user.uid, updatedAt: Date.now() }, { merge: true });

      const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
      const docRef = doc(colRef, newItemId);
      await setDoc(docRef, newItem);
      return newItemId;
    },
    [user, activeStay, requireAuth]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini aktiviti.');
        return;
      }

      if (user.uid === 'guest-local-user') {
        setUserAgendaItems((prev) => {
          const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        return;
      }

      const stayDocRef = doc(db, 'users', user.uid, 'stays', activeStay.id);
      await setDoc(stayDocRef, { ...activeStay, userId: user.uid, updatedAt: Date.now() }, { merge: true });

      const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
      await updateDoc(itemRef, updates);
    },
    [user, activeStay, requireAuth]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!user || !activeStay || updatesList.length === 0) return;

      if (user.uid === 'guest-local-user') {
        setUserAgendaItems((prev) => {
          const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));
          const next = prev.map((a) => {
            const up = updateMap.get(a.id);
            return up ? { ...a, ...up } : a;
          });
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        return;
      }

      const stayDocRef = doc(db, 'users', user.uid, 'stays', activeStay.id);
      await setDoc(stayDocRef, { ...activeStay, userId: user.uid, updatedAt: Date.now() }, { merge: true });

      const batch = writeBatch(db);
      for (const item of updatesList) {
        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', item.id);
        batch.update(itemRef, item.updates);
      }
      await batch.commit();
    },
    [user, activeStay]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam aktiviti.');
        return;
      }

      if (user.uid === 'guest-local-user') {
        setUserAgendaItems((prev) => {
          const next = prev.filter((a) => a.id !== id);
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
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

      if (user.uid === 'guest-local-user') {
        setUserAgendaItems((prev) => {
          const next = prev.map((a) => (a.id === id ? { ...a, isCompleted: !a.isCompleted } : a));
          saveLocalData(LOCAL_AGENDA_KEY, next);
          return next;
        });
        return;
      }

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

      const newItemId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newItem: ChecklistItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid
      };

      if (user.uid === 'guest-local-user') {
        setUserChecklistItems((prev) => {
          const next = [...prev, newItem];
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
        return newItemId;
      }

      const stayDocRef = doc(db, 'users', user.uid, 'stays', activeStay.id);
      await setDoc(stayDocRef, { ...activeStay, userId: user.uid, updatedAt: Date.now() }, { merge: true });

      const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
      const docRef = doc(colRef, newItemId);
      await setDoc(docRef, newItem);
      return newItemId;
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

      if (user.uid === 'guest-local-user') {
        setUserChecklistItems((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, isCompleted: !c.isCompleted } : c));
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
        return;
      }

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

      if (user.uid === 'guest-local-user') {
        setUserChecklistItems((prev) => {
          const next = prev.filter((c) => c.id !== id);
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
          return next;
        });
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
        batchUpdateAgendaItems,
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
