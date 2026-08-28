import React from 'react';
import { ASSETS, STAY_TYPES } from '../utils/constants';
import { useStay } from '../context/StayContext';
import { Plus, Share2, Heart, FolderKanban, Sparkles, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onOpenNewStay: () => void;
  onOpenStayList: () => void;
  onOpenShare: () => void;
  onOpenSupport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewStay,
  onOpenStayList,
  onOpenShare,
  onOpenSupport
}) => {
  const { activeStay } = useStay();
  const stayTypeMeta = activeStay ? STAY_TYPES[activeStay.type] || STAY_TYPES.custom : null;

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
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                  Short Stay
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden md:block">
                “Plan the stay, not just the calendar.”
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* All Stays Button */}
            <button
              id="header-all-stays-btn"
              onClick={onOpenStayList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              title="Senarai Semua Stay"
            >
              <FolderKanban className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">Semua Stay</span>
            </button>

            {/* Share / Export */}
            <button
              id="header-share-btn"
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
              title="Kongsi ke WhatsApp atau Cetak"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Kongsi / WhatsApp</span>
            </button>

            {/* New Stay Button */}
            <button
              id="header-new-stay-btn"
              onClick={onOpenNewStay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-xs shadow-amber-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Stay Baru</span>
            </button>

            {/* Support Button */}
            <button
              id="header-support-btn"
              onClick={onOpenSupport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all hover:scale-105"
              title="Sokong Pembangunan StayPlan"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
              <span className="hidden md:inline">Support</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
