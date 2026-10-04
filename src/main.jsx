import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider, loadKannada, readStoredLang } from './i18n/I18nProvider'
import { CartProvider } from './context/CartProvider'
import { MenuProvider } from './context/MenuProvider'
import { ToastProvider } from './components/ui/Toast'
import { ShopSheetsProvider } from './components/shop/ShopSheets'
import App from './App'
import './index.css'

// Someone who chose ಕನ್ನಡ before: fetch the Kannada chunk first (index.html already started
// downloading it), so the first page they see is in Kannada. If it can't load, English with
// a retry. English readers start straight away and never download it.
const start = readStoredLang() === 'kn' ? loadKannada().then(() => ['kn', false], () => ['en', true]) : Promise.resolve(['en', false])

start.then(([initialLang, initialFailed]) =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <I18nProvider initialLang={initialLang} initialFailed={initialFailed}>
          <MenuProvider>
            <CartProvider>
              <ToastProvider>
                <ShopSheetsProvider>
                  <App />
                </ShopSheetsProvider>
              </ToastProvider>
            </CartProvider>
          </MenuProvider>
        </I18nProvider>
      </BrowserRouter>
    </StrictMode>,
  ),
)
