import { Stay, AgendaItem, ChecklistItem } from '../types';
import { TIME_SLOTS, PRIORITY_CONFIG } from './constants';

export function formatDateRange(startDateStr?: string, endDateStr?: string, durationDays: number = 3): string {
  if (!startDateStr) return `${durationDays} Hari`;
  try {
    const start = new Date(startDateStr);
    const startFormatted = start.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
    if (!endDateStr) return `${startFormatted} (${durationDays} Hari)`;
    const end = new Date(endDateStr);
    const endFormatted = end.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startFormatted} – ${endFormatted} (${durationDays} Hari ${durationDays > 1 ? `${durationDays - 1} Malam` : ''})`;
  } catch {
    return `${durationDays} Hari`;
  }
}

export function generateWhatsAppMessage(stay: Stay, agendaItems: AgendaItem[], checklistItems?: ChecklistItem[]): string {
  const stayAgendas = agendaItems.filter((a) => a.stayId === stay.id);
  
  let msg = `🌟 *STAYPLAN: ${stay.title.toUpperCase()}*\n`;
  msg += `_"Plan the stay, not just the calendar."_\n\n`;
  
  msg += `📍 *Lokasi:* ${stay.location || 'Tidak dinyatakan'}\n`;
  if (stay.address) msg += `🗺️ *Alamat:* ${stay.address}\n`;
  msg += `📅 *Tempoh:* ${formatDateRange(stay.startDate, stay.endDate, stay.durationDays)}\n`;
  
  if (stay.companions && stay.companions.length > 0) {
    msg += `👥 *Bersama:* ${stay.companions.join(', ')}\n`;
  }
  
  if (stay.wifiSsid) {
    msg += `📶 *WiFi:* ${stay.wifiSsid} ${stay.wifiPassword ? `(Kata laluan: ${stay.wifiPassword})` : ''}\n`;
  }
  
  if (stay.hostContact) {
    msg += `📞 *Hubungi:* ${stay.hostName ? `${stay.hostName} ` : ''}(${stay.hostContact})\n`;
  }

  msg += `\n═══════════════════════\n`;
  msg += `   📋 *AGENDA PERJALANAN*   \n`;
  msg += `═══════════════════════\n`;

  for (let day = 1; day <= stay.durationDays; day++) {
    const dayItems = stayAgendas.filter((a) => a.dayNumber === day);
    msg += `\n📌 *HARI ${day}*\n`;

    if (dayItems.length === 0) {
      msg += `  _(Tiada aktiviti dirancang lagi)_\n`;
      continue;
    }

    const slotOrder: ('morning' | 'afternoon' | 'evening' | 'flexible')[] = ['morning', 'afternoon', 'evening', 'flexible'];

    for (const slot of slotOrder) {
      const slotItems = dayItems.filter((i) => i.timeSlot === slot);
      if (slotItems.length === 0) continue;

      const slotMeta = TIME_SLOTS[slot];
      msg += `\n${slotMeta.icon} *${slotMeta.label}*\n`;

      slotItems.forEach((item) => {
        const priorityTag = item.priority === 'must_do' 
          ? '⭐ [WAJIB]' 
          : item.priority === 'food' 
          ? '🍽️ [MAKAN]' 
          : item.priority === 'rest' 
          ? '☕ [REHAT]' 
          : item.priority === 'logistics' 
          ? '🚗 [LOGISTIK]' 
          : '🌴 [PILIHAN]';

        const statusIcon = item.isCompleted ? '✅' : '•';
        const timeStr = item.timeSpecific ? ` (${item.timeSpecific})` : '';
        const locStr = item.locationName ? ` 📍 ${item.locationName}` : '';
        const picStr = item.personInCharge ? ` [PIC: ${item.personInCharge}]` : '';

        msg += `${statusIcon} ${priorityTag} *${item.title}*${timeStr}${locStr}${picStr}\n`;
        if (item.description) {
          msg += `   _${item.description}_\n`;
        }
      });
    }
    msg += `───────────────────────\n`;
  }

  if (stay.importantNotes || (stay.houseRules && stay.houseRules.length > 0)) {
    msg += `\n💡 *NOTA PENTING & PERATURAN:*\n`;
    if (stay.gatePin) msg += `🔑 *Kunci/Pin:* ${stay.gatePin}\n`;
    if (stay.importantNotes) msg += `• ${stay.importantNotes}\n`;
    if (stay.houseRules) {
      stay.houseRules.forEach((rule) => {
        msg += `• ${rule}\n`;
      });
    }
  }

  msg += `\n📱 _Disediakan dengan kasih sayang melalui StayPlan (stayplan.syncrozz.com)_`;

  return msg;
}
