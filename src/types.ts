export type StayType =
  | 'balik_kampung'
  | 'family_stay'
  | 'guest_hosting'
  | 'homestay'
  | 'weekend_getaway'
  | 'short_trip'
  | 'custom';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'flexible';

export type ActivityPriority = 'must_do' | 'optional' | 'food' | 'rest' | 'logistics';

export interface AgendaItem {
  id: string;
  stayId: string;
  dayNumber: number; // 1, 2, 3, 4...
  timeSlot: TimeSlot;
  timeSpecific?: string; // e.g. "08:30 AM" or "Lepas Subuh"
  title: string;
  description?: string;
  priority: ActivityPriority;
  locationName?: string;
  personInCharge?: string;
  isCompleted: boolean;
  notes?: string;
}

export type ChecklistCategory = 'essentials' | 'house_homestay' | 'food_gifts' | 'kids_elderly' | 'custom';

export interface ChecklistItem {
  id: string;
  stayId: string;
  category: ChecklistCategory;
  text: string;
  isCompleted: boolean;
}

export interface Stay {
  id: string;
  title: string;
  type: StayType;
  startDate: string;
  endDate: string;
  durationDays: number;
  location: string;
  address?: string;
  wazeUrl?: string;
  googleMapsUrl?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  hostContact?: string;
  hostName?: string;
  gatePin?: string;
  houseRules?: string[];
  importantNotes?: string;
  companions: string[];
  themeColor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StayData {
  stays: Stay[];
  agendaItems: AgendaItem[];
  checklistItems: ChecklistItem[];
  activeStayId: string | null;
}
