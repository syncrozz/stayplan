import React, { useState } from 'react';
import { StayProvider, useStay } from './context/StayContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AgendaBoard } from './components/AgendaBoard';
import { PackingChecklist } from './components/PackingChecklist';
import { StayInfoCard } from './components/StayInfoCard';
import { SupportModal } from './components/SupportModal';
import { CreateEditStayModal } from './components/CreateEditStayModal';
import { StaySelectorModal } from './components/StaySelectorModal';
import { ActivityModal } from './components/ActivityModal';
import { ShareExportModal } from './components/ShareExportModal';
import { STAY_TYPES } from './utils/constants';
import { formatDateRange } from './utils/formatters';
import { Stay, AgendaItem, TimeSlot } from './types';
import {
  Calendar,
  MapPin,
  Users,
  Edit3,
  Share2,
  ListChecks,
  Home,
  CalendarDays,
  Sparkles,
  Plus,
  Heart
} from 'lucide-react';

function StayPlanApp() {
  const {
    activeStay,
    activeAgendaItems,
    activeChecklistItems,
    addStay,
    updateStay,
    addAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    toggleAgendaComplete,
    addChecklistItem,
    toggleChecklistComplete,
    deleteChecklistItem
  } = useStay();

  // Modals state
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isStayListOpen, setIsStayListOpen] = useState(false);
  const [isCreateStayOpen, setIsCreateStayOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<Stay | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AgendaItem | null>(null);
  const [defaultDay, setDefaultDay] = useState(1);
  const [defaultSlot, setDefaultSlot] = useState<TimeSlot>('morning');

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<'agenda' | 'checklist' | 'info'>('agenda');

  const typeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

  const handleOpenNewActivity = (dayNumber: number, slot: TimeSlot) => {
    setEditingActivity(null);
    setDefaultDay(dayNumber);
    setDefaultSlot(slot);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (item: AgendaItem) => {
    setEditingActivity(item);
    setDefaultDay(item.dayNumber);
    setDefaultSlot(item.timeSlot);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (itemData: Omit<AgendaItem, 'id'>) => {
    if (editingActivity) {
      updateAgendaItem(editingActivity.id, itemData);
    } else {
      addAgendaItem(itemData);
    }
  };

  const handleOpenEditStay = (stayToEdit: Stay) => {
    setEditingStay(stayToEdit);
    setIsCreateStayOpen(true);
  };

  const handleSaveStay = (stayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingStay) {
      updateStay(editingStay.id, stayData);
    } else {
      addStay(stayData);
    }
  };

  if (!activeStay) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
        <div className="text-center space-y-4">
          <p className="text-stone-600">Tiada perancangan stay aktif.</p>
          <button
            onClick={() => {
              setEditingStay(null);
              setIsCreateStayOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl"
          >
            + Cipta Stay Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/60 font-sans text-stone-900">
      {/* App Header */}
      <Header
        onOpenNewStay={() => {
          setEditingStay(null);
          setIsCreateStayOpen(true);
        }}
        onOpenStayList={() => setIsStayListOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Stay Hero Card */}
        <section id="stay-hero-banner" className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Stay Title & Metadata */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 text-xs font-bold inline-flex items-center gap-1.5">
                  <span>{typeMeta?.icon}</span>
                  <span>{typeMeta?.label}</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">
                  {activeStay.durationDays} Hari {activeStay.durationDays > 1 ? `${activeStay.durationDays - 1} Malam` : ''}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {activeStay.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{activeStay.location || 'Lokasi Belum Ditetapkan'}</span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{formatDateRange(activeStay.startDate, activeStay.endDate, activeStay.durationDays)}</span>
                </span>

                {activeStay.companions && activeStay.companions.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{activeStay.companions.length} Ahli / Tetamu ({activeStay.companions.join(', ')})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Hero Quick Actions */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                id="hero-edit-stay-btn"
                onClick={() => handleOpenEditStay(activeStay)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sunting Stay</span>
              </button>

              <button
                id="hero-share-btn"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kongsi (WhatsApp)</span>
              </button>
            </div>

          </div>
        </section>

        {/* View Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'agenda'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Papan Agenda & Pacing ({activeAgendaItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'checklist'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Senarai Semak & Beg ({activeChecklistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'info'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Info Homestay & Wi-Fi</span>
          </button>
        </div>

        {/* Tab 1: Agenda Board */}
        {activeTab === 'agenda' && (
          <AgendaBoard
            stay={activeStay}
            agendaItems={activeAgendaItems}
            onAddItem={handleOpenNewActivity}
            onEditItem={handleOpenEditActivity}
            onDeleteItem={deleteAgendaItem}
            onToggleComplete={toggleAgendaComplete}
          />
        )}

        {/* Tab 2: Packing Checklist */}
        {activeTab === 'checklist' && (
          <PackingChecklist
            items={activeChecklistItems}
            stay={activeStay}
            onAddItem={addChecklistItem}
            onToggleItem={toggleChecklistComplete}
            onDeleteItem={deleteChecklistItem}
          />
        )}

        {/* Tab 3: Stay & Wi-Fi Info */}
        {activeTab === 'info' && (
          <StayInfoCard
            stay={activeStay}
            onEditStay={() => handleOpenEditStay(activeStay)}
          />
        )}

      </main>

      {/* App Footer */}
      <Footer onOpenSupport={() => setIsSupportOpen(true)} />

      {/* Modals */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <StaySelectorModal
        isOpen={isStayListOpen}
        onClose={() => setIsStayListOpen(false)}
        onNewStay={() => {
          setEditingStay(null);
          setIsCreateStayOpen(true);
        }}
        onEditStay={(stay) => handleOpenEditStay(stay)}
      />

      <CreateEditStayModal
        isOpen={isCreateStayOpen}
        onClose={() => setIsCreateStayOpen(false)}
        onSave={handleSaveStay}
        initialStay={editingStay}
      />

      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={handleSaveActivity}
        initialItem={editingActivity}
        defaultDayNumber={defaultDay}
        defaultTimeSlot={defaultSlot}
        stay={activeStay}
      />

      <ShareExportModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        stay={activeStay}
        agendaItems={activeAgendaItems}
        checklistItems={activeChecklistItems}
      />
    </div>
  );
}

export default function App() {
  return (
    <StayProvider>
      <StayPlanApp />
    </StayProvider>
  );
}
