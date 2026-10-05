/*
  Indian states and union territories for the checkout's State dropdown (we ship all over India).
  The courier zone comes from the pincode; the state is used for the address and to warn when the
  two disagree (src/lib/pricing.js stateMismatch). id is what the order stores.
*/
export const states = [
  ['andaman-nicobar', { en: 'Andaman and Nicobar Islands', kn: 'ಅಂಡಮಾನ್ ಮತ್ತು ನಿಕೋಬಾರ್ ದ್ವೀಪಗಳು' }],
  ['andhra-pradesh', { en: 'Andhra Pradesh', kn: 'ಆಂಧ್ರ ಪ್ರದೇಶ' }],
  ['arunachal-pradesh', { en: 'Arunachal Pradesh', kn: 'ಅರುಣಾಚಲ ಪ್ರದೇಶ' }],
  ['assam', { en: 'Assam', kn: 'ಅಸ್ಸಾಂ' }],
  ['bihar', { en: 'Bihar', kn: 'ಬಿಹಾರ' }],
  ['chandigarh', { en: 'Chandigarh', kn: 'ಚಂಡೀಗಢ' }],
  ['chhattisgarh', { en: 'Chhattisgarh', kn: 'ಛತ್ತೀಸ್‌ಗಢ' }],
  ['dnh-dd', { en: 'Dadra and Nagar Haveli and Daman and Diu', kn: 'ದಾದ್ರಾ ಮತ್ತು ನಗರ್ ಹವೇಲಿ ಮತ್ತು ದಮನ್ ಮತ್ತು ದಿಯು' }],
  ['delhi', { en: 'Delhi', kn: 'ದೆಹಲಿ' }],
  ['goa', { en: 'Goa', kn: 'ಗೋವಾ' }],
  ['gujarat', { en: 'Gujarat', kn: 'ಗುಜರಾತ್' }],
  ['haryana', { en: 'Haryana', kn: 'ಹರಿಯಾಣ' }],
  ['himachal-pradesh', { en: 'Himachal Pradesh', kn: 'ಹಿಮಾಚಲ ಪ್ರದೇಶ' }],
  ['jammu-kashmir', { en: 'Jammu and Kashmir', kn: 'ಜಮ್ಮು ಮತ್ತು ಕಾಶ್ಮೀರ' }],
  ['jharkhand', { en: 'Jharkhand', kn: 'ಜಾರ್ಖಂಡ್' }],
  ['karnataka', { en: 'Karnataka', kn: 'ಕರ್ನಾಟಕ' }],
  ['kerala', { en: 'Kerala', kn: 'ಕೇರಳ' }],
  ['ladakh', { en: 'Ladakh', kn: 'ಲಡಾಖ್' }],
  ['lakshadweep', { en: 'Lakshadweep', kn: 'ಲಕ್ಷದ್ವೀಪ' }],
  ['madhya-pradesh', { en: 'Madhya Pradesh', kn: 'ಮಧ್ಯ ಪ್ರದೇಶ' }],
  ['maharashtra', { en: 'Maharashtra', kn: 'ಮಹಾರಾಷ್ಟ್ರ' }],
  ['manipur', { en: 'Manipur', kn: 'ಮಣಿಪುರ' }],
  ['meghalaya', { en: 'Meghalaya', kn: 'ಮೇಘಾಲಯ' }],
  ['mizoram', { en: 'Mizoram', kn: 'ಮಿಜೋರಾಂ' }],
  ['nagaland', { en: 'Nagaland', kn: 'ನಾಗಾಲ್ಯಾಂಡ್' }],
  ['odisha', { en: 'Odisha', kn: 'ಒಡಿಶಾ' }],
  ['puducherry', { en: 'Puducherry', kn: 'ಪುದುಚೇರಿ' }],
  ['punjab', { en: 'Punjab', kn: 'ಪಂಜಾಬ್' }],
  ['rajasthan', { en: 'Rajasthan', kn: 'ರಾಜಸ್ಥಾನ' }],
  ['sikkim', { en: 'Sikkim', kn: 'ಸಿಕ್ಕಿಂ' }],
  ['tamil-nadu', { en: 'Tamil Nadu', kn: 'ತಮಿಳುನಾಡು' }],
  ['telangana', { en: 'Telangana', kn: 'ತೆಲಂಗಾಣ' }],
  ['tripura', { en: 'Tripura', kn: 'ತ್ರಿಪುರ' }],
  ['uttar-pradesh', { en: 'Uttar Pradesh', kn: 'ಉತ್ತರ ಪ್ರದೇಶ' }],
  ['uttarakhand', { en: 'Uttarakhand', kn: 'ಉತ್ತರಾಖಂಡ' }],
  ['west-bengal', { en: 'West Bengal', kn: 'ಪಶ್ಚಿಮ ಬಂಗಾಳ' }],
].map(([id, name]) => ({ id, name }))

export const stateIds = new Set(states.map((s) => s.id))
export const stateName = (id) => states.find((s) => s.id === id)?.name || null
