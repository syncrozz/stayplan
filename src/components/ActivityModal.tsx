import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Tag, Sparkles, Check } from 'lucide-react';
import { AgendaItem, TimeSlot, ActivityPriority, Stay } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<AgendaItem, 'id'>) => void;
  initialItem?: AgendaItem | null;
  defaultDayNumber?: number;
  defaultTimeSlot?: TimeSlot;
  stay: Stay;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultDayNumber = 1,
  defaultTimeSlot = 'morning',
  stay
}) => {
  const isEditing = !!initialItem;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayNumber, setDayNumber] = useState(defaultDayNumber);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(defaultTimeSlot);
  const [timeSpecific, setTimeSpecific] = useState('');
  const [priority, setPriority] = useState<ActivityPriority>('must_do');
  const [locationName, setLocationName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setDescription(initialItem.description || '');
      setDayNumber(initialItem.dayNumber);
      setTimeSlot(initialItem.timeSlot);
      setTimeSpecific(initialItem.timeSpecific || '');
      setPriority(initialItem.priority);
      setLocationName(initialItem.locationName || '');
      setPersonInCharge(initialItem.personInCharge || '');
      setIsCompleted(initialItem.isCompleted || false);
    } else {
      setTitle('');
      setDescription('');
      setDayNumber(defaultDayNumber);
      setTimeSlot(defaultTimeSlot);
      setTimeSpecific('');
      setPriority('must_do');
      setLocationName('');
      setPersonInCharge('');
      setIsCompleted(false);
    }
  }, [initialItem, defaultDayNumber, defaultTimeSlot, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      stayId: stay.id,
      dayNumber,
      timeSlot,
      timeSpecific: timeSpecific.trim(),
      title: title.trim(),
      description: description.trim(),
      priority,
      locationName: locationName.trim(),
      personInCharge: personInCharge.trim(),
      isCompleted
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="activity-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="activity-modal-container"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="activity-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {isEditing ? 'Kemaskini Aktiviti Agenda' : 'Tambah Aktiviti / Agenda'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tentukan keutamaan (Wajib vs Pilihan vs Makan vs Rehat) untuk memastikan jadual tidak membebankan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Day & Slot Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Hari Ke-
              </label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {Array.from({ length: stay.durationDays || 3 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Hari {idx + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Waktu / Slot
              </label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value as TimeSlot)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {(Object.keys(TIME_SLOTS) as TimeSlot[]).map((slotKey) => (
                  <option key={slotKey} value={slotKey}>
                    {TIME_SLOTS[slotKey].icon} {TIME_SLOTS[slotKey].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Tajuk Aktiviti <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cth: Makan Mee Bandung Muar / Sembang Kopi Bersama Tok"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            />
          </div>

          {/* Priority / Type Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Jenis & Keutamaan Aktiviti
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PRIORITY_CONFIG) as ActivityPriority[]).map((pKey) => {
                const pConfig = PRIORITY_CONFIG[pKey];
                const isSelected = priority === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => setPriority(pKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${pConfig.badgeClass} ring-2 ring-amber-500/30 shadow-2xs`
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{pConfig.label}</p>
                    <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">{pConfig.shortLabel}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Masa Khusus (Pilihan)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={timeSpecific}
                  onChange={(e) => setTimeSpecific(e.target.value)}
                  placeholder="Cth: 08:30 AM / Lepas Asar"
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Lokasi / Tempat
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Cth: Kedai Kopi Parit Jawa"
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* PIC (Person In Charge) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Orang Bertanggungjawab (PIC)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={personInCharge}
                onChange={(e) => setPersonInCharge(e.target.value)}
                placeholder="Cth: Abang Long / Mak / Ayah"
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            {stay.companions && stay.companions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-stone-400">Pilih cepat:</span>
                {stay.companions.map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setPersonInCharge(comp)}
                    className="px-2 py-0.5 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors"
                  >
                    {comp}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Catatan & Perincian Ringkas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cth: Jangan lupa bungkus lebih untuk bawa balik rumah Tok."
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 rounded-xl shadow-xs transition-all"
            >
              {isEditing ? 'Simpan Perubahan' : 'Tambah ke Agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
