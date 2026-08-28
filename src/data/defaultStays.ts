import { Stay, AgendaItem, ChecklistItem } from '../types';

export const INITIAL_STAYS: Stay[] = [
  {
    id: 'stay-muar-raya',
    title: 'Balik Kampung Muar (Rumah Tok)',
    type: 'balik_kampung',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: 3,
    location: 'Parit Bakar, Muar, Johor',
    address: 'No. 24, Jalan Masjid Parit Bakar Darat, 84000 Muar, Johor',
    googleMapsUrl: 'https://maps.google.com/?q=Muar,Johor',
    wifiSsid: 'RumahTok_Unifi',
    wifiPassword: 'toksayangcucu2024',
    hostName: 'Tok Wan & Tok Mak',
    hostContact: '+6012-3456789',
    gatePin: 'Kunci bawah pasu bunga kanan',
    houseRules: [
      'Buka kasut sebelum naik anjung',
      'Matikan suis pemanas air lepas guna',
      'Tutup pintu jaring waktu senja (elak nyamuk)'
    ],
    importantNotes: 'Tok suka makan Mee Bandung Abu Bakar Hanipah. Jangan lupa singgah beli.',
    companions: ['Ayah & Mak', 'Abang Long Family', 'Adik Bongsu', 'Tok Wan', 'Tok Mak'],
    themeColor: 'amber',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000
  },
  {
    id: 'stay-cameron-homestay',
    title: 'Family Getaway Homestay Cameron Highlands',
    type: 'homestay',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: 3,
    location: 'Tanah Rata, Cameron Highlands',
    address: 'The Quintet Condominium, Jalan Tengkolok, 39000 Tanah Rata, Pahang',
    googleMapsUrl: 'https://maps.google.com/?q=Tanah+Rata,Cameron+Highlands',
    wifiSsid: 'Cameron_CozyStay_5G',
    wifiPassword: 'strawberries2025',
    hostName: 'En. Firdaus (Host Homestay)',
    hostContact: '+6017-9876543',
    gatePin: 'Smartlock: #4829#',
    houseRules: [
      'Check-in: 3:00 PM | Check-out: 12:00 PM',
      'Dilarang memasak makanan tidak halal di dapur basah',
      'Sila buang sampah ke bilik sampah tingkat bawah sebelum checkout'
    ],
    importantNotes: 'Parkir disediakan 2 petak khas (Lot 45 & 46). Bawa jaket tebal untuk malam.',
    companions: ['Suami/Isteri', 'Anak-anak (2 orang)', 'Ibu Mertua'],
    themeColor: 'emerald',
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 80000
  },
  {
    id: 'stay-tetamu-rumah',
    title: 'Tetamu Sahabat Menginap di Rumah',
    type: 'guest_hosting',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    durationDays: 2,
    location: 'Shah Alam, Selangor',
    address: 'Seksyen 7, Shah Alam, Selangor',
    wifiSsid: 'HomeSweetHome_Guest',
    wifiPassword: 'welcomemyfriend',
    hostName: 'Tuan Rumah (Saya)',
    hostContact: '+6019-1122334',
    houseRules: [
      'Tuala dan sabun disediakan di bilik tetamu atas',
      'Air tapis Coway di dapur sedia diminum'
    ],
    importantNotes: 'Sahabat dari Penang transit sempena kenduri kahwin kawan sekampung.',
    companions: ['Keluarga Azlan (4 orang)', 'Keluarga Kita'],
    themeColor: 'blue',
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000
  }
];

