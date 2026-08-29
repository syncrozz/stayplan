import React, { useEffect, useState } from 'react';
import { useStay } from '../context/StayContext';
import { useAuth } from '../context/AuthContext';
import { Save, Cloud, CheckCircle2, RefreshCw, AlertCircle, Sparkles, X } from 'lucide-react';

export const SaveSyncFloatingBar: React.FC = () => {
  const {
    hasUnsavedChanges,
    unsavedCount,
    isSyncing,
    lastSyncTime,
    saveFeedback,
    saveAndSync,
    clearSaveFeedback
  } = useStay();
  const { isAuthenticated, isGuest, openAuthModal } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Reset dismissed state when new changes occur
  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDismissed(false);
    }
  }, [hasUnsavedChanges, unsavedCount]);

  // Auto clear feedback after 5 seconds
  useEffect(() => {
    if (saveFeedback) {
      const timer = setTimeout(() => {
        clearSaveFeedback();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveFeedback, clearSaveFeedback]);

  const handleSaveAndSync = async () => {
    if (!isAuthenticated || isGuest) {
      openAuthModal('Log masuk dengan Google untuk menyimpan & sync semua data ke Google Account anda.');
      return;
    }
    const res = await saveAndSync('Perubahan berjaya disimpan & di-sync ke Google Account anda!');
    if (res.success) {
      setLocalFeedback('Tersimpan & Di-Sync!');
      setTimeout(() => setLocalFeedback(null), 3000);
    }
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Render toast feedback if available
  if (saveFeedback && !hasUnsavedChanges) {
    return (
      <div
        id="save-sync-toast-feedback"
        className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700 shadow-emerald-950/20'
              : 'bg-rose-900 text-rose-50 border-rose-700 shadow-rose-950/20'
          }`}
        >
          {saveFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-bold text-xs uppercase tracking-wider text-emerald-200">
              {saveFeedback.type === 'success' ? 'Google Cloud Sync' : 'Ralat Sync'}
            </p>
            <p className="text-xs text-stone-100">{saveFeedback.message}</p>
          </div>
          <button
            onClick={clearSaveFeedback}
            className="p-1 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Floating Save Bar when changes exist or manually docked
  if (hasUnsavedChanges && !isDismissed) {
    return (
      <div
        id="unsaved-changes-floating-bar"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="bg-stone-900/95 backdrop-blur-md text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl border border-stone-700/80 flex items-center justify-between gap-3">
          {/* Status info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="truncate">
              <p className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-1.5 truncate">
                <span>Ada {unsavedCount} perubahan baru</span>
              </p>
              <p className="text-[11px] text-stone-400 hidden sm:block truncate">
                Tekan Simpan untuk sync data ke Google Account anda
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="floating-save-sync-btn"
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                isSyncing
                  ? 'bg-amber-600 text-white cursor-wait opacity-90'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:shadow-amber-500/20'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Sync Google...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>💾 Simpan & Sync</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
              title="Sembunyikan bar ini sementara"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
