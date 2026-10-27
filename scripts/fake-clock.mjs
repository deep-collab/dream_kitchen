// QA only: start the local dev server as if it were another day, e.g. the first minute of
// Kannada Rajyotsava (1 Nov, Indian time), so the server prices orders for that day:
//   DK_FAKE_NOW=2026-10-31T18:31:00Z node --import ./scripts/fake-clock.mjs node_modules/vite/bin/vite.js --port 5173
// The clock then runs on normally from that moment. Never used by the site itself (it is only
// loaded with --import, by hand); scripts/qa-rajyotsava-november.mjs explains the full command.
const target = Date.parse(process.env.DK_FAKE_NOW || '')
if (Number.isFinite(target)) {
  const RealDate = Date
  const offset = target - RealDate.now()
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + offset)
      else super(...args)
    }
    static now() {
      return RealDate.now() + offset
    }
  }
  globalThis.Date = FakeDate
  console.log(`[fake-clock] the server's clock reads ${new FakeDate().toISOString()}`)
}
