import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayType, SyncStatus } from '../types';
import { SHOWCASE_STAYS, SHOWCASE_AGENDA_ITEMS, SHOWCASE_CHECKLIST_ITEMS } from '../data/defaultStays';
import { getLocalTodayDate, getLocalDateWithOffset } from '../utils/formatters';
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
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncError: string | null;
  hasUnsavedChanges: boolean;
  unsavedCount: number;
  saveFeedback: { type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null;
  saveAndSync: (customSuccessMsg?: string) => Promise<{ success: boolean; message: string; staysCount: number }>;
  refreshFromCloud: () => Promise<{ success: boolean; message: string; staysCount: number }>;
  forceSyncWithCloud: () => Promise<{ success: boolean; message: string; staysCount: number }>;
  markChangesMade: () => void;
  clearSaveFeedback: () => void;
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

// Storage keys for Guest-only mode
const LOCAL_STAYS_KEY = 'stayplan_local_stays';
const LOCAL_AGENDA_KEY = 'stayplan_local_agenda';
const LOCAL_CHECKLIST_KEY = 'stayplan_local_checklist';
const LOCAL_ACTIVE_ID_KEY = 'stayplan_local_active_id';

// Read-only offline cache key helper
const getUserCacheKey = (uid: string, suffix: string) => `stayplan_cache_${uid}_${suffix}`;

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

  // State management
  const [userStays, setUserStays] = useState<Stay[]>([]);
  const [userAgendaItems, setUserAgendaItems] = useState<AgendaItem[]>([]);
  const [userChecklistItems, setUserChecklistItems] = useState<ChecklistItem[]>([]);
  const [activeStayId, setActiveStayIdState] = useState<string | null>(null);

  const [isLoadingStays, setIsLoadingStays] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'SAVED' : 'OFFLINE'));
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Unsaved changes & feedback
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [unsavedCount, setUnsavedCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; timestamp: number } | null>(null);

  const isPersonalMode = !!user;

  // Listen to network status (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('SAVED');
      setSyncError(null);
    };
    const handleOffline = () => {
      setSyncStatus('OFFLINE');
      setSyncError('Tiada sambungan internet (Mod Luar Talian).');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const markChangesMade = useCallback(() => {
    // Keep for legacy callers if needed, but in standard flow changes are directly synced
  }, []);

  const clearSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  // ----------------------------------------------------------------------------------
  // 1. REFRESH FROM CLOUD (Authoritative Firestore Read - Replaces Blind Force Sync)
  // ----------------------------------------------------------------------------------
  const refreshFromCloud = useCallback(async (): Promise<{ success: boolean; message: string; staysCount: number }> => {
    if (!user || user.uid === 'guest-local-user') {
      return { success: false, message: 'Sila log masuk dengan Google untuk memuat data.', staysCount: 0 };
    }

    if (!navigator.onLine) {
      setSyncStatus('OFFLINE');
      return { success: false, message: 'Peranti anda sedang di luar talian (Offline).', staysCount: userStays.length };
    }

    try {
      setIsSyncing(true);
      setSyncStatus('SYNCING');
      setSyncError(null);

      // Fetch all user stays directly from Firestore
      const staysColRef = collection(db, 'users', user.uid, 'stays');
      const staysSnap = await getDocs(staysColRef);

      const fetchedStays: Stay[] = [];
      staysSnap.forEach((docSnap) => {
        fetchedStays.push(docSnap.data() as Stay);
      });

      fetchedStays.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUserStays(fetchedStays);
      saveLocalData(getUserCacheKey(user.uid, 'stays'), fetchedStays);

      // Determine active stay
      let currentActive = activeStayId;
      if (!currentActive || !fetchedStays.some((s) => s.id === currentActive)) {
        currentActive = fetchedStays.length > 0 ? fetchedStays[0].id : null;
        setActiveStayIdState(currentActive);
      }

      // If active stay exists, fetch its subcollections
      if (currentActive) {
        const agendaColRef = collection(db, 'users', user.uid, 'stays', currentActive, 'agendaItems');
        const checklistColRef = collection(db, 'users', user.uid, 'stays', currentActive, 'checklistItems');

        const [agendaSnap, checklistSnap] = await Promise.all([
          getDocs(agendaColRef),
          getDocs(checklistColRef)
        ]);

        const fetchedAgendas: AgendaItem[] = [];
        agendaSnap.forEach((d) => fetchedAgendas.push(d.data() as AgendaItem));

        const fetchedChecklists: ChecklistItem[] = [];
        checklistSnap.forEach((d) => fetchedChecklists.push(d.data() as ChecklistItem));

        setUserAgendaItems(fetchedAgendas);
        setUserChecklistItems(fetchedChecklists);

        saveLocalData(getUserCacheKey(user.uid, 'agenda'), fetchedAgendas);
        saveLocalData(getUserCacheKey(user.uid, 'checklist'), fetchedChecklists);
      }

      const now = Date.now();
      setLastSyncTime(now);
      setSyncStatus('SYNCED');
      setHasUnsavedChanges(false);
      setUnsavedCount(0);

      return {
        success: true,
        message: `Berjaya memuat semula ${fetchedStays.length} stay.`,
        staysCount: fetchedStays.length
      };
    } catch (err: any) {
      console.error('Refresh From Cloud Error:', err);
      const errMsg = err?.message || 'Gagal memuat semula data.';
      setSyncError(errMsg);
      setSyncStatus('ERROR');
      return { success: false, message: errMsg, staysCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [user, activeStayId, userStays.length]);

  // Alias for backward compatibility with existing UI components
  const forceSyncWithCloud = refreshFromCloud;

  const saveAndSync = useCallback(
    async (customSuccessMsg?: string): Promise<{ success: boolean; message: string; staysCount: number }> => {
      if (!user || user.uid === 'guest-local-user') {
        requireAuth(() => {}, 'Log masuk dengan Google untuk sync semua data ke akaun anda.');
        return {
          success: false,
          message: 'Sila log masuk dengan Google untuk sync ke akaun anda.',
          staysCount: 0
        };
      }

      const res = await refreshFromCloud();
      if (res.success) {
        setSaveFeedback({
          type: 'success',
          message: customSuccessMsg || 'Data telah di-sync ke akaun anda.',
          timestamp: Date.now()
        });
      } else {
        setSaveFeedback({
          type: 'error',
          message: res.message || 'Sync Failed.',
          timestamp: Date.now()
        });
      }
      return res;
    },
    [user, refreshFromCloud, requireAuth]
  );

  // ----------------------------------------------------------------------------------
  // 2. DATA SUBSCRIPTION & HYDRATION (Pure Firestore Authority - No Guest Data Upload)
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      // Demo / Logged-out showcase view
      setUserStays([]);
      setUserAgendaItems([]);
      setUserChecklistItems([]);
      setActiveStayIdState(SHOWCASE_STAYS[0]?.id || null);
      setIsLoadingStays(false);
      setSyncStatus('SAVED');
      return;
    }

    if (user.uid === 'guest-local-user') {
      // Guest local storage mode (STRICTLY ISOLATED TO LOCAL STORAGE)
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
      setSyncStatus('SAVED');
      return;
    }

    // AUTHENTICATED GOOGLE USER: Read directly from Firestore
    setIsLoadingStays(true);
    setSyncStatus('SYNCING');

    // Fast-start from local read cache if available (for instant paint), but Firestore is the authority
    const cachedStays = loadLocalData<Stay[]>(getUserCacheKey(user.uid, 'stays'), []);
    if (cachedStays.length > 0) {
      setUserStays(cachedStays);
      const cachedActive = loadLocalData<string | null>(getUserCacheKey(user.uid, 'active_id'), null);
      if (cachedActive && cachedStays.some((s) => s.id === cachedActive)) {
        setActiveStayIdState(cachedActive);
      } else {
        setActiveStayIdState(cachedStays[0].id);
      }
    }

    const staysColRef = collection(db, 'users', user.uid, 'stays');

    // Realtime subscription to the user's stays collection
    const unsubscribeStays = onSnapshot(
      staysColRef,
      (snapshot) => {
        const fetchedStays: Stay[] = [];
        snapshot.forEach((docSnap) => {
          fetchedStays.push(docSnap.data() as Stay);
        });

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

        setIsLoadingStays(false);
        setSyncStatus('SYNCED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      },
      (error) => {
        console.error('Firestore stays subscription error:', error);
        setSyncError(error.message || 'Ralat sambungan Firestore');
        setSyncStatus('ERROR');
        setIsLoadingStays(false);
      }
    );

    return () => {
      unsubscribeStays();
    };
  }, [user]);

  // ----------------------------------------------------------------------------------
  // 3. REALTIME SUBSCRIPTION FOR ACTIVE STAY'S SUBCOLLECTIONS (Agenda & Checklist)
  // ----------------------------------------------------------------------------------
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
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
          saveLocalData(getUserCacheKey(user.uid, 'agenda'), merged);
          return merged;
        });
        setLastSyncTime(Date.now());
      },
      (err) => {
        console.warn('Agenda items sync note:', err);
      }
    );

    const unsubChecklist = onSnapshot(
      checklistRef,
      (snapshot) => {
        const items: ChecklistItem[] = [];
        snapshot.forEach((d) => items.push(d.data() as ChecklistItem));

        setUserChecklistItems((prev) => {
          const otherStaysItems = prev.filter((i) => i.stayId !== activeStayId);
          const merged = [...otherStaysItems, ...items];
          saveLocalData(getUserCacheKey(user.uid, 'checklist'), merged);
          return merged;
        });
        setLastSyncTime(Date.now());
      },
      (err) => {
        console.warn('Checklist items sync note:', err);
      }
    );

    return () => {
      unsubAgenda();
      unsubChecklist();
    };
  }, [user, activeStayId]);

  // Active stay data selectors
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

  // ----------------------------------------------------------------------------------
  // 4. AWAITED FIRESTORE WRITE MUTATIONS (Server-Authoritative, No Silent Detached Writes)
  // ----------------------------------------------------------------------------------

  const addStay = useCallback(
    async (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<string> => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mencipta dan menyimpan StayPlan peribadi.');
        return '';
      }

      const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const newStay: Stay = {
        ...newStayData,
        id: stayId,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      const starterChecklist: ChecklistItem[] = [
        { id: `chk_${now}_1`, stayId, userId: user.uid, category: 'essentials', text: 'Pakaian & pakaian solat', isCompleted: false, createdAt: now, updatedAt: now },
        { id: `chk_${now}_2`, stayId, userId: user.uid, category: 'essentials', text: 'Pengecas telefon & ubatan harian', isCompleted: false, createdAt: now, updatedAt: now },
        { id: `chk_${now}_3`, stayId, userId: user.uid, category: 'food_gifts', text: 'Buah tangan / bekalan makanan', isCompleted: false, createdAt: now, updatedAt: now }
      ];

      const starterAgenda: AgendaItem = {
        id: `agn_${now}_1`,
        stayId,
        userId: user.uid,
        dayNumber: 1,
        timeSlot: 'afternoon',
        timeSpecific: '03:00 PM',
        title: 'Ketibaan & Daftar Masuk',
        description: 'Tiba di lokasi, susun barang dan rehat santai.',
        priority: 'must_do',
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic state update
      setUserStays((prev) => [newStay, ...prev]);
      setUserChecklistItems((prev) => [...prev, ...starterChecklist]);
      setUserAgendaItems((prev) => [...prev, starterAgenda]);
      setActiveStayIdState(stayId);

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_STAYS_KEY, [newStay, ...userStays]);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, stayId);
        return stayId;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const stayDocRef = doc(db, 'users', user.uid, 'stays', stayId);
        const batch = writeBatch(db);

        batch.set(stayDocRef, sanitizeForFirestore<Stay>(newStay));

        starterChecklist.forEach((item) => {
          const itemRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'checklistItems'), item.id);
          batch.set(itemRef, sanitizeForFirestore<ChecklistItem>(item));
        });

        const agendaRef = doc(collection(db, 'users', user.uid, 'stays', stayId, 'agendaItems'), starterAgenda.id);
        batch.set(agendaRef, sanitizeForFirestore<AgendaItem>(starterAgenda));

        await batch.commit();

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menyimpan Stay ke Cloud Firestore.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return stayId;
    },
    [user, userStays, requireAuth]
  );

  const updateStay = useCallback(
    async (id: string, updates: Partial<Stay>) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini maklumat Stay.');
        return;
      }

      const now = Date.now();
      const sanitizedUpdates = sanitizeForFirestore<Partial<Stay>>({
        ...updates,
        updatedAt: now
      });

      // Optimistic UI update
      setUserStays((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now } : s)));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_STAYS_KEY, userStays.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: now } : s)));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const stayRef = doc(db, 'users', user.uid, 'stays', id);
        await updateDoc(stayRef, sanitizedUpdates);

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore updateStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, userStays, requireAuth]
  );

  const deleteStay = useCallback(
    async (id: string) => {
      if (!user) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam Stay.');
        return;
      }

      // Optimistic UI removal
      setUserStays((prev) => {
        const next = prev.filter((s) => s.id !== id);
        const nextActive = next.length > 0 ? next[0].id : null;
        setActiveStayIdState(nextActive);
        return next;
      });
      setUserAgendaItems((prev) => prev.filter((a) => a.stayId !== id));
      setUserChecklistItems((prev) => prev.filter((c) => c.stayId !== id));

      if (user.uid === 'guest-local-user') {
        const nextStays = userStays.filter((s) => s.id !== id);
        saveLocalData(LOCAL_STAYS_KEY, nextStays);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, nextStays[0]?.id || null);
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const agendaSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'agendaItems'));
        const checklistSnap = await getDocs(collection(db, 'users', user.uid, 'stays', id, 'checklistItems'));

        const batch = writeBatch(db);
        agendaSnap.forEach((d) => batch.delete(d.ref));
        checklistSnap.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, 'users', user.uid, 'stays', id));

        await batch.commit();

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
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
      const now = Date.now();
      const duplicatedStay: Stay = {
        ...target,
        id: newStayId,
        userId: user.uid,
        title: `${target.title} (Salinan)`,
        createdAt: now,
        updatedAt: now
      };

      const sourceAgendas = userAgendaItems.filter((a) => a.stayId === id);
      const dupAgendas: AgendaItem[] = sourceAgendas.map((a, i) => ({
        ...a,
        id: `agn_${now}_${i}`,
        stayId: newStayId,
        userId: user.uid,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      }));

      const sourceChecklists = userChecklistItems.filter((c) => c.stayId === id);
      const dupChecklists: ChecklistItem[] = sourceChecklists.map((c, i) => ({
        ...c,
        id: `chk_${now}_${i}`,
        stayId: newStayId,
        userId: user.uid,
        isCompleted: false,
        createdAt: now,
        updatedAt: now
      }));

      // Optimistic updates
      setUserStays((prev) => [duplicatedStay, ...prev]);
      setUserAgendaItems((prev) => [...prev, ...dupAgendas]);
      setUserChecklistItems((prev) => [...prev, ...dupChecklists]);
      setActiveStayIdState(newStayId);

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_STAYS_KEY, [duplicatedStay, ...userStays]);
        saveLocalData(LOCAL_ACTIVE_ID_KEY, newStayId);
        return;
      }

      try {
        setSyncStatus('SAVING');
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

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore duplicateStay error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menduplikasi Stay di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
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
      const now = Date.now();
      const newItem: AgendaItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserAgendaItems((prev) => [...prev, newItem]);

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_AGENDA_KEY, [...userAgendaItems, newItem]);
        return newItemId;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems');
        const docRef = doc(colRef, newItemId);
        await setDoc(docRef, sanitizeForFirestore<AgendaItem>(newItem));

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menambah aktiviti ke Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return newItemId;
    },
    [user, activeStay, userAgendaItems, requireAuth]
  );

  const updateAgendaItem = useCallback(
    async (id: string, updates: Partial<AgendaItem>) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk mengemas kini aktiviti.');
        return;
      }

      const now = Date.now();
      const sanitizedUpdates = sanitizeForFirestore<Partial<AgendaItem>>({
        ...updates,
        updatedAt: now
      });

      // Optimistic update
      setUserAgendaItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_AGENDA_KEY, userAgendaItems.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
        await updateDoc(itemRef, sanitizedUpdates);

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore updateAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, activeStay, userAgendaItems, requireAuth]
  );

  const batchUpdateAgendaItems = useCallback(
    async (updatesList: Array<{ id: string; updates: Partial<AgendaItem> }>) => {
      if (!user || !activeStay || updatesList.length === 0) return;

      const now = Date.now();
      const updateMap = new Map(updatesList.map((u) => [u.id, u.updates]));

      // Optimistic update
      setUserAgendaItems((prev) =>
        prev.map((a) => {
          const up = updateMap.get(a.id);
          return up ? { ...a, ...up, updatedAt: now } : a;
        })
      );

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_AGENDA_KEY, userAgendaItems);
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const batch = writeBatch(db);
        for (const item of updatesList) {
          const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', item.id);
          batch.update(itemRef, sanitizeForFirestore<Partial<AgendaItem>>({ ...item.updates, updatedAt: now }));
        }
        await batch.commit();

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore batchUpdateAgendaItems error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini susunan aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, activeStay, userAgendaItems]
  );

  const deleteAgendaItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam aktiviti.');
        return;
      }

      // Optimistic removal
      setUserAgendaItems((prev) => prev.filter((a) => a.id !== id));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_AGENDA_KEY, userAgendaItems.filter((a) => a.id !== id));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
        await deleteDoc(itemRef);

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteAgendaItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, activeStay, userAgendaItems, requireAuth]
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
      const now = Date.now();

      // Optimistic update
      setUserAgendaItems((prev) => prev.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted, updatedAt: now } : a)));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_AGENDA_KEY, userAgendaItems.map((a) => (a.id === id ? { ...a, isCompleted: nextCompleted, updatedAt: now } : a)));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'agendaItems', id);
        await updateDoc(itemRef, { isCompleted: nextCompleted, updatedAt: now });

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore toggleAgendaComplete error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menanda aktiviti di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
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
      const now = Date.now();
      const newItem: ChecklistItem = {
        ...item,
        id: newItemId,
        stayId: activeStay.id,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      };

      // Optimistic update
      setUserChecklistItems((prev) => [...prev, newItem]);

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_CHECKLIST_KEY, [...userChecklistItems, newItem]);
        return newItemId;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const colRef = collection(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems');
        const docRef = doc(colRef, newItemId);
        await setDoc(docRef, sanitizeForFirestore<ChecklistItem>(newItem));

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore addChecklistItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal menambah item senarai semak ke Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }

      return newItemId;
    },
    [user, activeStay, userChecklistItems, requireAuth]
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
      const now = Date.now();

      // Optimistic update
      setUserChecklistItems((prev) => prev.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted, updatedAt: now } : c)));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_CHECKLIST_KEY, userChecklistItems.map((c) => (c.id === id ? { ...c, isCompleted: nextCompleted, updatedAt: now } : c)));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
        await updateDoc(itemRef, { isCompleted: nextCompleted, updatedAt: now });

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore toggleChecklistComplete error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal mengemas kini item senarai semak di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, activeStay, userChecklistItems, requireAuth]
  );

  const deleteChecklistItem = useCallback(
    async (id: string) => {
      if (!user || !activeStay) {
        requireAuth(() => {}, 'Log masuk dengan Google untuk memadam item.');
        return;
      }

      // Optimistic removal
      setUserChecklistItems((prev) => prev.filter((c) => c.id !== id));

      if (user.uid === 'guest-local-user') {
        saveLocalData(LOCAL_CHECKLIST_KEY, userChecklistItems.filter((c) => c.id !== id));
        return;
      }

      try {
        setSyncStatus('SAVING');
        setIsSyncing(true);

        const itemRef = doc(db, 'users', user.uid, 'stays', activeStay.id, 'checklistItems', id);
        await deleteDoc(itemRef);

        setSyncStatus('SAVED');
        setLastSyncTime(Date.now());
        setSyncError(null);
      } catch (err: any) {
        console.error('Firestore deleteChecklistItem error:', err);
        setSyncStatus('ERROR');
        setSyncError(err.message || 'Gagal memadam item senarai semak di Cloud.');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, activeStay, userChecklistItems, requireAuth]
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

      const startDate = getLocalTodayDate();
      const endDate = getLocalDateWithOffset(durationDays - 1, startDate);

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
        syncStatus,
        lastSyncTime,
        syncError,
        hasUnsavedChanges,
        unsavedCount,
        saveFeedback,
        saveAndSync,
        refreshFromCloud,
        forceSyncWithCloud,
        markChangesMade,
        clearSaveFeedback,
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
