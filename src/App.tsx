import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { AuthModal } from './components/AuthModal';
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
  Lock,
  Compass,
  ArrowRight,
  ShieldAlert
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
    deleteChecklistItem,
    isPersonalMode,
    isLoading
  } = useStay();

  const { isAuthenticated, openAuthModal } = useAuth();

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
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk menambah aktiviti ke dalam perancangan anda.');
      return;
    }
    setEditingActivity(null);
    setDefaultDay(dayNumber);
    setDefaultSlot(slot);
    setIsActivityModalOpen(true);
  };

  const handleOpenEditActivity = (item: AgendaItem) => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk menyunting aktiviti.');
      return;
    }
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
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk menyunting maklumat Stay.');
      return;
    }
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

  const handleOpenNewStay = () => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk mencipta pelan stay peribadi anda.');
      return;
    }
    setEditingStay(null);
    setIsCreateStayOpen(true);
  };

  // Quick Starter Templates for empty personal workspace
  const handleCreateStarterStay = (templateType: 'balik_kampung' | 'homestay' | 'short_getaway') => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (templateType === 'balik_kampung') {
      addStay({
        title: 'Balik Kampung Hujung Minggu',
        type: 'balik_kampung',
        durationDays: 3,
        startDate: today,
        endDate: end,
        location: 'Rumah Tok, Kampung',
        companions: ['Keluarga'],
        importantNotes: 'Fokus santai bersama orang tua dan elakkan jadual terlalu padat.'
      });
    } else if (templateType === 'homestay') {
      addStay({
        title: 'Percutian Homestay Keluarga',
        type: 'homestay',
        durationDays: 3,
        startDate: today,
        endDate: end,
        location: 'Homestay Santai',
        companions: ['Keluarga & Anak-anak'],
        importantNotes: 'Masa rehat dan aktiviti santai bersama anak-anak.'
      });
    } else {
      addStay({
        title: 'Weekend Getaway Santai',
        type: 'short_getaway',
        durationDays: 2,
        startDate: today,
        endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: 'Short Stay Destination',
        companions: ['Pasangan / Kawan'],
        importantNotes: 'Recharge tenaga dan nikmati makanan enak.'
      });
    }
  };

  // Loading indicator for auth & data sync
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-stone-50 text-stone-700">
        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold">Memuatkan ruang StayPlan anda...</p>
      </div>
    );
  }

  // If user is authenticated and has 0 stays, render welcoming onboarding
  if (isAuthenticated && !activeStay) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 font-sans text-stone-900">
        <Header
          onOpenNewStay={handleOpenNewStay}
          onOpenStayList={() => setIsStayListOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-8">
          <div className="inline-flex p-4 rounded-3xl bg-amber-100/70 text-amber-700 border border-amber-200">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight">
              Selamat Datang ke Ruang Peribadi Anda!
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Ruang StayPlan anda adalah milik persendirian anda. Mulakan dengan mencipta perancangan short stay 2–4 hari pertama anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-xl text-left">
            <button
              onClick={() => handleCreateStarterStay('balik_kampung')}
              className="p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-stone-200 hover:border-amber-400 transition-all group shadow-2xs"
            >
              <span className="text-2xl">🏡</span>
              <h3 className="text-xs font-bold text-stone-900 group-hover:text-amber-900 mt-2">
                Balik Kampung
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">3 Hari 2 Malam bersama orang tua</p>
            </button>

            <button
              onClick={() => handleCreateStarterStay('homestay')}
              className="p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-stone-200 hover:border-amber-400 transition-all group shadow-2xs"
            >
              <span className="text-2xl">🏊‍♂️</span>
              <h3 className="text-xs font-bold text-stone-900 group-hover:text-amber-900 mt-2">
                Percutian Homestay
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">3 Hari 2 Malam keluarga besar</p>
            </button>

            <button
              onClick={() => handleCreateStarterStay('short_getaway')}
              className="p-4 rounded-2xl bg-white hover:bg-amber-50/50 border border-stone-200 hover:border-amber-400 transition-all group shadow-2xs"
            >
              <span className="text-2xl">🌿</span>
              <h3 className="text-xs font-bold text-stone-900 group-hover:text-amber-900 mt-2">
                Weekend Getaway
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">2 Hari 1 Malam recharge santai</p>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenNewStay}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-2xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cipta Stay Kustom Baharu</span>
            </button>
          </div>
        </main>

        <Footer onOpenSupport={() => setIsSupportOpen(true)} />

        <CreateEditStayModal
          isOpen={isCreateStayOpen}
          onClose={() => setIsCreateStayOpen(false)}
          onSave={handleSaveStay}
          initialStay={editingStay}
        />
        <AuthModal />
      </div>
    );
  }

  if (!activeStay) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
        <div className="text-center space-y-4">
          <p className="text-stone-600">Tiada perancangan stay dipilih.</p>
          <button
            onClick={() => setIsStayListOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl"
          >
            Pilih Stay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/60 font-sans text-stone-900">
      {/* App Header */}
      <Header
        onOpenNewStay={handleOpenNewStay}
        onOpenStayList={() => setIsStayListOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Unauthenticated Mode Exploration Notification Banner */}
      {!isAuthenticated && (
        <div className="bg-amber-500/10 border-b border-amber-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-600 text-white shrink-0">
                <Compass className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Mod Eksplorasi (Showcase):</strong> Anda sedang melihat contoh struktur StayPlan. Log masuk dengan Google untuk menyimpan pelan peribadi anda di awan.
              </span>
            </div>
            <button
              onClick={() => openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda.')}
              className="inline-flex items-center gap-1.5 px-3 py-1 font-bold text-amber-900 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg shrink-0 transition-colors shadow-2xs"
            >
              <span>Log Masuk Google</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

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
                {isPersonalMode ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    Peribadi
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[11px] font-medium">
                    Showcase
                  </span>
                )}
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
            onDeleteItem={(id) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk memadam aktiviti.');
                return;
              }
              deleteAgendaItem(id);
            }}
            onToggleComplete={(id) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk menandakan aktiviti selesai.');
                return;
              }
              toggleAgendaComplete(id);
            }}
          />
        )}

        {/* Tab 2: Packing Checklist */}
        {activeTab === 'checklist' && (
          <PackingChecklist
            items={activeChecklistItems}
            stay={activeStay}
            onAddItem={(item) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk menambah item ke dalam senarai semak.');
                return;
              }
              addChecklistItem(item);
            }}
            onToggleItem={(id) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk mengemaskini senarai semak.');
                return;
              }
              toggleChecklistComplete(id);
            }}
            onDeleteItem={(id) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk memadam item.');
                return;
              }
              deleteChecklistItem(id);
            }}
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
        onNewStay={handleOpenNewStay}
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

      {/* Lightweight Google Auth Gate Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StayProvider>
        <StayPlanApp />
      </StayProvider>
    </AuthProvider>
  );
}
