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
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  hasUnsavedChanges: boolean;
  unsavedCount: number;
  saveFeedback: { type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null;
  saveAndSync: (customSuccessMsg?: string) => Promise<{ success: boolean; message: string; staysCount: number }>;
  markChangesMade: () => void;
  clearSaveFeedback: () => void;
  forceSyncWithCloud: () => Promise<{ success: boolean; message: string; staysCount: number }>;
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

/**
 * Sanitizes object by removing `undefined` values recursively so Firestore never errors on invalid values.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = typeof val === 'object' && val !== null ? sanitizeForFirestore(val) : val;
      }
    }
    return cleaned as T;
  }
  return obj;
}

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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => Date.now());
  const [syncError, setSyncError] = useState<string | null>(null);

  // Unsaved changes tracking & Save-to-Google sync status
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null>(null);

  const markChangesMade = useCallback(() => {
    setHasUnsavedChanges(true);
    setUnsavedCount((prev) => prev + 1);
  }, []);

  const clearSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  const isPersonalMode = !!user;

  // Comprehensive Force Cloud Synchronization Method
  const forceSyncWithCloud = useCallback(async (): Promise<{ success: boolean; message: string; staysCount: number }> => {
    if (!user || user.uid === 'guest-local-user') {
      return { success: false, message: 'Sila log masuk dengan Google untuk menyelaraskan ke Cloud Firestore.', staysCount: 0 };
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      // 1. Gather all potential stays from local memory, cache, and guest sessions
      const existingStateStays = userStays.length > 0 ? userStays : [];
      const cachedStays = loadLocalData<Stay[]>(getUserCacheKey(user.uid, 'stays'), []);
      const localGuestStays = loadLocalData<Stay[]>(LOCAL_STAYS_KEY, []);
      const guestCachedStays = loadLocalData<Stay[]>('stayplan_cloud_cache_guest-local-user_stays', []);
      const legacyStays = loadLocalData<Stay[]>('stayplan_stays', []);

      // Merge and deduplicate by stay ID
      const stayMap = new Map<string, Stay>();
      [...legacyStays, ...guestCachedStays, ...localGuestStays, ...cachedStays, ...existingStateStays].forEach((s) => {
        if (s && s.id) {
          stayMap.set(s.id, { ...s, userId: user.uid });
        }
      });

      // If absolutely no local stays exist, use showcase template to seed
      if (stayMap.size === 0) {
        SHOWCASE_STAYS.forEach((s) => {
          stayMap.set(s.id, { ...s, userId: user.uid });
        });
      }

      // Gather all agenda items
      const existingAgendas = userAgendaItems;
      const cachedAgendas = loadLocalData<AgendaItem[]>(getUserCacheKey(user.uid, 'agenda'), []);
      const localGuestAgendas = loadLocalData<AgendaItem[]>(LOCAL_AGENDA_KEY, []);
      const guestCachedAgendas = loadLocalData<AgendaItem[]>('stayplan_cloud_cache_guest-local-user_agenda', []);
      const agendaMap = new Map<string, AgendaItem>();
      [...guestCachedAgendas, ...localGuestAgendas, ...cachedAgendas, ...existingAgendas].forEach((a) => {
        if (a && a.id) {
          agendaMap.set(a.id, { ...a, userId: user.uid });
        }
      });
      if (agendaMap.size === 0) {
        SHOWCASE_AGENDA_ITEMS.forEach((a) => agendaMap.set(a.id, { ...a, userId: user.uid }));
      }

      // Gather all checklist items
      const existingChecklists = userChecklistItems;
      const cachedChecklists = loadLocalData<ChecklistItem[]>(getUserCacheKey(user.uid, 'checklist'), []);
      const localGuestChecklists = loadLocalData<ChecklistItem[]>(LOCAL_CHECKLIST_KEY, []);
      const guestCachedChecklists = loadLocalData<ChecklistItem[]>('stayplan_cloud_cache_guest-local-user_checklist', []);
      const checklistMap = new Map<string, ChecklistItem>();
      [...guestCachedChecklists, ...localGuestChecklists, ...cachedChecklists, ...existingChecklists].forEach((c) => {
        if (c && c.id) {
          checklistMap.set(c.id, { ...c, userId: user.uid });
        }
      });
      if (checklistMap.size === 0) {
        SHOWCASE_CHECKLIST_ITEMS.forEach((c) => checklistMap.set(c.id, { ...c, userId: user.uid }));
      }

      // 2. Perform write batch to Firestore for all collected items
      const staysToPush = Array.from(stayMap.values());
      const batch = writeBatch(db);

      for (const stay of staysToPush) {
        const stayRef = doc(db, 'users', user.uid, 'stays', stay.id);
        batch.set(stayRef, sanitizeForFirestore<Stay>({ ...stay, userId: user.uid, updatedAt: Date.now() }), { merge: true });

        // Push matching agendas
        const matchingAgendas = Array.from(agendaMap.values()).filter((a) => a.stayId === stay.id);
        for (const ag of matchingAgendas) {
          const aRef = doc(db, 'users', user.uid, 'stays', stay.id, 'agendaItems', ag.id);
          batch.set(aRef, sanitizeForFirestore<AgendaItem>({ ...ag, userId: user.uid }), { merge: true });
        }

        // Push matching checklists
        const matchingChecklists = Array.from(checklistMap.values()).filter((c) => c.stayId === stay.id);
        for (const chk of matchingChecklists) {
          const cRef = doc(db, 'users', user.uid, 'stays', stay.id, 'checklistItems', chk.id);
          batch.set(cRef, sanitizeForFirestore<ChecklistItem>({ ...chk, userId: user.uid }), { merge: true });
        }
      }

      await batch.commit();

      // 3. Directly pull fresh ground-truth from Firestore to verify synchronization
      const staysSnapshot = await getDocs(collection(db, 'users', user.uid, 'stays'));
      const confirmedStays: Stay[] = [];
      const confirmedAgendas: AgendaItem[] = [];
      const confirmedChecklists: ChecklistItem[] = [];

      for (const stayDoc of staysSnapshot.docs) {
        const sData = stayDoc.data() as Stay;
        confirmedStays.push(sData);

        // Fetch subcollections for this stay
        try {
          const aSnap = await getDocs(collection(db, 'users', user.uid, 'stays', stayDoc.id, 'agendaItems'));
          aSnap.forEach((d) => confirmedAgendas.push(d.data() as AgendaItem));

          const cSnap = await getDocs(collection(db, 'users', user.uid, 'stays', stayDoc.id, 'checklistItems'));
          cSnap.forEach((d) => confirmedChecklists.push(d.data() as ChecklistItem));
        } catch (subErr) {
          console.warn(`Subcollection pull note for stay ${stayDoc.id}:`, subErr);
        }
      }

      // Sort descending by date
      confirmedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setUserStays(confirmedStays);
      setUserAgendaItems(confirmedAgendas);
      setUserChecklistItems(confirmedChecklists);

      saveLocalData(getUserCacheKey(user.uid, 'stays'), confirmedStays);
      saveLocalData(getUserCacheKey(user.uid, 'agenda'), confirmedAgendas);
      saveLocalData(getUserCacheKey(user.uid, 'checklist'), confirmedChecklists);

      if (confirmedStays.length > 0) {
        setActiveStayIdState((prev) => (prev && confirmedStays.some((s) => s.id === prev) ? prev : confirmedStays[0].id));
      }

      const now = Date.now();
      setLastSyncTime(now);
      setHasUnsavedChanges(false);
      setUnsavedCount(0);

      return {
        success: true,
        message: `Berjaya di-sync! ${confirmedStays.length} pelan stay, ${confirmedAgendas.length} aktiviti dan ${confirmedChecklists.length} item semakan aktif di akaun Google anda.`,
        staysCount: confirmedStays.length
      };
    } catch (err: any) {
      console.error('Force Cloud Sync Error:', err);
      const errMsg = err?.message || 'Gagal menyelaraskan dengan Firestore';
      setSyncError(errMsg);
      return { success: false, message: `Ralat sync: ${errMsg}`, staysCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [user, userStays, userAgendaItems, userChecklistItems]);

  // One-click Save & Sync to Google Account
  const saveAndSync = useCallback(
    async (customSuccessMsg?: string): Promise<{ success: boolean; message: string; staysCount: number }> => {
      if (!user || user.uid === 'guest-local-user') {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menyimpan dan sync semua data ke akaun Google anda.');
        return {
          success: false,
          message: 'Sila log masuk dengan Google untuk menyimpan dan sync ke Google Account.',
          staysCount: 0
        };
      }

      const res = await forceSyncWithCloud();
      if (res.success) {
        setHasUnsavedChanges(false);
        setUnsavedCount(0);
        setSaveFeedback({
          type: 'success',
          message: customSuccessMsg || 'Semua perubahan berjaya disimpan & di-sync ke Akaun Google anda!',
          timestamp: Date.now()
        });
      } else {
        setSaveFeedback({
          type: 'error',
          message: res.message || 'Gagal menyimpan ke Akaun Google.',
          timestamp: Date.now()
        });
      }
      return res;
    },
    [user, forceSyncWithCloud, requireAuth]
  );

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

    // Standard Firebase Authenticated User (Google Account)
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

    // Safety timeout so UI never hangs indefinitely
    const safetyTimeout = setTimeout(() => {
      setIsLoadingStays(false);
    }, 2000);

    // Auto-migrate any local guest or showcase data created before login
    const autoMigrateAndEnsureCloudSeed = async () => {
      try {
        const localStays = loadLocalData<Stay[]>(LOCAL_STAYS_KEY, []);
        const localAgenda = loadLocalData<AgendaItem[]>(LOCAL_AGENDA_KEY, []);
        const localChecklist = loadLocalData<ChecklistItem[]>(LOCAL_CHECKLIST_KEY, []);
        const guestCacheStays = loadLocalData<Stay[]>('stayplan_cloud_cache_guest-local-user_stays', []);

        const candidateStays = [...localStays, ...guestCacheStays];

        if (candidateStays.length > 0) {
          const batch = writeBatch(db);
          for (const s of candidateStays) {
            const sanitizedStay = sanitizeForFirestore<Stay>({
              ...s,
              userId: user.uid,
              updatedAt: Date.now()
            });
            const stayDocRef = doc(db, 'users', user.uid, 'stays', s.id);
            batch.set(stayDocRef, sanitizedStay, { merge: true });

            const sAgendas = localAgenda.filter((a) => a.stayId === s.id);
            for (const a of sAgendas) {
              const sanitizedAgenda = sanitizeForFirestore<AgendaItem>({
                ...a,
                userId: user.uid
              });
              const aRef = doc(db, 'users', user.uid, 'stays', s.id, 'agendaItems', a.id);
              batch.set(aRef, sanitizedAgenda, { merge: true });
            }

            const sChecklists = localChecklist.filter((c) => c.stayId === s.id);
            for (const c of sChecklists) {
              const sanitizedChecklist = sanitizeForFirestore<ChecklistItem>({
                ...c,
                userId: user.uid
              });
              const cRef = doc(db, 'users', user.uid, 'stays', s.id, 'checklistItems', c.id);
              batch.set(cRef, sanitizedChecklist, { merge: true });
            }
          }
          await batch.commit();

          localStorage.removeItem(LOCAL_STAYS_KEY);
          localStorage.removeItem(LOCAL_AGENDA_KEY);
          localStorage.removeItem(LOCAL_CHECKLIST_KEY);
          localStorage.removeItem(LOCAL_ACTIVE_ID_KEY);
        } else {
          // If Firestore is completely empty on first sign-in, automatically seed default stays into user's Firestore
          const checkSnap = await getDocs(collection(db, 'users', user.uid, 'stays'));
          if (checkSnap.empty) {
            const batch = writeBatch(db);
            for (const s of SHOWCASE_STAYS) {
              const stayDocRef = doc(db, 'users', user.uid, 'stays', s.id);
              batch.set(stayDocRef, sanitizeForFirestore<Stay>({ ...s, userId: user.uid, updatedAt: Date.now() }), { merge: true });

              const sAgendas = SHOWCASE_AGENDA_ITEMS.filter((a) => a.stayId === s.id);
              for (const a of sAgendas) {
                const aRef = doc(db, 'users', user.uid, 'stays', s.id, 'agendaItems', a.id);
                batch.set(aRef, sanitizeForFirestore<AgendaItem>({ ...a, userId: user.uid }), { merge: true });
              }

              const sChecklists = SHOWCASE_CHECKLIST_ITEMS.filter((c) => c.stayId === s.id);
              for (const c of sChecklists) {
                const cRef = doc(db, 'users', user.uid, 'stays', s.id, 'checklistItems', c.id);
                batch.set(cRef, sanitizeForFirestore<ChecklistItem>({ ...c, userId: user.uid }), { merge: true });
              }
            }
            await batch.commit();
          }
        }
      } catch (migErr) {
        console.warn('Auto-migration and cloud seed note:', migErr);
      }
    };

    autoMigrateAndEnsureCloudSeed();

    // Listen to all stays for current authenticated user
    const staysColRef = collection(db, 'users', user.uid, 'stays');

    const unsubscribe = onSnapshot(
      staysColRef,
      (snapshot) => {
        clearTimeout(safetyTimeout);
        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

        // Sort descending by createdAt (or updatedAt) reliably in-memory
        fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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

        setLastSyncTime(Date.now());
        setIsLoadingStays(false);
      },
      (error) => {
        clearTimeout(safetyTimeout);
        console.warn('Firestore stays sync note:', error.message || error);
        setSyncError(error.message || 'Ralat sambungan Firestore');
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
      if (!user) {
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
          // Keep items from other stays intact so switching stays preserves loaded state
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
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
          // Keep items from other stays intact
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
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

  // --- ACTIONS (Optimistic & Non-blocking with guaranteed Firestore synchronization) ---

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
      markChangesMade();
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

      // 2. Dispatch to Firestore with sanitization so it is 100% saved across all devices
      (async () => {
        try {
          setIsSyncing(true);
          const sanitizedStay = sanitizeForFirestore<Stay>(newStay);
          const stayDoc = doc(db, 'users', user.uid, 'stays', stayId);
          await setDoc(stayDoc, sanitizedStay);

          const batch = writeBatch(db);
          starterChecklist.forEach((item) => {
            const itemRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'checklistItems'), item.id);
            batch.set(itemRef, sanitizeForFirestore<ChecklistItem>(item));
          });

          const day1Ref = doc(collection(db, 'users', user.uid, 'stays', stayId, 'agendaItems'), starterAgenda.id);
          batch.set(day1Ref, sanitizeForFirestore<AgendaItem>(starterAgenda));

          await batch.commit();
        } catch (err) {
          console.error('Firestore addStay sync error:', err);
        } finally {
          setIsSyncing(false);
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

      markChangesMade();
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
          setIsSyncing(true);
          const stayRef = doc(db, 'users', user.uid, 'stays', id);
          const sanitizedUpdates = sanitizeForFirestore<Partial<Stay>>({
            ...updates,
            updatedAt: Date.now()
          });
          await updateDoc(stayRef, sanitizedUpdates);
        } catch (err) {
          console.error('Firestore updateStay sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, requireAuth, markChangesMade]
  );

  const deleteStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam Stay.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
          const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));

          const batch = writeBatch(db);
          agendaSnap.forEach((d) => batch.delete(d.ref));
          checklistSnap.forEach((d) => batch.delete(d.ref));
          batch.delete(doc(db, 'users', user.uid, 'stays', id));
          await batch.commit();
        } catch (err) {
          console.error('Firestore deleteStay sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, requireAuth, markChangesMade]
  );

  const duplicateStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menduplikasi pelan Stay.');
        return;
      }

      const target = userStays.find((s) => s.id === id);
      if (!target) return;

      markChangesMade();
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
          setIsSyncing(true);
          const batch = writeBatch(db);
          const stayRef = doc(db, 'users', user.uid, 'stays', newStayId);
          batch.set(stayRef, sanitizeForFirestore<Stay>(duplicatedStay));

          dupAgendas.forEach((item) => {
            const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'agendaItems'), item.id);
            batch.set(itemRef, sanitizeForFirestore<AgendaItem>(item));
          });

          dupChecklists.forEach((item) => {
            const itemRef = doc(collection(db, 'users', user.uid, 'stays', newStayId, 'checklistItems'), item.id);
            batch.set(itemRef, sanitizeForFirestore<ChecklistItem>(item));
          });

          await batch.commit();
        } catch (err) {
          console.error('Firestore duplicateStay sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, userStays, userAgendaItems, userChecklistItems, requireAuth, markChangesMade]
  );

  const addAgendaItem = useCallback(
    async (item: Omit<AgendaItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menambah aktiviti ke agenda anda.');
        return '';
      }

      markChangesMade();
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

      // 2. Dispatch Firestore write in background with sanitization
      (async () => {
        try {
          setIsSyncing(true);
          const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
          const docRef = doc(colRef, newItemId);
          await setDoc(docRef, sanitizeForFirestore<AgendaItem>(newItem));
        } catch (err) {
          console.error('Firestore addAgendaItem error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();

      return newItemId;
    },
    [user, activeStay, requireAuth, markChangesMade]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini aktiviti.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await updateDoc(itemRef, sanitizeForFirestore<Partial<AgendaItem>>(updates));
        } catch (err) {
          console.error('Firestore updateAgendaItem error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, requireAuth, markChangesMade]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!user || !activeStay || updatesList.length === 0) return;

      markChangesMade();
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
          setIsSyncing(true);
          const batch = writeBatch(db);
          for (const item of updatesList) {
            const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', item.id);
            batch.update(itemRef, sanitizeForFirestore<Partial<AgendaItem>>(item.updates));
          }
          await batch.commit();
        } catch (err) {
          console.error('Firestore batchUpdateAgendaItems error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, markChangesMade]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam aktiviti.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await deleteDoc(itemRef);
        } catch (err) {
          console.error('Firestore deleteAgendaItem error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, requireAuth, markChangesMade]
  );

  const toggleAgendaComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menanda aktiviti siap.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
          await updateDoc(itemRef, { isCompleted: nextCompleted });
        } catch (err) {
          console.error('Firestore toggleAgendaComplete error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, userAgendaItems, requireAuth, markChangesMade]
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, 'id' | 'userId'>): Promise<string> => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menambah item senarai semak.');
        return '';
      }

      markChangesMade();
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
          setIsSyncing(true);
          const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
          const docRef = doc(colRef, newItemId);
          await setDoc(docRef, sanitizeForFirestore<ChecklistItem>(newItem));
        } catch (err) {
          console.error('Firestore addChecklistItem error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();

      return newItemId;
    },
    [user, activeStay, requireAuth, markChangesMade]
  );

  const toggleChecklistComplete = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk menanda senarai semak.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
          await updateDoc(itemRef, { isCompleted: nextCompleted });
        } catch (err) {
          console.error('Firestore toggleChecklistComplete error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, userChecklistItems, requireAuth, markChangesMade]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam item.');
        return;
      }

      markChangesMade();
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
          setIsSyncing(true);
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
          await deleteDoc(itemRef);
        } catch (err) {
          console.error('Firestore deleteChecklistItem error:', err);
        } finally {
          setIsSyncing(false);
        }
      })();
    },
    [user, activeStay, requireAuth, markChangesMade]
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
        isSyncing,
        lastSyncTime,
        syncError,
        hasUnsavedChanges,
        unsavedCount,
        saveFeedback,
        saveAndSync,
        markChangesMade,
        clearSaveFeedback,
        forceSyncWithCloud,
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