export const INITIAL_AGENDA_ITEMS: AgendaItem[] = [
  // Muar - Day 1
  {
    id: 'muar-d1-1',
    stayId: 'stay-muar-raya',
    dayNumber: 1,
    timeSlot: 'morning',
    timeSpecific: '08:00 AM',
    title: 'Perjalanan Balik Kampung & Singgah Sarapan',
    description: 'Bertolak awal pagi elak jem di Lebuhraya PLUS. Singgah R&R Seremban beli kopi & kuih.',
    priority: 'logistics',
    locationName: 'PLUS Highway R&R Seremban',
    personInCharge: 'Ayah / Driver',
    isCompleted: true
  },
  {
    id: 'muar-d1-2',
    stayId: 'stay-muar-raya',
    dayNumber: 1,
    timeSlot: 'afternoon',
    timeSpecific: '01:30 PM',
    title: 'Makan Tengah Hari Mee Bandung Muar & Sembang Tok',
    description: 'Bungkus Mee Bandung Original Abu Bakar Hanipah, makan berjemaah di anjung rumah.',
    priority: 'must_do',
    locationName: 'Rumah Tok Wan',
    personInCharge: 'Abang Long',
    isCompleted: true
  },
  {
    id: 'muar-d1-3',
    stayId: 'stay-muar-raya',
    dayNumber: 1,
    timeSlot: 'afternoon',
    timeSpecific: '04:30 PM',
    title: 'Rehat, Solat & Kemas Bilik Tidur',
    description: 'Pasang toto, pasang ubat nyamuk, pastikan tilam mencukupi untuk semua cucu.',
    priority: 'rest',
    locationName: 'Bilik Tengah & Bilik Atas',
    personInCharge: 'Semua',
    isCompleted: false
  },
  {
    id: 'muar-d1-4',
    stayId: 'stay-muar-raya',
    dayNumber: 1,
    timeSlot: 'evening',
    timeSpecific: '08:30 PM',
    title: 'Sesi Sembang Santai & Kopi Tok Wan',
    description: 'Waktu emas sembang kisah lama kampung sambil minum kopi O panas dan biskut tawar.',
    priority: 'must_do',
    locationName: 'Anjung Luar Rumah Tok',
    personInCharge: 'Semua Keluarga',
    isCompleted: false
  },

  // Muar - Day 2
  {
    id: 'muar-d2-1',
    stayId: 'stay-muar-raya',
    dayNumber: 2,
    timeSlot: 'morning',
    timeSpecific: '07:30 AM',
    title: 'Sarapan Sate Pagi & Roti Canai Parit Jawa',
    description: 'Tradisi orang Muar sarapan sate daging & sup kambing pagi-pagi.',
    priority: 'food',
    locationName: 'Kedai Kopi Parit Jawa',
    personInCharge: 'Mak & Ayah',
    isCompleted: false
  },
  {
    id: 'muar-d2-2',
    stayId: 'stay-muar-raya',
    dayNumber: 2,
    timeSlot: 'morning',
    timeSpecific: '10:00 AM',
    title: 'Ziarah Mak Ngah & Kubur Arwah Moyang',
    description: 'Ziarah rumah saudara terdekat di Parit Bakar Tengah.',
    priority: 'must_do',
    locationName: 'Rumah Mak Ngah & Tanah Perkuburan',
    personInCharge: 'Tok Wan & Ayah',
    isCompleted: false
  },
  {
    id: 'muar-d2-3',
    stayId: 'stay-muar-raya',
    dayNumber: 2,
    timeSlot: 'afternoon',
    timeSpecific: '03:00 PM',
    title: 'Kait Buah Rambutan & Durian di Dusun Belakang',
    description: 'Bawa anak-anak rasa suasana kutip buah tepi parit.',
    priority: 'optional',
    locationName: 'Dusun Belakang Rumah',
    personInCharge: 'Abang Long & Cucu-cucu',
    isCompleted: false
  },
  {
    id: 'muar-d2-4',
    stayId: 'stay-muar-raya',
    dayNumber: 2,
    timeSlot: 'evening',
    timeSpecific: '07:30 PM',
    title: 'Makan Malam Asam Pedas Parit Jawa & Otak-otak',
    description: 'Pekena Asam Pedas Ikan Mayong fresh tepi jeti.',
    priority: 'food',
    locationName: 'Restoran Asam Pedas Parit Jawa',
    personInCharge: 'Adik Bongsu',
    isCompleted: false
  },

  // Muar - Day 3
  {
    id: 'muar-d3-1',
    stayId: 'stay-muar-raya',
    dayNumber: 3,
    timeSlot: 'morning',
    timeSpecific: '08:30 AM',
    title: 'Kemas Rumah, Bungkus Buah Tangan Tok & Bersalaman',
    description: 'Tolong Tok kemas rumah, buang sampah, periksa pintu & tingkap.',
    priority: 'must_do',
    locationName: 'Rumah Tok',
    personInCharge: 'Semua',
    isCompleted: false
  },
  {
    id: 'muar-d3-2',
    stayId: 'stay-muar-raya',
    dayNumber: 3,
    timeSlot: 'afternoon',
    timeSpecific: '01:00 PM',
    title: 'Singgah Beli Otak-otak Kempas / Kopi 434 & Bertolak Balik',
    description: 'Beli buah tangan untuk jiran dan rakan pejabat.',
    priority: 'optional',
    locationName: 'Pekan Muar',
    personInCharge: 'Driver',
    isCompleted: false
  },

  // Cameron Homestay Items
  {
    id: 'cam-d1-1',
    stayId: 'stay-cameron-homestay',
    dayNumber: 1,
    timeSlot: 'morning',
    timeSpecific: '09:00 AM',
    title: 'Perjalanan Naik Tapah / Simpang Pulai',
    description: 'Pandu berhati-hati, berhenti di Lata Iskandar sekejap hirup udara segar.',
    priority: 'logistics',
    isCompleted: false
  },
  {
    id: 'cam-d1-2',
    stayId: 'stay-cameron-homestay',
    dayNumber: 1,
    timeSlot: 'afternoon',
    timeSpecific: '03:00 PM',
    title: 'Self Check-in Homestay & Rehat Sejuk',
    description: 'Buka smartlock, periksa kelengkapan tuala & pemanas air.',
    priority: 'must_do',
    locationName: 'The Quintet Tanah Rata',
    isCompleted: false
  },
  {
    id: 'cam-d1-3',
    stayId: 'stay-cameron-homestay',
    dayNumber: 1,
    timeSlot: 'evening',
    timeSpecific: '07:30 PM',
    title: 'Makan Steamboat Panas Halal',
    description: 'Nikmati steamboat sup tomyam & ayam dalam cuaca 16°C.',
    priority: 'food',
    locationName: 'Highland Steamboat Tanah Rata',
    isCompleted: false
  },
  {
    id: 'cam-d2-1',
    stayId: 'stay-cameron-homestay',
    dayNumber: 2,
    timeSlot: 'morning',
    timeSpecific: '08:30 AM',
    title: 'BOH Tea Centre Sungai Palas & Scones',
    description: 'Pemandangan ladang teh ikonik & makan scones bersama jem strawberi panas.',
    priority: 'must_do',
    locationName: 'BOH Tea Centre Sg Palas',
    isCompleted: false
  },
  {
    id: 'cam-d2-2',
    stayId: 'stay-cameron-homestay',
    dayNumber: 2,
    timeSlot: 'afternoon',
    timeSpecific: '02:30 PM',
    title: 'Petik Strawberi Segar & Taman Kaktus',
    description: 'Aktiviti santai untuk anak-anak & beli sayur segar.',
    priority: 'optional',
    locationName: 'Big Red Strawberry Farm',
    isCompleted: false
  },
  {
    id: 'cam-d2-3',
    stayId: 'stay-cameron-homestay',
    dayNumber: 2,
    timeSlot: 'evening',
    timeSpecific: '08:00 PM',
    title: 'Pasar Malam Golden Hills (Kea Farm vibes)',
    description: 'Beli jagung mutiara rebus manis, ubi madu & cenderamata.',
    priority: 'optional',
    locationName: 'Pasar Malam Golden Hills',
    isCompleted: false
  },
  {
    id: 'cam-d3-1',
    stayId: 'stay-cameron-homestay',
    dayNumber: 3,
    timeSlot: 'morning',
    timeSpecific: '10:00 AM',
    title: 'Kemas Beg & Check-out Homestay',
    description: 'Pastikan tiada barang tertinggal (charger, jaket, tuala).',
    priority: 'must_do',
    locationName: 'The Quintet',
    isCompleted: false
  }
];

