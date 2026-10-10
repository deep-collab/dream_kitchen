// Hema's admin: its own page (admin/index.html) and its own bundle, so customers never download
// any of it. English only (docs/admin-guide-for-hema.md explains each screen).
// /admin/demo is the same admin on sample data, in the browser only (src/admin/demo): it loads
// its practice backend on demand, so the real admin doesn't carry it.
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nProvider'
import { setDemoBackend } from './api'
import AdminApp from './AdminApp'
import '../index.css'

const demo = /^\/admin\/demo(\/|$)/.test(window.location.pathname)

async function start() {
  if (demo) {
    document.title = 'Dream Kitchen admin – DEMO'
    const { createDemoBackend } = await import('./demo/demoBackend')
    setDemoBackend(await createDemoBackend())
  }
  createRoot(document.getElementById('root')).render(
    <BrowserRouter basename={demo ? '/admin/demo' : '/admin'}>
      <I18nProvider initialLang="en">
        <AdminApp />
      </I18nProvider>
    </BrowserRouter>,
  )
}
start()
