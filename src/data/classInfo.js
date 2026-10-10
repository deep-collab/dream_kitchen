// The Classes page details: Hema's, 7 Oct 2026. Text is { en, kn } (plain strings, one pair
// each); prices are in rupees. Changing a day, slot, name or price is a text change only.
// `booking` is the class name typed into the WhatsApp message ("Hi, I'd like to book the Basic class").
// Hema can change the fees, the slot times and the seats per slot in /admin -> Classes; those
// changes are applied on top of this file by src/lib/classes.js (website and server alike).

export const classSchedule = {
  when: { en: 'Every Saturday and Sunday', kn: 'ಪ್ರತಿ ಶನಿವಾರ ಮತ್ತು ಭಾನುವಾರ' },
  duration: { en: '2-day class', kn: '2 ದಿನಗಳ ತರಗತಿ' },
}

export const classes = [
  { id: 'basic', name: { en: 'Basic', kn: 'ಬೇಸಿಕ್' }, booking: 'Basic', price: 2500 },
  { id: 'advanced', name: { en: 'Advanced', kn: 'ಅಡ್ವಾನ್ಸ್ಡ್' }, booking: 'Advanced', price: 3500 },
  { id: 'brownie', name: { en: 'Brownie', kn: 'ಬ್ರೌನಿ' }, booking: 'Brownie', price: 3500, beginnerFriendly: true },
]

// The two slots, the same on Saturday and Sunday (24-hour "HH:MM", Indian time): 9–11 AM, 12–2 PM
export const classSlots = [
  { id: 'morning', start: '09:00', end: '11:00' },
  { id: 'midday', start: '12:00', end: '14:00' },
]

// Kannada slot times say the part of the day ("morning 9–11"): the part for a start hour below `before`
export const dayParts = [
  { before: 12, name: { en: 'Class time: morning', kn: 'ಬೆಳಿಗ್ಗೆ' } },
  { before: 16, name: { en: 'Class time: afternoon', kn: 'ಮಧ್ಯಾಹ್ನ' } },
  { before: 19, name: { en: 'Class time: evening', kn: 'ಸಂಜೆ' } },
  { before: 24, name: { en: 'Class time: night', kn: 'ರಾತ್ರಿ' } },
]

// Seats per slot. null = not set yet: no limit, and the site shows no seat count.
export const classSeats = null

// How many weekends ahead customers can book
export const bookableWeekends = 8
