import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Wifi, Phone, KeyRound, Users, Plus, Trash2, Sparkles, Check, FileText, Car, Home } from 'lucide-react';
import { Stay, StayType, DayType } from '../types';
import { STAY_TYPES, DAY_TYPE_CONFIG } from '../utils/constants';
import { getDayType, getStaySummaryCounts, getDayContextLabel } from '../utils/formatters';

interface CreateEditStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stayData: Omit<Stay, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialStay?: Stay | null;
}

export const CreateEditStayModal: React.FC<CreateEditStayModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStay
}) => {
  const isEditing = !!initialStay;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<StayType>('balik_kampung');
  const [durationDays, setDurationDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostContact, setHostContact] = useState('');
  const [gatePin, setGatePin] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [companionInput, setCompanionInput] = useState('');
  const [companions, setCompanions] = useState<string[]>([]);
  const [ruleInput, setRuleInput] = useState('');
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [dayTypes, setDayTypes] = useState<Record<number, DayType>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'stay_info' | 'companions'>('basic');

  useEffect(() => {
    if (initialStay) {
      setTitle(initialStay.title);
      setType(initialStay.type);
      const totalD = initialStay.durationDays || 3;
      setDurationDays(totalD);
      setStartDate(initialStay.startDate || '');
      setEndDate(initialStay.endDate || '');
      setLocation(initialStay.location || '');
      setAddress(initialStay.address || '');
      setWifiSsid(initialStay.wifiSsid || '');
      setWifiPassword(initialStay.wifiPassword || '');
      setHostName(initialStay.hostName || '');
      setHostContact(initialStay.hostContact || '');
      setGatePin(initialStay.gatePin || '');
      setImportantNotes(initialStay.importantNotes || '');
      setCompanions(initialStay.companions || []);
      setHouseRules(initialStay.houseRules || []);

      // Build day types from initialStay or default
      const initialDayTypes: Record<number, DayType> = {};
      for (let d = 1; d <= totalD; d++) {
        if (initialStay.dayTypes && initialStay.dayTypes[d]) {
          initialDayTypes[d] = initialStay.dayTypes[d];
        } else {
          initialDayTypes[d] = (d === 1 || (d === totalD && totalD >= 2)) ? 'travel_day' : 'stay_day';
        }
      }
      setDayTypes(initialDayTypes);
    } else {
      // Default new stay
      setTitle('Balik Kampung Hujung Minggu');
      setType('balik_kampung');
      setDurationDays(3);
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setEndDate(end);
      setLocation('');
      setAddress('');
      setWifiSsid('');
      setWifiPassword('');
      setHostName('');
      setHostContact('');
      setGatePin('');
      setImportantNotes('');
      setCompanions(['Keluarga']);
      setHouseRules([]);
      // Default day types: Day 1 & Day 3 Travel, Day 2 Stay
      setDayTypes({
        1: 'travel_day',
        2: 'stay_day',
        3: 'travel_day'
      });
    }
  }, [initialStay, isOpen]);

  // When type changes, auto-suggest duration if not manually set
  const handleTypeSelect = (newType: StayType) => {
    setType(newType);
    if (!isEditing) {
      const defaultD = STAY_TYPES[newType].defaultDays;
      setDurationDays(defaultD);
      if (startDate) {
        const end = new Date(new Date(startDate).getTime() + (defaultD - 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        setEndDate(end);
      }
      // Recompute default day types
      const newDTypes: Record<number, DayType> = {};
      for (let d = 1; d <= defaultD; d++) {
        newDTypes[d] = (d === 1 || (d === defaultD && defaultD >= 2)) ? 'travel_day' : 'stay_day';
      }
      setDayTypes(newDTypes);
    }
  };

  const handleStartDateChange = (dateVal: string) => {
    setStartDate(dateVal);
    if (dateVal && durationDays) {
      const end = new Date(new Date(dateVal).getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setEndDate(end);
    }
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    if (startDate) {
      const end = new Date(new Date(startDate).getTime() + (days - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setEndDate(end);
    }
    // Update dayTypes for new duration
    setDayTypes((prev) => {
      const updated: Record<number, DayType> = {};
      for (let d = 1; d <= days; d++) {
        if (prev[d]) {
          updated[d] = prev[d];
        } else {
          updated[d] = (d === 1 || (d === days && days >= 2)) ? 'travel_day' : 'stay_day';
        }
      }
      return updated;
    });
  };

  const toggleDayType = (dayNumber: number) => {
    setDayTypes((prev) => {
      const current = prev[dayNumber] || ((dayNumber === 1 || (dayNumber === durationDays && durationDays >= 2)) ? 'travel_day' : 'stay_day');
      return {
        ...prev,
        [dayNumber]: current === 'travel_day' ? 'stay_day' : 'travel_day'
      };
    });
  };

  const handleAddCompanion = () => {
    if (companionInput.trim()) {
      setCompanions([...companions, companionInput.trim()]);
      setCompanionInput('');
    }
  };

  const handleRemoveCompanion = (index: number) => {
    setCompanions(companions.filter((_, i) => i !== index));
  };

  const handleAddRule = () => {
    if (ruleInput.trim()) {
      setHouseRules([...houseRules, ruleInput.trim()]);
      setRuleInput('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setHouseRules(houseRules.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      type,
      durationDays,
      startDate,
      endDate,
      location: location.trim() || 'Lokasi Belum Ditetapkan',
      address: address.trim(),
      wifiSsid: wifiSsid.trim(),
      wifiPassword: wifiPassword.trim(),
      hostName: hostName.trim(),
      hostContact: hostContact.trim(),
      gatePin: gatePin.trim(),
      importantNotes: importantNotes.trim(),
      companions,
      houseRules,
      dayTypes
    });

    onClose();
  };

  // Compute summary for live preview
  const currentSummary = getStaySummaryCounts({ durationDays, dayTypes });

  if (!isOpen) return null;

  return (
    <div id="stay-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="stay-modal-container"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 md:p-8 space-y-6"
      >
        {/* Close Button */}
        <button
          id="stay-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            {isEditing ? 'Kemaskini Stay' : 'Rancang Short Stay Baharu'}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Fokuskan perancangan 2–4 hari yang santai, bermakna, dan mudah dikongsi bersama keluarga.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'basic'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            1. Maklumat Asas & Tempoh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stay_info')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'stay_info'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            2. Info Rumah / Homestay & Wi-Fi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('companions')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'companions'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            3. Ahli / Tetamu ({companions.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: BASIC */}
          {activeTab === 'basic' && (
            <div className="space-y-5">
              {/* Stay Type Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Jenis Short Stay
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(STAY_TYPES) as StayType[]).map((tKey) => {
                    const item = STAY_TYPES[tKey];
                    const isSelected = type === tKey;
                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => handleTypeSelect(tKey)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/20 text-amber-950'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{item.icon}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 font-bold" />}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-bold">{item.label}</p>
                          <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Nama / Tajuk Stay <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Cth: Balik Kampung Muar (Rumah Tok) / Homestay Kundasang"
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              {/* Duration (2-4 Days recommended pills) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Tempoh Tinggal (Hari)
                  </label>
                  <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                    Disyorkan: 2–4 Hari
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDurationChange(d)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                        durationDays === d
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-700'
                      }`}
                    >
                      {d} Hari {d > 1 ? `(${d - 1}M)` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Tarikh Mula</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Tarikh Akhir</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                    />
                  </div>
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Bandar / Kawasan Lokasi
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Cth: Parit Bakar, Muar / Tanah Rata, Cameron Highlands"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Day Types & Summary Configuration */}
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                      Konfigurasi Jenis Hari (Travel Day vs Stay Day)
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Hari bertolak dan pulang tidak disamakan dengan hari aktiviti/penginapan penuh.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2.5 py-1 rounded-lg">
                    {currentSummary.totalDays} Hari · {currentSummary.nights} Malam · {currentSummary.stayDaysCount} Hari Aktiviti
                  </span>
                </div>

                {/* Day Type Toggle List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                  {Array.from({ length: durationDays }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isTravel = (dayTypes[dayNum] || (dayNum === 1 || (dayNum === durationDays && durationDays >= 2) ? 'travel_day' : 'stay_day')) === 'travel_day';
                    
                    // Compute readable label
                    let label = isTravel ? 'Perjalanan' : 'Stay Day';
                    if (isTravel && dayNum === durationDays && durationDays >= 2) {
                      label = 'Perjalanan Balik';
                    }

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => toggleDayType(dayNum)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isTravel
                            ? 'bg-orange-50/90 border-orange-300 text-orange-950 hover:bg-orange-100/80'
                            : 'bg-amber-50/70 border-amber-300 text-amber-950 hover:bg-amber-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{isTravel ? '🚗' : '🏠'}</span>
                          <div>
                            <span className="text-xs font-bold block leading-tight">Hari {dayNum}</span>
                            <span className="text-[10px] font-semibold text-stone-500">{label}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                          isTravel
                            ? 'bg-orange-200/80 text-orange-900 border-orange-300'
                            : 'bg-amber-200/80 text-amber-900 border-amber-300'
                        }`}>
                          {isTravel ? 'Travel' : 'Stay'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-stone-500 italic">
                  💡 Tip: Klik pada mana-mana hari di atas untuk menukar antara 🚗 Hari Perjalanan dan 🏠 Hari Stay mengikut kesesuaian anda.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: STAY INFO & WIFI */}
          {activeTab === 'stay_info' && (
            <div className="space-y-4">
              {/* Full Address */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Alamat Penuh / Navigasi
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cth: No 24, Jalan Kenanga, 84000 Muar, Johor"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Wi-Fi Details */}
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Wifi className="w-4 h-4 text-amber-600" />
                  <span>Maklumat Wi-Fi Penginapan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Nama Wi-Fi (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="Cth: Homestay_WiFi_5G"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Kata Laluan Wi-Fi</label>
                    <input
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="Cth: password1234"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Host & Gate Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nama Tuan Rumah / Host
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Cth: Tok Wan / En. Firdaus"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    No. Telefon Host / Bantuan
                  </label>
                  <input
                    type="text"
                    value={hostContact}
                    onChange={(e) => setHostContact(e.target.value)}
                    placeholder="Cth: +6012-3456789"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* Key / Gate Pin */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Info Kunci / Kod Smartlock
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={gatePin}
                    onChange={(e) => setGatePin(e.target.value)}
                    placeholder="Cth: #4829# atau Kunci bawah pasu kanan pintu"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              {/* House Rules */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Peraturan / Nota Khas Rumah
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    placeholder="Cth: Check-out pukul 12 PM / Dilarang merokok"
                    className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-xs font-bold text-stone-800 rounded-lg"
                  >
                    Tambah
                  </button>
                </div>
                {houseRules.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-stone-700">
                    {houseRules.map((rule, idx) => (
                      <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                        <span>• {rule}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPANIONS */}
          {activeTab === 'companions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Senarai Ahli Keluarga / Tetamu yang Terlibat
                </label>
                <p className="text-xs text-stone-500 mb-3">
                  Mudah untuk menetapkan siapa yang bertanggungjawab (PIC) bagi aktiviti atau makanan tertentu.
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={companionInput}
                    onChange={(e) => setCompanionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompanion();
                      }
                    }}
                    placeholder="Cth: Mak & Ayah / Abang Long / Cucu-cucu"
                    className="flex-1 px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCompanion}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs"
                  >
                    Tambah
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {companions.map((comp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-300 text-xs font-medium text-stone-800"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-500" />
                      <span>{comp}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompanion(idx)}
                        className="text-stone-400 hover:text-rose-600 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {companions.length === 0 && (
                    <p className="text-xs text-stone-400 italic">Belum ada ahli ditambah.</p>
                  )}
                </div>
              </div>

              {/* Quick companion presets */}
              <div className="pt-3 border-t border-stone-200">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Cadangan Pantas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Mak & Ayah', 'Tok Wan & Tok Mak', 'Anak-anak', 'Adik-beradik', 'Keluarga Mertua', 'Tetamu Istimewa'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (!companions.includes(preset)) {
                          setCompanions([...companions, preset]);
                        }
                      }}
                      className="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <div className="flex gap-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'companions' ? 'stay_info' : 'basic')}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Sebelumnya
                </button>
              )}
              {activeTab !== 'companions' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'stay_info' : 'companions')}
                  className="px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl"
                >
                  Seterusnya
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                {isEditing ? 'Simpan Perubahan' : 'Mulakan StayPlan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
