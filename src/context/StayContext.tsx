import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Stay, AgendaItem, ChecklistItem, StayData } from '../types';
import { INITIAL_STAYS, INITIAL_AGENDA_ITEMS, INITIAL_CHECKLIST_ITEMS } from '../data/defaultStays';

const STORAGE_KEY = 'stayplan_data_v1';

interface StayContextType {
  stays: Stay[];
  activeStay: Stay | null;
  activeStayId: string | null;
  setActiveStayId: (id: string) => void;
  agendaItems: AgendaItem[];
  activeAgendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  activeChecklistItems: ChecklistItem[];
  addStay: (stay: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateStay: (id: string, updates: Partial<Stay>) => void;
  deleteStay: (id: string) => void;
  duplicateStay: (id: string) => void;
  addAgendaItem: (item: Omit<AgendaItem, 'id'>) => string;
  updateAgendaItem: (id: string, updates: Partial<AgendaItem>) => void;
  deleteAgendaItem: (id: string) => void;
  toggleAgendaComplete: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => string;
  toggleChecklistComplete: (id: string) => void;
  deleteChecklistItem: (id: string) => void;
  resetToDefaults: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
}

const StayContext = createContext<StayContextType | undefined>(undefined);

export const StayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<StayData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.stays) && parsed.stays.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load StayPlan from localStorage:', e);
    }
    return {
      stays: INITIAL_STAYS,
      agendaItems: INITIAL_AGENDA_ITEMS,
      checklistItems: INITIAL_CHECKLIST_ITEMS,
      activeStayId: INITIAL_STAYS[0].id
    };
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save StayPlan data:', e);
    }
  }, [data]);

  const activeStay = useMemo(() => {
    if (!data.stays || data.stays.length === 0) return null;
    const found = data.stays.find((s) => s.id === data.activeStayId);
    return found || data.stays[0];
  }, [data.stays, data.activeStayId]);

  const activeAgendaItems = useMemo(() => {
    if (!activeStay) return [];
    return data.agendaItems.filter((item) => item.stayId === activeStay.id);
  }, [data.agendaItems, activeStay]);

  const activeChecklistItems = useMemo(() => {
    if (!activeStay) return [];
    return data.checklistItems.filter((item) => item.stayId === activeStay.id);
  }, [data.checklistItems, activeStay]);

  const setActiveStayId = (id: string) => {
    setData((prev) => ({ ...prev, activeStayId: id }));
  };

  const addStay = (newStayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = 'stay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newStay: Stay = {
      ...newStayData,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Pre-populate some starter agenda slots for each day
    const starterAgenda: AgendaItem[] = [];
    for (let day = 1; day <= newStay.durationDays; day++) {
      if (day === 1) {
        starterAgenda.push({
          id: `agenda-${Date.now()}-${day}-1`,
          stayId: id,
          dayNumber: 1,
          timeSlot: 'morning',
          timeSpecific: '09:00 AM',
          title: 'Ketibaan & Sapaan / Check-in',
          description: 'Tiba di lokasi, susun barang & sembang pembuka.',
          priority: 'must_do',
          isCompleted: false
        });
      } else if (day === newStay.durationDays) {
        starterAgenda.push({
          id: `agenda-${Date.now()}-${day}-1`,
          stayId: id,
          dayNumber: day,
          timeSlot: 'morning',
          timeSpecific: '10:00 AM',
          title: 'Kemas Barang & Bersalaman / Check-out',
          description: 'Periksa barang elak tertinggal dan ucap selamat tinggal.',
          priority: 'must_do',
          isCompleted: false
        });
      }
    }

    // Pre-populate starter checklist
    const starterChecklist: ChecklistItem[] = [
      { id: `chk-${Date.now()}-1`, stayId: id, category: 'essentials', text: 'Pakaian & keperluan harian', isCompleted: false },
      { id: `chk-${Date.now()}-2`, stayId: id, category: 'essentials', text: 'Pengecas telefon & ubatan peribadi', isCompleted: false },
      { id: `chk-${Date.now()}-3`, stayId: id, category: 'food_gifts', text: 'Buah tangan / snek perjalanan', isCompleted: false }
    ];

    setData((prev) => ({
      ...prev,
      stays: [newStay, ...prev.stays],
      agendaItems: [...prev.agendaItems, ...starterAgenda],
      checklistItems: [...prev.checklistItems, ...starterChecklist],
      activeStayId: id
    }));

    return id;
  };

  const updateStay = (id: string, updates: Partial<Stay>) => {
    setData((prev) => ({
      ...prev,
      stays: prev.stays.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s))
    }));
  };

  const deleteStay = (id: string) => {
    setData((prev) => {
      const remainingStays = prev.stays.filter((s) => s.id !== id);
      const nextActiveId = remainingStays.length > 0 ? remainingStays[0].id : null;
      return {
        ...prev,
        stays: remainingStays,
        agendaItems: prev.agendaItems.filter((item) => item.stayId !== id),
        checklistItems: prev.checklistItems.filter((item) => item.stayId !== id),
        activeStayId: prev.activeStayId === id ? nextActiveId : prev.activeStayId
      };
    });
  };

  const duplicateStay = (id: string) => {
    const original = data.stays.find((s) => s.id === id);
    if (!original) return;

    const newId = 'stay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const duplicatedStay: Stay = {
      ...original,
      id: newId,
      title: `${original.title} (Salinan)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const originalAgendas = data.agendaItems.filter((a) => a.stayId === id);
    const duplicatedAgendas: AgendaItem[] = originalAgendas.map((a, idx) => ({
      ...a,
      id: `agenda-${Date.now()}-${idx}`,
      stayId: newId,
      isCompleted: false
    }));

    const originalChecklists = data.checklistItems.filter((c) => c.stayId === id);
    const duplicatedChecklists: ChecklistItem[] = originalChecklists.map((c, idx) => ({
      ...c,
      id: `chk-${Date.now()}-${idx}`,
      stayId: newId,
      isCompleted: false
    }));

    setData((prev) => ({
      ...prev,
      stays: [duplicatedStay, ...prev.stays],
      agendaItems: [...prev.agendaItems, ...duplicatedAgendas],
      checklistItems: [...prev.checklistItems, ...duplicatedChecklists],
      activeStayId: newId
    }));
  };

  const addAgendaItem = (item: Omit<AgendaItem, 'id'>): string => {
    const id = 'agenda-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newItem: AgendaItem = { ...item, id };
    setData((prev) => ({
      ...prev,
      agendaItems: [...prev.agendaItems, newItem]
    }));
    return id;
  };

  const updateAgendaItem = (id: string, updates: Partial<AgendaItem>) => {
    setData((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    }));
  };

  const deleteAgendaItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((item) => item.id !== id)
    }));
  };

  const toggleAgendaComplete = (id: string) => {
    setData((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    }));
  };

  const addChecklistItem = (item: Omit<ChecklistItem, 'id'>): string => {
    const id = 'chk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newItem: ChecklistItem = { ...item, id };
    setData((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, newItem]
    }));
    return id;
  };

  const toggleChecklistComplete = (id: string) => {
    setData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      )
    }));
  };

  const deleteChecklistItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((item) => item.id !== id)
    }));
  };

  const resetToDefaults = () => {
    const resetData: StayData = {
      stays: INITIAL_STAYS,
      agendaItems: INITIAL_AGENDA_ITEMS,
      checklistItems: INITIAL_CHECKLIST_ITEMS,
      activeStayId: INITIAL_STAYS[0].id
    };
    setData(resetData);
  };

  const exportDataJson = (): string => {
    return JSON.stringify(data, null, 2);
  };

  const importDataJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.stays) && parsed.stays.length > 0) {
        setData(parsed);
        return true;
      }
    } catch (err) {
      console.error('Invalid JSON imported', err);
    }
    return false;
  };

  return (
    <StayContext.Provider
      value={{
        stays: data.stays,
        activeStay,
        activeStayId: data.activeStayId,
        setActiveStayId,
        agendaItems: data.agendaItems,
        activeAgendaItems,
        checklistItems: data.checklistItems,
        activeChecklistItems,
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
        resetToDefaults,
        exportDataJson,
        importDataJson
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
