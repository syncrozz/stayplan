import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Storage keys
const LOCAL_STAYS_KEY = 'stayplan_local_stays';
const LOCAL_AGENDA_KEY = 'stayplan_local_agenda';
const LOCAL_CHECKLIST_KEY = 'stayplan_local_checklist';
const LOCAL_ACTIVE_ID_KEY = 'stayplan_local_active_id';

const getUserCacheKey = (uid: string, suffix: string) => `stayplan_cloud_cache_${uid}_${suffix}`;

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

  // Initial cached states for ultra-fast zero-latency startup
  const [userStays, setUserStays] = useState<Stay[]>(() => {
    if (user && user.uid !== 'guest-local-user') {
      return loadLocalData<Stay[]>(getUserCacheKey(user.uid, 'stays'), []);
    }
    return [];
  });

  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>(() => {
    if (user && user.uid !== 'guest-local-user') {
      return loadLocalData<AgendaItem[]>(getUserCacheKey(user.uid, 'agenda'), []);
    }
    return [];
  });

  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>(() => {
    if (user && user.uid !== 'guest-local-user') {
      return loadLocalData<ChecklistItem[]>(getUserCacheKey(user.uid, 'checklist'), []);
    }
    return [];
  });

  const [activeStayId, setActiveStayIdState] = useState<string | null>(() => {
    if (user && user.uid !== 'guest-local-user') {
      const cachedActive = loadLocalData<string | null>(getUserCacheKey(user.uid, 'active_id'), null);
      if (cachedActive) return cachedActive;
      const cachedStays = loadLocalData<Stay[]>(getUserCacheKey(user.uid, 'stays'), []);
      return cachedStays.length > 0 ? cachedStays[0].id : null;
    }
    return null;
  });

  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(false);

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
        const guestStays: Stay[] = SHOWCASE_STAYS.map((s) => ({
          ...s,
          userId: 'guest-local-user'
        }));
        const guestAgenda: AgendaItem[] = SHOWCASE_AGENDA_ITEMS.map((a) => ({
          ...a,
          userId: 'guest-local-user'
        }));
        const guestChecklist: ChecklistItem[] = SHOWCASE_CHECKLIST_ITEMS.map((c) => ({
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
        setActiveStayIdState(
          savedActiveId && savedStays.some((s) => s.id === savedActiveId) ? savedActiveId : savedStays[0]?.id || null
        );
      }
      setIsLoadingStays(false);
      return;
    }

    // Standard Firebase Authenticated User
    // 1. Instantly populate from user's cache so there's 0ms screen blocking
    const cachedStays = loadLocalData<Stay[]>(getUserCacheKey(user.uid, 'stays'), []);
    const cachedActiveId = loadLocalData<string | null>(getUserCacheKey(user.uid, 'active_id'), null);
    const cachedAgenda = loadLocalData<AgendaItem[]>(getUserCacheKey(user.uid, 'agenda'), []);
    const cachedChecklist = loadLocalData<ChecklistItem[]>(getUserCacheKey(user.uid, 'checklist'), []);

    if (cachedStays.length > 0) {
      setUserStays(cachedStays);
      if (cachedAgenda.length > 0) setUserAgendaItems(cachedAgenda);
      if (cachedChecklist.length > 0) setUserChecklistItems(cachedChecklist);
      setActiveStayIdState(
        cachedActiveId && cachedStays.some((s) => s.id === cachedActiveId) ? cachedActiveId : cachedStays[0].id
      );
      setIsLoadingStays(false);
    } else {
      setIsLoadingStays(true);
    }

    // Fast 1.5-second timeout safety guarantee so app never hangs on loading screen
    const safetyTimeout = setTimeout(() => {
      setIsLoadingStays(false);
    }, 1500);

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
        clearTimeout(safetyTimeout);
        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

        setUserStays(fetchedStays);
        saveLocalData(getUserCacheKey(user.uid, 'stays'), fetchedStays);

        setActiveStayIdState((prevActiveId) => {
          if (fetchedStays.length === 0) {
            saveLocalData(getUserCacheKey(user.uid, 'active_id'), null);
            return null;
          }
          if (prevActiveId && fetchedStays.some((s) => s.id === prevActiveId)) {
            saveLocalData(getUserCacheKey(user.uid, 'active_id'), prevActiveId);
            return prevActiveId;
          }
          const nextId = fetchedStays[0].id;
          saveLocalData(getUserCacheKey(user.uid, 'active_id'), nextId);
          return nextId;
        });

        setIsLoadingStays(false);
      },
      (error) => {
        clearTimeout(safetyTimeout);
        console.warn('Firestore sync note:', error.message || error);
        setIsLoadingStays(false);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
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
        setUserAgendaItems((prev) => {
          // Merge preserving any optimistic items not yet acked
          const serverIds = new Set(items.map((i) => i.id));
          const optimisticPending = prev.filter(
            (p) => p.stayId === activeStayId && !serverIds.has(p.id) && Date.now() - (Number(p.id.split('_')[1]) || 0) < 15000
          );
          const merged = [...items, ...optimisticPending];
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), merged);
          return merged;
        });
      },
      (err) => console.warn('Agenda items sync note:', err)
    );

    const unsubChecklist = onSnapshot(
      checklistRef,
      (snapshot) => {
        const items: ChecklistItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as ChecklistItem));
        setUserChecklistItems((prev) => {
          const serverIds = new Set(items.map((i) => i.id));
          const optimisticPending = prev.filter(
            (p) => p.stayId === activeStayId && !serverIds.has(p.id) && Date.now() - (Number(p.id.split('_')[1]) || 0) < 15000
          );
          const merged = [...items, ...optimisticPending];
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), merged);
          return merged;
        });
      },
      (err) => console.warn('Checklist items sync note:', err)
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
    if (user && user.uid !== 'guest-local-user') {
      saveLocalData(getUserCacheKey(user.uid, 'active_id'), id);
    }
  };

  // --- ACTIONS (Optimistic & Non-blocking) ---

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

      // 1. Optimistically update local state immediately (0ms UI lag)
      setUserStays((prev) => {
        const next = [newStay, ...prev];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_STAYS_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'stays'), next);
        }
        return next;
      });

      setUserChecklistItems((prev) => {
        const next = [...prev, ...starterChecklist];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      setUserAgendaItems((prev) => {
        const next = [...prev, starterAgenda];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      setActiveStayIdState(stayId);
      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_ACTIVE_ID_KEY, stayId);
        return stayId;
      }

      saveLocalData(getUserCacheKey(user.uid, 'active_id'), stayId);

      // 2. Dispatch to Firestore asynchronously in the background
      (async () => {
        try {
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
        } catch (err) {
          console.error('Background addStay sync error:', err);
        }
      })();

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

      // Optimistic update
      setUserStays((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_STAYS_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'stays'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      // Async Firestore write
      (async () => {
        try {
          const stayRef = doc(db, 'users', user.uid, 'stays', id);
          await updateDoc(stayRef, { ...updates, updatedAt: Date.now() });
        } catch (err) {
          console.error('Background updateStay sync error:', err);
        }
      })();
    },
    [user, requireAuth]
  );

  const deleteStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam Stay.');
        return;
      }

      // Optimistic instant state update
      setUserStays((prev) => {
        const next = prev.filter((s) => s.id !== id);
        const nextActive = next.length > 0 ? next[0].id : null;
        setActiveStayIdState(nextActive);
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_STAYS_KEY, next);
          saveLocalData(LOCAL_ACTIVE_ID_KEY, nextActive);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'stays'), next);
          saveLocalData(getUserCacheKey(user.uid, 'active_id'), nextActive);
        }
        return next;
      });

      setUserAgendaItems((prev) => {
        const next = prev.filter((a) => a.stayId !== id);
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      setUserChecklistItems((prev) => {
        const next = prev.filter((c) => c.stayId !== id);
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      // Async Firestore deletion in background
      (async () => {
        try {
          const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
          const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));

          const batch = writeBatch(db);
          agendaSnap.forEach((d) => batch.delete(d.ref));
          checklistSnap.forEach((d) => batch.delete(d.ref));
          batch.delete(doc(db, 'users', user.uid, 'stays', id));
          await batch.commit();
        } catch (err) {
          console.error('Background deleteStay sync error:', err);
        }
      })();
    },
    [user, requireAuth]
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

      // Optimistic UI updates
      setUserStays((prev) => {
        const next = [duplicatedStay, ...prev];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_STAYS_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'stays'), next);
        }
        return next;
      });

      setUserAgendaItems((prev) => {
        const next = [...prev, ...dupAgendas];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      setUserChecklistItems((prev) => {
        const next = [...prev, ...dupChecklists];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      setActiveStayIdState(newStayId);
      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_ACTIVE_ID_KEY, newStayId);
        return;
      }
      saveLocalData(getUserCacheKey(user.uid, 'active_id'), newStayId);

      // Async Firestore write in background
      (async () => {
        try {
          const batch = writeBatch(db);
          const stayRef = doc(db, 'users', user.uid, 'stays', newStayId);
          batch.set(stayRef, duplicatedStay);

          dupAgendas.forEach((item) => {
            const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'agendaItems'), item.id);
            batch.set(itemRef, item);
          });

          dupChecklists.forEach((item) => {
            const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'checklistItems'), item.id);
            batch.set(itemRef, item);
          });

          await batch.commit();
        } catch (err) {
          console.error('Background duplicateStay sync error:', err);
        }
      })();
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

      // 1. Optimistically update local state immediately (0ms UI lag)
      setUserAgendaItems((prev) => {
        const next = [...prev, newItem];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') {
        return newItemId;
      }

      // 2. Dispatch Firestore write in background
      (async () => {
        try {
          const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
          const docRef = doc(colRef, newItemId);
          await setDoc(docRef, newItem);
        } catch (err) {
          console.error('Background addAgendaItem error:', err);
        }
      })();

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

      // Optimistic update
      setUserAgendaItems((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await updateDoc(itemRef, updates);
        } catch (err) {
          console.error('Background updateAgendaItem error:', err);
        }
      })();
    },
    [user, activeStay, requireAuth]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!user || !activeStay || updatesList.length === 0) return;

      const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));

      // Optimistic update
      setUserAgendaItems((prev) => {
        const next = prev.map((a) => {
          const up = updateMap.get(a.id);
          return up ? { ...a, ...up } : a;
        });
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const batch = writeBatch(db);
          for (const item of updatesList) {
            const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', item.id);
            batch.update(itemRef, item.updates);
          }
          await batch.commit();
        } catch (err) {
          console.error('Background batchUpdateAgendaItems error:', err);
        }
      })();
    },
    [user, activeStay]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam aktiviti.');
        return;
      }

      // Optimistic update
      setUserAgendaItems((prev) => {
        const next = prev.filter((a) => a.id !== id);
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await deleteDoc(itemRef);
        } catch (err) {
          console.error('Background deleteAgendaItem error:', err);
        }
      })();
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
      const nextCompleted = !existing.isCompleted;

      // Optimistic update
      setUserAgendaItems((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted } : a));
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_AGENDA_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await updateDoc(itemRef, { isCompleted: nextCompleted });
        } catch (err) {
          console.error('Background toggleAgendaComplete error:', err);
        }
      })();
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

      // Optimistic update
      setUserChecklistItems((prev) => {
        const next = [...prev, newItem];
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return newItemId;

      (async () => {
        try {
          const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
          const docRef = doc(colRef, newItemId);
          await setDoc(docRef, newItem);
        } catch (err) {
          console.error('Background addChecklistItem error:', err);
        }
      })();

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
      const nextCompleted = !existing.isCompleted;

      // Optimistic update
      setUserChecklistItems((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted } : c));
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
          await updateDoc(itemRef, { isCompleted: nextCompleted });
        } catch (err) {
          console.error('Background toggleChecklistComplete error:', err);
        }
      })();
    },
    [user, activeStay, userChecklistItems, requireAuth]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam item.');
        return;
      }

      // Optimistic update
      setUserChecklistItems((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (user.uid === 'guest-local-user') {
          saveLocalData(LOCAL_CHECKLIST_KEY, next);
        } else {
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), next);
        }
        return next;
      });

      if (user.uid === 'guest-local-user') return;

      (async () => {
        try {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
          await deleteDoc(itemRef);
        } catch (err) {
          console.error('Background deleteChecklistItem error:', err);
        }
      })();
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
