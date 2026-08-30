import React, { useState, useRef, useEffect } from 'react';
import { ASSETS, STAY_TYPES } from '../utils/constants';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Share2,
  FolderKanban,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Sparkles,
  Lock,
  Cloud,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Save
} from 'lucide-react';

interface HeaderProps {
  onOpenNewStay: () => void;
  onOpenStayList: () => void;
  onOpenShare: () => void;
  onOpenSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewStay,
  onOpenStayList,
  onOpenShare
}) => {
  const {
    activeStay,
    isPersonalMode,
    isSyncing,
    syncStatus,
    refreshFromCloud,
    lastSyncTime,
    hasUnsavedChanges,
    unsavedCount,
    saveAndSync
  } = useStay();
  const { user, userProfile, role, isAuthenticated, isGuest, openAuthModal, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const stayTypeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

  const handleManualRefresh = async () => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk sync pelan stay anda.');
      return;
    }
    const res = await refreshFromCloud();
    setSyncFeedback(res.message);
    setTimeout(() => {
      setSyncFeedback(null);
    }, 4000);
  };

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header id="stayplan-main-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group cursor-pointer" onClick={onOpenStayList}>
              <img
                id="stayplan-brand-logo"
                src={ASSETS.LOGO}
                alt="StayPlan Logo"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shadow-xs object-cover border border-stone-200 transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight font-sans">
                  Stay<span className="text-amber-600">Plan</span>
                </h1>
                {isAuthenticated && !isGuest ? (
                  <button
                    onClick={handleManualRefresh}
                    disabled={isSyncing}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-tight rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      syncStatus === 'ERROR'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : syncStatus === 'OFFLINE'
                        ? 'bg-stone-100 text-stone-700 border-stone-300'
                        : isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                    title="Status Sync"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                    <span>
                      {syncStatus === 'SAVING' || isSyncing || syncStatus === 'SYNCING'
                        ? 'Syncing...'
                        : syncStatus === 'OFFLINE'
                        ? 'Offline'
                        : syncStatus === 'ERROR'
                        ? 'Sync Failed'
                        : 'Synced'}
                    </span>
                  </button>
                ) : isGuest ? (
                  <span
                    onClick={() => openAuthModal('Log masuk dengan Google untuk sync pelan ini ke semua peranti anda secara automatik.')}
                    className="cursor-pointer hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                    title="Mod Tetamu. Data hanya disimpan pada peranti ini sehingga anda log masuk."
                  >
                    <Smartphone className="w-2.5 h-2.5 text-amber-600" />
                    <span>Mod Tetamu</span>
                  </span>
                ) : (
                  <span
                    onClick={() => openAuthModal('Log masuk untuk mula mencipta pelan stay peribadi anda.')}
                    className="cursor-pointer hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
                    title="Sedang melihat contoh StayPlan (Demo). Klik untuk log masuk."
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                    <span>✨ DEMO</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium hidden md:block">
                Plan the stay, don&apos;t miss something
              </p>
            </div>
          </div>

          {/* Active Stay Selector Pill */}
          {activeStay && (
            <div className="hidden lg:flex items-center max-w-sm xl:max-w-md">
              <button
                id="header-stay-pill-btn"
                onClick={onOpenStayList}
                className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 transition-all text-left truncate"
                title="Tukar atau Urus Stay"
              >
                <span className="text-base shrink-0">{stayTypeMeta?.icon || '🏡'}</span>
                <div className="truncate">
                  <p className="text-xs font-bold text-stone-900 group-hover:text-amber-900 truncate">
                    {activeStay.title}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {activeStay.location} • {activeStay.durationDays} Hari
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0 ml-1" />
              </button>
            </div>
          )}

          {/* Action Buttons & Auth Gate */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Explicit Refresh Cloud Button */}
            {isAuthenticated && !isGuest && (
              <button
                id="header-save-sync-btn"
                onClick={handleManualRefresh}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer ${
                  syncStatus === 'ERROR'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : syncStatus === 'OFFLINE'
                    ? 'bg-stone-500 text-white cursor-not-allowed'
                    : isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title="Refresh from Cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || syncStatus === 'SAVING' || syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {syncStatus === 'SAVING' || isSyncing || syncStatus === 'SYNCING'
                    ? 'Syncing...'
                    : syncStatus === 'OFFLINE'
                    ? 'Offline'
                    : syncStatus === 'ERROR'
                    ? 'Sync Failed'
                    : 'Refresh from Cloud'}
                </span>
                <span className="sm:hidden">
                  {isSyncing ? 'Syncing...' : 'Refresh'}
                </span>
              </button>
            )}

            {/* All Stays Button */}
            <button
              id="header-all-stays-btn"
              onClick={onOpenStayList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              title="Senarai Semua Stay"
            >
              <FolderKanban className="w-4 h-4 text-stone-600" />
              <span className="hidden md:inline">Semua Stay</span>
            </button>

            {/* Share / Export */}
            <button
              id="header-share-btn"
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              title="Kongsi ke WhatsApp atau Cetak"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Kongsi</span>
            </button>

            {/* New Stay Button */}
            <button
              id="header-new-stay-btn"
              onClick={onOpenNewStay}
              title="Cipta Stay Baru"
              aria-label="Cipta Stay Baru"
              className="inline-flex items-center justify-center p-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Auth Gate: User Profile / Sign-in Button */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition-all"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-stone-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-stone-800 truncate max-w-[100px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                      {role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {user.displayName || 'Pengguna StayPlan'}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-stone-100 text-stone-700 border border-stone-200 uppercase inline-flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-amber-600" />
                          Role: {role}
                        </span>
                      </div>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleManualRefresh();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left"
                      >
                        <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Refresh from Cloud</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenStayList();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors text-left"
                      >
                        <FolderKanban className="w-4 h-4 text-stone-500" />
                        <span>Stay Peribadi Saya</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Log Keluar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda.')}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold text-stone-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-2xs hover:shadow-xs transition-all"
              >
                {/* Google Icon */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="hidden sm:inline">Log Masuk</span>
                <span className="sm:hidden">Log Masuk</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Sync Status Toast */}
      {syncFeedback && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-2.5 max-w-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{syncFeedback}</span>
          </div>
        </div>
      )}
    </header>
  );
};
