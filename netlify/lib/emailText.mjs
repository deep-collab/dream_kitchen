// Words in the emails customers receive, in English and Kannada (they get the language they
// ordered in). Hema's own emails are English only. New Kannada here is listed for Hema's
// proofreading in docs/kannada-priority-for-hema.md (scripts/kannada-list.mjs reads this file).
export const customerText = {
  placedSubject: { en: 'Your Dream Kitchen order {code}', kn: 'ನಿಮ್ಮ Dream Kitchen ಆರ್ಡರ್ {code}' },
  placedHello: { en: 'Hi {name}, thank you for your order!', kn: 'ನಮಸ್ಕಾರ {name}, ನಿಮ್ಮ ಆರ್ಡರ್‌ಗೆ ಧನ್ಯವಾದಗಳು!' },
  placedPay: {
    en: 'Please pay {total} by UPI and enter the 12-digit UPI reference on the website, if you haven’t already.',
    kn: 'ದಯವಿಟ್ಟು UPI ಮೂಲಕ {total} ಪಾವತಿಸಿ ಮತ್ತು 12 ಅಂಕಿಯ UPI ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆಯನ್ನು ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ನಮೂದಿಸಿ (ಈಗಾಗಲೇ ಮಾಡಿಲ್ಲದಿದ್ದರೆ).',
  },
  placedPaid: { en: 'We have received your payment of {total}.', kn: 'ನಿಮ್ಮ {total} ಪಾವತಿ ನಮಗೆ ತಲುಪಿದೆ.' },
  placedCheck: {
    en: 'Hema will confirm your payment, usually within a few hours.',
    kn: 'ಹೇಮಾ ಅವರು ನಿಮ್ಮ ಪಾವತಿಯನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ಕೆಲವು ಗಂಟೆಗಳಲ್ಲಿ ಖಚಿತಪಡಿಸುತ್ತಾರೆ.',
  },
  items: { en: 'Your items', kn: 'ನಿಮ್ಮ ವಸ್ತುಗಳು' },
  subtotal: { en: 'Items', kn: 'ವಸ್ತುಗಳು' },
  courier: { en: 'Courier', kn: 'ಕೊರಿಯರ್' },
  total: { en: 'Total', kn: 'ಒಟ್ಟು' },
  dispatch: { en: 'Preferred dispatch date: {date}', kn: 'ಕಳುಹಿಸುವ ದಿನಾಂಕ: {date}' },
  courierNote: { en: 'Delivery time depends on the courier after dispatch.', kn: 'ಕಳುಹಿಸಿದ ನಂತರ ತಲುಪುವ ಸಮಯ ಕೊರಿಯರ್ ಮೇಲೆ ಅವಲಂಬಿತ.' },
  track: { en: 'Track your order: {link}', kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ: {link}' },
  questions: { en: 'Questions? Call {phone}.', kn: 'ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? {phone} ಗೆ ಕರೆ ಮಾಡಿ.' },
  shippedSubject: { en: 'Your order {code} is on its way', kn: 'ನಿಮ್ಮ ಆರ್ಡರ್ {code} ಕಳುಹಿಸಲಾಗಿದೆ' },
  shippedHello: { en: 'Hi {name}, your order has been sent.', kn: 'ನಮಸ್ಕಾರ {name}, ನಿಮ್ಮ ಆರ್ಡರ್ ಕಳುಹಿಸಲಾಗಿದೆ.' },
  shippedCourier: { en: 'Courier: {courier}. Tracking number: {tracking}', kn: 'ಕೊರಿಯರ್: {courier}. ಟ್ರ್ಯಾಕಿಂಗ್ ಸಂಖ್ಯೆ: {tracking}' },
  shippedLink: { en: 'Courier tracking: {link}', kn: 'ಕೊರಿಯರ್ ಟ್ರ್ಯಾಕಿಂಗ್: {link}' },
  size: { en: 'Size', kn: 'ಗಾತ್ರ' },
  ragi: { en: 'Ragi version', kn: 'ರಾಗಿ ಆವೃತ್ತಿ' },
  nameOnBox: { en: 'Name on the box', kn: 'ಬಾಕ್ಸ್ ಮೇಲೆ ಹೆಸರು' },
  drawing: { en: 'Drawing', kn: 'ಚಿತ್ರ' },
  thanks: { en: 'With love, Hema, Dream Kitchen', kn: 'ಪ್ರೀತಿಯಿಂದ, ಹೇಮಾ, Dream Kitchen' },
}