export const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Muar checklist
  { id: 'chk-muar-1', stayId: 'stay-muar-raya', category: 'essentials', text: 'Kain pelekat & telekung solat', isCompleted: true },
  { id: 'chk-muar-2', stayId: 'stay-muar-raya', category: 'essentials', text: 'Ubat rutin darah tinggi Tok / mak ayah', isCompleted: true },
  { id: 'chk-muar-3', stayId: 'stay-muar-raya', category: 'food_gifts', text: 'Buah tangan (Kek lapis & buah-buahan segar)', isCompleted: true },
  { id: 'chk-muar-4', stayId: 'stay-muar-raya', category: 'house_homestay', text: 'Extension wire (plug terhad di rumah kampung)', isCompleted: false },
  { id: 'chk-muar-5', stayId: 'stay-muar-raya', category: 'house_homestay', text: 'Ubat nyamuk lingkaran / spray serangga', isCompleted: false },
  { id: 'chk-muar-6', stayId: 'stay-muar-raya', category: 'kids_elderly', text: 'Pampers & baju salin lebih untuk anak kecil', isCompleted: true },

  // Cameron checklist
  { id: 'chk-cam-1', stayId: 'stay-cameron-homestay', category: 'essentials', text: 'Jaket tebal & sweater untuk setiap orang', isCompleted: true },
  { id: 'chk-cam-2', stayId: 'stay-cameron-homestay', category: 'house_homestay', text: 'Stoking tidur tebal & tuala tambahan', isCompleted: false },
  { id: 'chk-cam-3', stayId: 'stay-cameron-homestay', category: 'food_gifts', text: 'Kotak polistirena / cooler box untuk bawa balik sayur & strawberi', isCompleted: false },
  { id: 'chk-cam-4', stayId: 'stay-cameron-homestay', category: 'essentials', text: 'Minyak angin & ubat mabuk jalan bukit', isCompleted: true }
];
