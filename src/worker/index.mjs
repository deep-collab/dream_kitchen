// Cloudflare Workers entrypoint for Dream Kitchen
// Routes /api/* requests to server handlers and serves static assets / SPA pages with security headers.

import { setWorkerEnv } from '../../netlify/lib/env.mjs'
import { setD1Instance } from '../../netlify/lib/store/index.mjs'
import { json } from '../../netlify/lib/http.mjs'
import { PAGES, RENAMED, REMOVED, legacyProductPath } from '../config/redirects.js'

// Import all API handlers
import adminHandler from '../../netlify/functions/admin.mjs'
import bookingHandler from '../../netlify/functions/booking.mjs'
import classEnquiryHandler from '../../netlify/functions/class-enquiry.mjs'
import classesHandler from '../../netlify/functions/classes.mjs'
import createBookingHandler from '../../netlify/functions/create-booking.mjs'
import createOrderHandler from '../../netlify/functions/create-order.mjs'
import menuHandler from '../../netlify/functions/menu.mjs'
import orderHandler from '../../netlify/functions/order.mjs'
import photoHandler from '../../netlify/functions/photo.mjs'
import razorpayOrderHandler from '../../netlify/functions/razorpay-order.mjs'
import razorpayVerifyHandler from '../../netlify/functions/razorpay-verify.mjs'
import razorpayWebhookHandler from '../../netlify/functions/razorpay-webhook.mjs'
import setupCheckHandler from '../../netlify/functions/setup-check.mjs'
import submitPaymentHandler from '../../netlify/functions/submit-payment.mjs'
import upiQrHandler from '../../netlify/functions/upi-qr.mjs'
import uploadHandler from '../../netlify/functions/upload.mjs'

const API_ROUTES = {
  '/api/admin': adminHandler,
  '/api/booking': bookingHandler,
  '/api/class-enquiry': classEnquiryHandler,
  '/api/classes': classesHandler,
  '/api/create-booking': createBookingHandler,
  '/api/create-order': createOrderHandler,
  '/api/menu': menuHandler,
  '/api/order': orderHandler,
  '/api/razorpay-order': razorpayOrderHandler,
  '/api/razorpay-verify': razorpayVerifyHandler,
  '/api/razorpay-webhook': razorpayWebhookHandler,
  '/api/setup-check': setupCheckHandler,
  '/api/submit-payment': submitPaymentHandler,
  '/api/upi-qr': upiQrHandler,
  '/api/upload': uploadHandler,
}

// Redirects map from src/config/redirects.js
const STATIC_REDIRECTS = new Map(PAGES)

function checkRedirect(pathname) {
  if (STATIC_REDIRECTS.has(pathname)) return STATIC_REDIRECTS.get(pathname)
  if (pathname.startsWith('/classes/booked/')) return '/classes'
  if (pathname.startsWith('/product/')) {
    const slug = pathname.replace('/product/', '').split('/')[0]
    if (RENAMED[slug] || slug in REMOVED) return legacyProductPath(slug)
    return '/menu'
  }
  return null
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
}

const ADMIN_HEADERS = {
  ...SECURITY_HEADERS,
  'x-robots-tag': 'noindex, nofollow',
  'x-frame-options': 'DENY',
  'cache-control': 'no-store',
}

export default {
  async fetch(request, env, ctx) {
    // 1. Initialize environment and D1 instance for this invocation
    setWorkerEnv(env)
    if (env.DB) setD1Instance(env.DB)

    const url = new URL(request.url)
    const pathname = url.pathname

    // 2. Handle /api/* routes
    if (pathname.startsWith('/api/')) {
      const handler = API_ROUTES[pathname]
      const context = {
        env,
        ctx,
        ip: request.headers.get('cf-connecting-ip') || 'unknown',
      }

      if (handler) {
        return handler(request, context)
      }

      // Handle wildcard /api/photo/*
      if (pathname.startsWith('/api/photo/')) {
        return photoHandler(request, context)
      }

      return json(404, { error: 'notFound' })
    }

    // 3. Handle legacy 301 redirects
    const redirectTarget = checkRedirect(pathname)
    if (redirectTarget) {
      return Response.redirect(new URL(redirectTarget, request.url).toString(), 301)
    }

    // 4. Handle assets and frontend SPA serving via env.ASSETS
    if (!env.ASSETS) {
      return new Response('Dream Kitchen Worker Running (no ASSETS binding)', { status: 200 })
    }

    // Admin dashboard routing: rewrite /admin and /admin/* to /admin/index.html
    const isAdminRoute = pathname === '/admin' || pathname === '/admin/' || (pathname.startsWith('/admin/') && !pathname.includes('.'))
    if (isAdminRoute) {
      const adminReq = new Request(new URL('/admin/index.html', request.url), request)
      const res = await env.ASSETS.fetch(adminReq)
      const headers = new Headers(res.headers)
      for (const [k, v] of Object.entries(ADMIN_HEADERS)) headers.set(k, v)
      return new Response(res.body, { status: res.status, headers })
    }

    // Try fetching static asset from dist
    let assetRes = await env.ASSETS.fetch(request)

    if (assetRes.status === 200) {
      const headers = new Headers(assetRes.headers)
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)

      if (pathname.startsWith('/assets/')) {
        headers.set('cache-control', 'public, max-age=31536000, immutable')
      } else if (pathname.startsWith('/products/')) {
        headers.set('cache-control', 'public, max-age=604800')
      }
      return new Response(assetRes.body, { status: assetRes.status, headers })
    }

    // SPA fallback: for any other non-file route, serve /index.html
    const isNavigation = request.method === 'GET' && !pathname.includes('.')
    if (assetRes.status === 404 && isNavigation) {
      const spaReq = new Request(new URL('/index.html', request.url), request)
      const spaRes = await env.ASSETS.fetch(spaReq)
      const headers = new Headers(spaRes.headers)
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
      headers.set('cache-control', 'no-cache')
      return new Response(spaRes.body, { status: 200, headers })
    }

    return assetRes
  },
}
