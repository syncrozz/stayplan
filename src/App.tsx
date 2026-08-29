import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StayProvider, useStay } from './context/StayContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PlanBoard } from './components/PlanBoard';
import { CalendarView } from './components/CalendarView';
import { AgendaBoard } from './components/AgendaBoard';
import { PackingChecklist } from './components/PackingChecklist';
import { StayInfoCard } from './components/StayInfoCard';
import { SupportModal } from './components/SupportModal';
import { CreateEditStayModal } from './components/CreateEditStayModal';
import { StaySelectorModal } from './components/StaySelectorModal';
import { ActivityModal } from './components/ActivityModal';
import { ShareExportModal } from './components/ShareExportModal';
import { AuthModal } from './components/AuthModal';
import { ShowcaseIntroHero } from './components/ShowcaseIntroHero';
import { WalkthroughModal } from './components/WalkthroughModal';
import { STAY_TYPES } from './utils/constants';
import { formatDateRange, formatStaySummary } from './utils/formatters';
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
  ShieldAlert,
  LayoutGrid,
  Cloud,
  Smartphone,
  CheckSquare
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
    isLoadingStays
  } = useStay();

  const { user, isAuthenticated, isGuest, isLoading: isAuthLoading, openAuthModal } = useAuth();

  // Modals state
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isStayListOpen, setIsStayListOpen] = useState(false);
  const [isCreateStayOpen, setIsCreateStayOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<Stay | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  // Activity Modal state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AgendaItem | null>(null);
  const [defaultDay, setDefaultDay] = useState(0); // 0 = Unscheduled pool / Backlog
  const [defaultSlot, setDefaultSlot] = useState<TimeSlot>('flexible');

  // Main navigation tab: 'plan' | 'agenda' | 'calendar' | 'checklist' | 'info'
  const [activeTab, setActiveTab] = useState<'plan' | 'agenda' | 'calendar' | 'checklist' | 'info'>('plan');
  const [selectedAgendaDay, setSelectedAgendaDay] = useState<number>(1);

  const handleSelectDayInAgenda = (dayNumber: number) => {
    setSelectedAgendaDay(dayNumber);
    setActiveTab('agenda');
  };

  const handleExploreDemo = () => {
    setActiveTab('plan');
    const el = document.getElementById('stay-hero-banner');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  // Seamless loading - no blocking full-screen freeze

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

      {/* Device Sync & Persistence Status Notification Banner */}
      {!isAuthenticated ? (
        <div className="bg-amber-500/10 border-b border-amber-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-600 text-white shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Sedang melihat contoh StayPlan.</strong> Explore contoh ini untuk faham cara StayPlan berfungsi.
              </span>
            </div>
            <button
              onClick={() => openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda.')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3" />
              <span>Mula Rancang Dengan Google</span>
            </button>
          </div>
        </div>
      ) : isGuest ? (
        <div className="bg-amber-50 border-b border-amber-300/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-700 text-white shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Mod Tempatan (Device ini sahaja):</strong> Perubahan anda disimpan pada pelayar ini. Log masuk dengan Google untuk menyelaraskan data ini ke awan supaya boleh dibuka di telefon/laptop lain.
              </span>
            </div>
            <button
              onClick={() => openAuthModal('Log masuk dengan Google untuk sync semua data ke awan & telefon lain.')}
              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              Sync ke Google Cloud
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border-b border-emerald-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-2 text-[11px] text-emerald-950">
            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>Cloud Sync Aktif:</strong> Diselaraskan ke akaun <strong>{user?.email}</strong>. Data anda sentiasa sama di semua peranti yang anda log masuk.
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              ● Terselaras Masa-Nyata
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* First-Time User Experience / Demo Showcase Introduction */}
        {!isPersonalMode && (
          <ShowcaseIntroHero
            activeStay={activeStay}
            onExploreDemo={handleExploreDemo}
            onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
          />
        )}

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
                <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200/80">
                  {formatStaySummary(activeStay)}
                </span>
                {isPersonalMode ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    Peribadi
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                    ✨ CONTOH / DEMO
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

            {/* Hero Quick Actions: Perancangan, Agenda, Calendar, Edit Stay & Share */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
              <button
                id="hero-plan-btn"
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black rounded-xl transition-all shadow-2xs cursor-pointer ${
                  activeTab === 'plan'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>📝 Perancangan</span>
              </button>

              <button
                id="hero-agenda-btn"
                type="button"
                onClick={() => setActiveTab('agenda')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
                  activeTab === 'agenda'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>☷ Agenda</span>
              </button>

              <button
                id="hero-calendar-btn"
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>📅 Kalendar</span>
              </button>

              <button
                id="hero-edit-stay-btn"
                type="button"
                onClick={() => handleOpenEditStay(activeStay)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                <span>✏️ Edit</span>
              </button>

              <button
                id="hero-share-btn"
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kongsi</span>
              </button>
            </div>

          </div>
        </section>

        {/* View Navigation Tabs: Step Flow Structure */}
        <div className="flex border-b border-stone-200 gap-1 sm:gap-2 text-xs sm:text-sm font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>📝</span>
            <span>1. Perancangan ({activeAgendaItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'agenda'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>2. Papan Agenda ({activeAgendaItems.filter((i) => (i.dayNumber || 0) > 0).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Kalendar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>4. Senarai Semak ({activeChecklistItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'border-amber-600 text-amber-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>5. Info Homestay</span>
          </button>
        </div>

        {/* Tab 1: Perancangan Aktiviti (Step 1: List & Organise) */}
        {activeTab === 'plan' && (
          <PlanBoard
            stay={activeStay}
            onOpenAddModal={() => handleOpenNewActivity(0, 'flexible')}
            onEditItem={handleOpenEditActivity}
          />
        )}

        {/* Tab 2: Detailed Agenda Board (Step 2: Daily Agenda & Backlog) */}
        {activeTab === 'agenda' && (
          <AgendaBoard
            stay={activeStay}
            agendaItems={activeAgendaItems}
            initialSelectedDay={selectedAgendaDay}
            onAddItem={handleOpenNewActivity}
            onEditItem={handleOpenEditActivity}
            onNavigateToPlan={() => setActiveTab('plan')}
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

        {/* Tab 3: Calendar View (Step 3: Calendar Overview) */}
        {activeTab === 'calendar' && (
          <CalendarView
            stay={activeStay}
            agendaItems={activeAgendaItems}
            onSelectDayInAgenda={handleSelectDayInAgenda}
            onAddItem={handleOpenNewActivity}
            onEditItem={handleOpenEditActivity}
            onNavigateToPlan={() => setActiveTab('plan')}
            onToggleComplete={(id) => {
              if (!isAuthenticated) {
                openAuthModal('Log masuk dengan Google untuk menandakan aktiviti selesai.');
                return;
              }
              toggleAgendaComplete(id);
            }}
          />
        )}

        {/* Tab 4: Packing Checklist */}
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

        {/* Tab 5: Stay & Wi-Fi Info */}
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

      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onExploreDemo={handleExploreDemo}
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
