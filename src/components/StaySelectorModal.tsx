import React, { useState } from 'react';
import { X, Plus, Calendar, MapPin, Check, Edit2, Copy, Trash2, Download, Upload, RotateCcw } from 'lucide-react';
import { useStay } from '../context/StayContext';
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
    importDataJson,
    resetToDefaults
  } = useStay();

  const [importError, setImportError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataJson(content);
        if (ok) {
          setImportSuccess(true);
          setImportError(false);
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setImportError(true);
          setTimeout(() => setImportError(false), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="stay-selector-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="stay-selector-container"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">Senarai StayPlan Anda</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Pilih perancangan short stay aktif atau buat perancangan baharu.
            </p>
          </div>
          <button
            id="modal-create-stay-btn"
            onClick={() => {
              onClose();
              onNewStay();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Stay Baharu</span>
          </button>
        </div>

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

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  {!isActive && (
                    <button
                      onClick={() => {
                        setActiveStayId(stay.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      Buka
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      onEditStay(stay);
                    }}
                    title="Sunting Stay"
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateStay(stay.id)}
                    title="Salin / Duplikasi Stay"
                    className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {stays.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Adakah anda pasti mahu memadam "${stay.title}"?`)) {
                          deleteStay(stay.id);
                        }
                      }}
                      title="Padam Stay"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Backup & Restore */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-stone-700">Simpanan Sandaran & Import Data:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Eksport JSON
              </button>
              <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Import JSON
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tetapkan semula kepada contoh asal? Data yang belum dieksport akan hilang.')) {
                    resetToDefaults();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Reset ke Contoh Asal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {importSuccess && (
            <p className="text-xs text-emerald-600 font-medium">Data berjaya diimport!</p>
          )}
          {importError && (
            <p className="text-xs text-rose-600 font-medium">Ralat: Format fail JSON tidak sah.</p>
          )}
        </div>
      </div>
    </div>
  );
};
