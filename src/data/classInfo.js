// The Classes page details: Hema's, 7 Oct 2026. Text is { en, kn } (plain strings, one pair
// each); prices are in rupees. Changing a day, slot, name or price is a text change only.
// `booking` is the class name typed into the WhatsApp message ("Hi, I'd like to book the Basic class").

export const classSchedule = {
  when: { en: 'Every Saturday and Sunday', kn: 'ಪ್ರತಿ ಶನಿವಾರ ಮತ್ತು ಭಾನುವಾರ' },
  duration: { en: '2-day class', kn: '2 ದಿನಗಳ ತರಗತಿ' },
  slots: { en: '9–11 AM or 12–2 PM', kn: 'ಬೆಳಿಗ್ಗೆ 9–11 ಅಥವಾ ಮಧ್ಯಾಹ್ನ 12–2' },
}

export const classes = [
  { id: 'basic', name: { en: 'Basic', kn: 'ಬೇಸಿಕ್' }, booking: 'Basic', price: 2500 },
  { id: 'advanced', name: { en: 'Advanced', kn: 'ಅಡ್ವಾನ್ಸ್ಡ್' }, booking: 'Advanced', price: 3500 },
  { id: 'brownie', name: { en: 'Brownie', kn: 'ಬ್ರೌನಿ' }, booking: 'Brownie', price: 3500, beginnerFriendly: true },
]
