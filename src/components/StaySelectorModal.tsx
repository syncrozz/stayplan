import React, { useState } from 'react';
import { X, Plus, Calendar, MapPin, Check, Edit2, Copy, Trash2, Download, Lock, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { STAY_TYPES } from '../utils/constants';
import { formatDateRange } from '../utils/formatters';
import { Stay } from '../types';

interface StaySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewStay: () => void;
  onEditStay: (stay: Stay) => void;
}

export const StaySelectorModal: React.FC<StaySelectorModalProps> = ({
  isOpen,
  onClose,
  onNewStay,
  onEditStay
}) => {
  const {
    stays,
    activeStayId,
    setActiveStayId,
    deleteStay,
    duplicateStay,
    exportDataJson,
    isPersonalMode,
    isSyncing,
    refreshFromCloud
  } = useStay();

  const { isAuthenticated, openAuthModal } = useAuth();
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRefreshCloud = async () => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk sync pelan stay anda.');
      return;
    }
    const res = await refreshFromCloud();
    setSyncStatusMsg(res.message);
    setTimeout(() => setSyncStatusMsg(null), 5000);
  };

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stayplan-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNew = () => {
    if (!isAuthenticated) {
      openAuthModal('Log masuk dengan Google untuk mencipta pelan stay peribadi anda.');
      return;
    }
    onClose();
    onNewStay();
  };

  return (
    <div id="stay-selector-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="stay-selector-container"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="stay-selector-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                {isPersonalMode ? 'Koleksi StayPlan Peribadi' : 'Contoh & Demo StayPlan'}
              </h2>
              {isPersonalMode ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                  Peribadi
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  ✨ DEMO
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {isPersonalMode
                ? 'Semua perancangan short stay yang anda miliki dan disimpan di awan.'
                : 'Contoh struktur StayPlan untuk demonstrasi interaktif. Log masuk dengan Google untuk cipta pelan peribadi anda.'}
            </p>
          </div>

          <button
            id="modal-create-stay-btn"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Stay Baharu</span>
          </button>
        </div>

        {/* Auth prompt banner if unauthenticated */}
        {!isAuthenticated && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ingin cipta pelan peribadi sebenar?</p>
                <p className="text-stone-600 text-[11px]">
                  Log masuk dengan akaun Google anda untuk mula mencipta dan menyimpan ruang StayPlan anda sendiri.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('Log masuk dengan Google untuk mula merancang stay peribadi anda.')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 self-start sm:self-auto transition-colors"
            >
              Log Masuk Google
            </button>
          </div>
        )}

        {/* Stays List */}
        <div className="space-y-3">
          {stays.map((stay) => {
            const isActive = stay.id === activeStayId;
            const typeMeta = STAY_TYPES[stay.type] || STAY_TYPES.custom;

            return (
              <div
                key={stay.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20'
                    : 'bg-stone-50/70 hover:bg-stone-50 border-stone-200'
                }`}
              >
                <div
                  className="flex items-start gap-3.5 cursor-pointer flex-1"
                  onClick={() => {
                    setActiveStayId(stay.id);
                    onClose();
                  }}
                >
                  <span className="text-2xl p-2 rounded-xl bg-white border border-stone-200 shadow-2xs">
                    {typeMeta.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">{stay.title}</h3>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-600 text-white">
                          <Check className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {stay.location || 'Tiada lokasi'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar (Right of Card) */}
                <div className="flex items-center justify-end gap-1.5 self-end sm:self-center">
                  {!isActive && (
                    <button
                      onClick={() => {
                        setActiveStayId(stay.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Buka
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        openAuthModal('Log masuk dengan Google untuk edit maklumat Stay.');
                        return;
                      }
                      onClose();
                      onEditStay(stay);
                    }}
                    title="Edit Stay"
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        openAuthModal('Log masuk dengan Google untuk menduplikasi pelan Stay.');
                        return;
                      }
                      duplicateStay(stay.id);
                    }}
                    title="Salin / Duplikasi Stay"
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {isPersonalMode && (
                    <button
                      onClick={() => {
                        if (confirm(`Adakah anda pasti mahu memadam "${stay.title}"?`)) {
                          deleteStay(stay.id);
                        }
                      }}
                      title="Padam Stay"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {stays.length === 0 && (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
              <div>
                <p className="text-sm font-bold text-stone-800">Belum Ada Stay Peribadi</p>
                <p className="text-xs text-stone-500 mt-1">
                  Mulakan dengan mencipta perancangan short stay pertama anda.
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                + Cipta Stay Pertama
              </button>
            </div>
          )}
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div className="bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{syncStatusMsg}</span>
          </div>
        )}

        {/* Data Backup & Cloud Sync (Simpan Positioned at Bottom-Right) */}
        <div className="pt-4 border-t border-stone-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-stone-600">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-[11px] text-stone-400">Sandaran fail:</span>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Eksport JSON
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleRefreshCloud}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Refresh from Cloud'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
