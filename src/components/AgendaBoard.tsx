import React, { useState } from 'react';
import { AgendaItem, TimeSlot, ActivityPriority, Stay } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from '../utils/constants';
import { getDayContextLabel } from '../utils/formatters';
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  User,
  Star,
  Palmtree,
  Utensils,
  Coffee,
  Car,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { PacingAdviceCard } from './PacingAdviceCard';

interface AgendaBoardProps {
  stay: Stay;
  agendaItems: AgendaItem[];
  initialSelectedDay?: number;
  onAddItem: (dayNumber: number, slot: TimeSlot) => void;
  onEditItem: (item: AgendaItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

export const AgendaBoard: React.FC<AgendaBoardProps> = ({
  stay,
  agendaItems,
  initialSelectedDay = 1,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleComplete
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(initialSelectedDay);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const daysCount = stay.durationDays || 3;
  const filteredAgendas = agendaItems.filter((item) => {
    const dayMatch = selectedDay === 0 ? true : item.dayNumber === selectedDay;
    if (!dayMatch) return false;

    if (priorityFilter === 'all') return true;
    if (priorityFilter === 'incomplete') return !item.isCompleted;
    return item.priority === priorityFilter;
  });

  const activeDayContext = selectedDay > 0 ? getDayContextLabel(stay, selectedDay) : null;

  // Core 3 time-of-day blocks (with fallback for flexible if existing data exists)
  const hasFlexibleItems = filteredAgendas.some((i) => i.timeSlot === 'flexible');
  const slotKeys: TimeSlot[] = hasFlexibleItems
    ? ['morning', 'afternoon', 'evening', 'flexible']
    : ['morning', 'afternoon', 'evening'];

  return (
    <div id="agenda-board" className="space-y-6">
      {/* Day Selector Pills & Controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1 shrink-0">
              Hari:
            </span>
            {Array.from({ length: daysCount }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected = selectedDay === dayNum;
              const dayContext = getDayContextLabel(stay, dayNum);
              const isTravel = dayContext.type === 'travel_day';
              const dayItems = agendaItems.filter((i) => i.dayNumber === dayNum);
              const mustCount = dayItems.filter((i) => i.priority === 'must_do').length;

              return (
                <button
                  key={dayNum}
                  type="button"
                  id={`day-tab-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? isTravel
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : isTravel
                      ? 'bg-orange-50/80 hover:bg-orange-100 text-orange-950 border-orange-200'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <span>{dayContext.label}</span>
                  {mustCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-black/20 text-white'
                          : isTravel
                          ? 'bg-orange-200 text-orange-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      ⭐ {mustCount}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedDay(0)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                selectedDay === 0
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              Semua Hari ({agendaItems.length})
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-700 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="must_do">⭐ Wajib Sahaja</option>
              <option value="optional">🌴 Pilihan Sahaja</option>
              <option value="food">🍽️ Makan</option>
              <option value="rest">☕ Rehat</option>
              <option value="logistics">🚗 Logistik</option>
              <option value="incomplete">Belum Selesai</option>
            </select>
          </div>
        </div>

        {/* Selected Day Context Banner */}
        {activeDayContext && (
          <div
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2 text-xs ${
              activeDayContext.type === 'travel_day'
                ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <span className="text-base">{activeDayContext.type === 'travel_day' ? '🚗' : '🏠'}</span>
            <div>
              <span className="font-extrabold">{activeDayContext.label}:</span>{' '}
              <span className="text-stone-600">
                {activeDayContext.type === 'travel_day'
                  ? 'Hari perjalanan (bertolak / pulang). Fokuskan perancangan kepada waktu bertolak, persinggahan R&R, dan logistik kenderaan.'
                  : 'Hari penginapan penuh. Masa terbaik untuk agenda lawatan, makan-makan tempatan, dan santai bersama.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pacing Advice Card */}
      <PacingAdviceCard
        agendaItems={agendaItems}
        selectedDay={selectedDay}
        totalDays={stay.durationDays}
      />

      {/* Time Slots Grid */}
      <div className="space-y-6">
        {slotKeys.map((slotKey) => {
          const slotMeta = TIME_SLOTS[slotKey];
          const slotItems = filteredAgendas.filter((i) => i.timeSlot === slotKey);

          return (
            <div
              key={slotKey}
              id={`slot-section-${slotKey}`}
              className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden"
            >
              {/* Slot Header - Clean Time of Day without rigid clock ranges */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-stone-50/90 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{slotMeta.icon}</span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900">{slotMeta.label}</h3>
                    <span className="text-xs font-semibold text-stone-400">
                      ({slotItems.length})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddItem(selectedDay === 0 ? 1 : selectedDay, slotKey)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 rounded-xl transition-all active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Aktiviti</span>
                </button>
              </div>

              {/* Slot Items */}
              <div className="p-4 space-y-3">
                {slotItems.map((item) => {
                  const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.optional;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${pConfig.borderClass} ${
                        item.isCompleted
                          ? 'bg-stone-50/70 border-stone-200 opacity-75'
                          : 'bg-white hover:shadow-2xs border-stone-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox and Content */}
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleComplete(item.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              item.isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-stone-300 bg-white hover:border-amber-500'
                            }`}
                            title={item.isCompleted ? 'Tanda belum selesai' : 'Tanda selesai'}
                          >
                            {item.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Title & Specific Time Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-sm sm:text-base font-bold leading-snug ${
                                  item.isCompleted ? 'line-through text-stone-400' : 'text-stone-900'
                                }`}
                              >
                                {item.title}
                              </h4>

                              {/* Specific Time (Optional Detail) */}
                              {item.timeSpecific && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100/70 border border-amber-200/80 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  {item.timeSpecific}
                                </span>
                              )}
                            </div>

                            {/* Secondary Metadata Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {/* Day badge if in all days view */}
                              {selectedDay === 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                                  Hari {item.dayNumber}
                                </span>
                              )}

                              {/* Priority Badge */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-[11px] rounded-md border ${pConfig.badgeClass}`}
                              >
                                {pConfig.label}
                              </span>

                              {/* Location */}
                              {item.locationName && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                                  <MapPin className="w-3 h-3 text-stone-400" />
                                  {item.locationName}
                                </span>
                              )}

                              {/* PIC */}
                              {item.personInCharge && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <User className="w-3 h-3 text-amber-600" />
                                  PIC: {item.personInCharge}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {item.description && (
                              <p className="text-xs text-stone-600 leading-relaxed pt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Sunting aktiviti"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Padam aktiviti"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {slotItems.length === 0 && (
                  <div
                    onClick={() => onAddItem(selectedDay === 0 ? 1 : selectedDay, slotKey)}
                    className="p-4 rounded-xl border border-dashed border-stone-200 hover:border-amber-400 text-center cursor-pointer group transition-colors"
                  >
                    <p className="text-xs text-stone-400 group-hover:text-amber-700 font-medium">
                      + Tiada aktiviti dalam slot {slotMeta.label.toLowerCase()}. Tekan untuk tambah jika perlu.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
