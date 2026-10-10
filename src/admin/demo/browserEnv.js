// What the browser build uses in place of netlify/lib/env.mjs (vite.config.js, build only): the
// demo admin runs the server's admin rules in the browser, but the browser has no environment
// variables and must never carry the names of the server's secret settings.
export const backendMode = () => 'demo'

export const config = {
  supabaseUrl: '',
  serviceKey: '',
  anonKey: '',
  get siteUrl() {
    return typeof window !== 'undefined' ? window.location.origin : ''
  },
  hemaEmail: '',
  resendKey: '',
  emailFrom: '',
  upiId: '',
  razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
  devAdmin: { email: '', password: '' },
  devDataDir: '',
}
