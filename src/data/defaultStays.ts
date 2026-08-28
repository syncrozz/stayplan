import { Stay, AgendaItem, ChecklistItem } from '../types';

/**
 * Clean, sanitized showcase examples for public exploration / unauthenticated visitors.
 * These contain NO real personal data, private Wi-Fi passwords, real phone numbers, or private notes.
 * Showcase items are read-only and never automatically persisted to an authenticated user's database.
 */
export const SHOWCASE_STAYS: Stay[] = [
  {
    id: 'showcase-family-getaway',
    title: 'Contoh: Percutian Santai Homestay 3H2M',
    type: 'homestay',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: 3,
    location: 'Cameron Highlands, Pahang',
    address: 'Persiaran Pelancongan, Tanah Rata, Pahang',
    googleMapsUrl: 'https://maps.google.com/?q=Tanah+Rata,Cameron+Highlands',
    wifiSsid: 'Contoh_Homestay_WiFi',
    wifiPassword: 'kata_laluan_anda',
    hostName: 'Hos Homestay',
    hostContact: '+60 12-000 0000',
    gatePin: 'Diberikan oleh hos semasa daftar masuk',
    houseRules: [
      'Daftar masuk: 3:00 PM | Daftar keluar: 12:00 PM',
      'Sila jaga kebersihan dan ketenteraman bersama',
      'Matikan suis lampu & pemanas air apabila keluar'
    ],
    importantNotes: 'Ini adalah contoh pelan StayPlan. Log masuk dengan akaun Google anda untuk cipta pelan peribadi sebenar.',
    companions: ['Keluarga & Anak-anak (Contoh)'],
    themeColor: 'emerald',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000
  },
  {
    id: 'showcase-balik-kampung',
    title: 'Contoh: Kepulangan Santai Balik Kampung',
    type: 'balik_kampung',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: 3,
    location: 'Muar, Johor',
    address: 'Jalan Utama Kampung, Muar, Johor',
    googleMapsUrl: 'https://maps.google.com/?q=Muar,Johor',
    wifiSsid: 'WiFi_RumahKampung',
    wifiPassword: 'kata_laluan_contoh',
    hostName: 'Keluarga Kampung',
    hostContact: '+60 19-000 0000',
    gatePin: 'Kunci rumah / simpanan selamat',
    houseRules: [
      'Buka kasut sebelum masuk rumah',
      'Tutup pintu jaring waktu senja (elak serangga)'
    ],
    importantNotes: 'Sediakan ubat rutin dan keperluan orang tua lebih awal.',
    companions: ['Ahli Keluarga Terdekat'],
    themeColor: 'amber',
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000
  }
];

export const SHOWCASE_AGENDA_ITEMS: AgendaItem[] = [
  // Day 1
  {
    id: 'showcase-a1',
    stayId: 'showcase-family-getaway',
    dayNumber: 1,
    timeSlot: 'morning',
    timeSpecific: '08:30 AM',
    title: 'Bertolak Perjalanan & Singgah Sarapan Pagi',
    description: 'Pandu santai, singgah sebentar minum kopi dan sarapan bersama keluarga.',
    priority: 'logistics',
    locationName: 'Hentian Rehat / Lebuhraya',
    personInCharge: 'Pemandu',
    isCompleted: true
  },
  {
    id: 'showcase-a2',
    stayId: 'showcase-family-getaway',
    dayNumber: 1,
    timeSlot: 'afternoon',
    timeSpecific: '03:00 PM',
    title: 'Daftar Masuk Homestay & Rehat Melepaskan Lelah',
    description: 'Buka kunci, susun beg dan berehat seketika dalam suasana sejuk selesa.',
    priority: 'must_do',
    locationName: 'Ruang Tamu Homestay',
    personInCharge: 'Semua',
    isCompleted: true
  },
  {
    id: 'showcase-a3',
    stayId: 'showcase-family-getaway',
    dayNumber: 1,
    timeSlot: 'evening',
    timeSpecific: '07:30 PM',
    title: 'Makan Malam Santai Bersama',
    description: 'Nikmati hidangan panas santai malam pertama tanpa tergesa-gesa.',
    priority: 'food',
    locationName: 'Kedai Makan Pilihan',
    personInCharge: 'Semua',
    isCompleted: false
  },

  // Day 2
  {
    id: 'showcase-a4',
    stayId: 'showcase-family-getaway',
    dayNumber: 2,
    timeSlot: 'morning',
    timeSpecific: '09:00 AM',
    title: 'Lawatan Santai Pagi & Udara Segar',
    description: 'Aktiviti santai pagi menikmati pemandangan alam semula jadi.',
    priority: 'must_do',
    locationName: 'Taman / Ladang Segar',
    personInCharge: 'Ketua Rombongan',
    isCompleted: false
  },
  {
    id: 'showcase-a5',
    stayId: 'showcase-family-getaway',
    dayNumber: 2,
    timeSlot: 'afternoon',
    timeSpecific: '02:00 PM',
    title: 'Waktu Bebas & Minum Petang',
    description: 'Beri ruang untuk berehat atau aktiviti ringan tanpa jadual padat.',
    priority: 'rest',
    locationName: 'Kafe / Anjung Homestay',
    personInCharge: 'Bebas',
    isCompleted: false
  },
  {
    id: 'showcase-a6',
    stayId: 'showcase-family-getaway',
    dayNumber: 2,
    timeSlot: 'evening',
    timeSpecific: '08:00 PM',
    title: 'Sesi Sembang Malam & Permainan Keluarga',
    description: 'Waktu berkualiti bersama borak santai dan bersuai kenal.',
    priority: 'optional',
    locationName: 'Ruang Tamu',
    personInCharge: 'Semua',
    isCompleted: false
  },

  // Day 3
  {
    id: 'showcase-a7',
    stayId: 'showcase-family-getaway',
    dayNumber: 3,
    timeSlot: 'morning',
    timeSpecific: '10:30 AM',
    title: 'Kemas Beg, Periksa Barang & Daftar Keluar',
    description: 'Pastikan tiada barang tertinggal (pengecas, kunci, jaket) sebelum berlepas.',
    priority: 'must_do',
    locationName: 'Homestay',
    personInCharge: 'Semua',
    isCompleted: false
  }
];

export const SHOWCASE_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'showcase-c1', stayId: 'showcase-family-getaway', category: 'essentials', text: 'Pakaian secukupnya & baju solat', isCompleted: true },
  { id: 'showcase-c2', stayId: 'showcase-family-getaway', category: 'essentials', text: 'Pengecas telefon & ubatan peribadi', isCompleted: true },
  { id: 'showcase-c3', stayId: 'showcase-family-getaway', category: 'house_homestay', text: 'Extension plug & tuala mandi tambahan', isCompleted: false },
  { id: 'showcase-c4', stayId: 'showcase-family-getaway', category: 'food_gifts', text: 'Snek perjalanan & air minuman', isCompleted: true },
  { id: 'showcase-c5', stayId: 'showcase-family-getaway', category: 'kids_elderly', text: 'Kelengkapan anak kecil / keperluan khas', isCompleted: false }
];
