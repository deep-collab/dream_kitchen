// Hema's admin: its own page (admin/index.html) and its own bundle, so customers never download
// any of it. English only (docs/admin-guide-for-hema.md explains each screen).
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import AdminApp from './AdminApp'
import '../index.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/admin">
    <I18nProvider initialLang="en">
      <AdminApp />
    </I18nProvider>
  </BrowserRouter>,
)
