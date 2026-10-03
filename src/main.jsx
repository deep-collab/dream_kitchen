import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nProvider'
import { CartProvider } from './context/CartProvider'
import { MenuProvider } from './context/MenuProvider'
import { ToastProvider } from './components/ui/Toast'
import { ShopSheetsProvider } from './components/shop/ShopSheets'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <CartProvider>
          <MenuProvider>
            <ToastProvider>
              <ShopSheetsProvider>
                <App />
              </ShopSheetsProvider>
            </ToastProvider>
          </MenuProvider>
        </CartProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
