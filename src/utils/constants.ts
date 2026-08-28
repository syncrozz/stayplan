import { StayType, ActivityPriority, TimeSlot, ChecklistCategory } from '../types';

export const ASSETS = {
  LOGO: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/StayPlan/android-chrome-192x192.png',
  OGI: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/StayPlan/OGI.StayPlan.jpg',
  QR_SUPPORT: 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Bank%20QR/QR%20RYT%20for%20Sumbangan.jpg'
};

export const STAY_TYPES: Record<StayType, { label: string; icon: string; desc: string; defaultDays: number; color: string }> = {
  balik_kampung: {
    label: 'Balik Kampung',
    icon: '🏡',
    desc: 'Ziarah keluarga, rumah orang tua / sanak saudara',
    defaultDays: 3,
    color: 'amber'
  },
  family_stay: {
    label: 'Family Short Stay',
    icon: '👨‍👩‍👧‍👦',
    desc: 'Bercuti bersama keluarga besar atau anak-anak',
    defaultDays: 3,
    color: 'emerald'
  },
  guest_hosting: {
    label: 'Tetamu Menginap',
    icon: '🤝',
    desc: 'Menyambut & melayan tetamu di rumah sendiri',
    defaultDays: 2,
    color: 'blue'
  },
  homestay: {
    label: 'Homestay / Airbnb',
    icon: '🏖️',
    desc: 'Menginap di homestay, villa atau chalet sewa',
    defaultDays: 3,
    color: 'rose'
  },
  weekend_getaway: {
    label: 'Weekend Getaway',
    icon: '🎒',
    desc: 'Percutian santai hujung minggu 2–3 hari',
    defaultDays: 2,
    color: 'purple'
  },
  short_trip: {
    label: 'Short Trip / Transit',
    icon: '🚗',
    desc: 'Singgah kerja, transit kenduri atau urusan penting',
    defaultDays: 2,
    color: 'orange'
  },
  custom: {
    label: 'Kustom / Lain-lain',
    icon: '✨',
    desc: 'Perancangan tinggal singkat mengikut citarasa',
    defaultDays: 3,
    color: 'stone'
  }
};

export const PRIORITY_CONFIG: Record<ActivityPriority, {
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  bgLight: string;
  iconName: string;
  description: string;
}> = {
  must_do: {
    label: 'Wajib Dicapai ⭐',
    shortLabel: 'Wajib',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    borderClass: 'border-l-4 border-l-amber-500',
    bgLight: 'bg-amber-50/70',
    iconName: 'Star',
    description: 'Aktiviti utama & penting (Mesti buat dalam stay ini)'
  },
  optional: {
    label: 'Pilihan / Santai 🌴',
    shortLabel: 'Pilihan',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-l-4 border-l-emerald-400',
    bgLight: 'bg-emerald-50/50',
    iconName: 'Palmtree',
    description: 'Sekadar pilihan (Boleh ganti jika tak sempat atau penat)'
  },
  food: {
    label: 'Makan / Santapan 🍽️',
    shortLabel: 'Makan',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    borderClass: 'border-l-4 border-l-rose-400',
    bgLight: 'bg-rose-50/50',
    iconName: 'Utensils',
    description: 'Sarapan, makan tengah hari, minum petang & makan malam'
  },
  rest: {
    label: 'Rehat / Tidur ☕',
    shortLabel: 'Rehat',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    borderClass: 'border-l-4 border-l-indigo-400',
    bgLight: 'bg-indigo-50/40',
    iconName: 'Coffee',
    description: 'Waktu santai rehatkan badan & luang masa tanpa terkejar'
  },
  logistics: {
    label: 'Perjalanan / Urusan 🚗',
    shortLabel: 'Logistik',
    badgeClass: 'bg-stone-200 text-stone-800 border-stone-300',
    borderClass: 'border-l-4 border-l-stone-400',
    bgLight: 'bg-stone-50',
    iconName: 'Car',
    description: 'Perjalanan, check-in, kemas bagasi & persediaan'
  }
};

export const TIME_SLOTS: Record<TimeSlot, { label: string; period: string; icon: string; bgBadge: string }> = {
  morning: {
    label: 'Pagi',
    period: '07:00 AM – 12:00 PM',
    icon: '🌅',
    bgBadge: 'bg-amber-100/80 text-amber-900 border-amber-200'
  },
  afternoon: {
    label: 'Tengah Hari / Petang',
    period: '12:00 PM – 06:30 PM',
    icon: '☀️',
    bgBadge: 'bg-orange-100/80 text-orange-900 border-orange-200'
  },
  evening: {
    label: 'Malam',
    period: '07:00 PM – Selesai',
    icon: '🌙',
    bgBadge: 'bg-indigo-100/80 text-indigo-900 border-indigo-200'
  },
  flexible: {
    label: 'Fleksibel / Bila-bila Masa',
    period: 'Bebas ikut kelapangan',
    icon: '🍃',
    bgBadge: 'bg-teal-100/80 text-teal-900 border-teal-200'
  }
};

export const CHECKLIST_CATEGORIES: Record<ChecklistCategory, { label: string; icon: string }> = {
  essentials: { label: 'Barang Wajib & Dokumen', icon: '🪪' },
  house_homestay: { label: 'Keperluan Homestay & Rumah', icon: '🏠' },
  food_gifts: { label: 'Buah Tangan & Makanan', icon: '🎁' },
  kids_elderly: { label: 'Anak Kecil & Warga Emas', icon: '👶' },
  custom: { label: 'Lain-lain', icon: '📝' }
};
