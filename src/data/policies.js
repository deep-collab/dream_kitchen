/*
  The four policy pages (/terms, /refund, /shipping, /privacy), in English only: they are legal text,
  and an unchecked Kannada version could say something different. Kannada readers see a note that
  the policy is in English (policy.english in kn.json).

  Every number and contact detail comes from config or Hema's admin settings (policyVars), so the
  pages never disagree with checkout. Business details still to fill in: src/config/site.js (TODO).
  A section's body is a list of paragraphs; an array inside it is a bulleted list.
*/
import { site } from '../config/site.js'
import { formatINR } from '../lib/pricing.js'

/** Values the text needs, from config and Hema's live settings (useShopStatus().settings) */
export function policyVars(settings) {
  const r = settings.courier.rates
  const rate = (tier) => `${formatINR(r[tier].karnataka)} within Karnataka, ${formatINR(r[tier].outside)} elsewhere in India`
  return {
    days: settings.leadTimes.standardBusinessDays,
    reach: `WhatsApp us on ${site.phone.display}${site.email ? ` or email ${site.email}` : ''}`,
    where: site.address ? `, ${site.address}` : '',
    courts: site.jurisdictionCity ? `the courts at ${site.jurisdictionCity}` : 'the competent courts in India',
    transit: site.deliveryTime
      ? `Once dispatched, courier delivery usually takes ${site.deliveryTime}.`
      : 'Once dispatched, the delivery time depends on your location and the courier company.',
    rates: [
      `Brownies, chocolates, Brownie Tubs up to 500 g and 250 g Delight Boxes: ${rate('small')}.`,
      `500 g and 700 g Delight Boxes: ${rate('large')}.`,
      `750 g Brownie Tubs: ${rate('xl')}.`,
    ],
  }
}

export function policyContent(page, v) {
  const name = `${site.name}`
  switch (page) {
    case 'refund':
      return {
        intro: `Everything at ${name} is handmade fresh by ${site.founder} after you order. Please read this policy before you place an order or book a class. By paying for an order or a class, you agree to it.`,
        sections: [
          {
            heading: 'No refunds on handmade products',
            body: ['Because every item is handmade fresh to order, we do not offer refunds once an order has been placed and paid for.'],
          },
          {
            heading: 'Customized orders',
            body: [
              'Customized orders cannot be refunded or cancelled once the order is confirmed. This includes:',
              ['Custom messages or names', 'Drawings and custom designs', 'Any other personalized item'],
            ],
          },
          {
            heading: 'Chocolate classes',
            body: [
              'Class fees are non-refundable.',
              'If you cannot attend, we can shift your class to another available date. Please inform us at least 24 hours before your class starts.',
            ],
          },
          {
            heading: 'Damaged, melted, incorrect or quality issues',
            body: [
              'We do not offer refunds on our other products either, but we will replace an item that arrives:',
              ['Damaged', 'Melted', 'Incorrect (not what you ordered)', 'With a quality issue'],
              'To ask for a replacement, contact us within 24 hours of delivery with your order number (it starts with DK-) and clear photos or a video of the product and its packaging. Requests made after 24 hours cannot be accepted.',
            ],
          },
          {
            heading: 'Cancellations',
            body: ['Orders cannot be cancelled once preparation has started. Customized orders cannot be cancelled once confirmed (see above).'],
          },
          {
            heading: 'If we cancel your order',
            body: [
              `If we ever have to cancel an order you have paid for (for example, if we cannot deliver to your pincode), we will refund the full amount to your original payment method. Refunds made through Razorpay usually reach your account within 5–7 business days.`,
            ],
          },
        ],
      }

    case 'shipping':
      return {
        intro: `${name} sends handmade chocolates, brownies, Brownie Tubs and Delight Boxes all over India by courier, from ${site.founder}’s home kitchen in Karnataka.`,
        sections: [
          {
            heading: 'Where we deliver',
            body: ['We deliver across India by courier. If a courier cannot reach your pincode, we will contact you before dispatch.'],
          },
          {
            heading: 'Preparation and dispatch',
            body: [
              `Every order is made fresh after payment is confirmed. Orders are dispatched after ${v.days} business days (Monday to Saturday; Sundays and holidays are not counted). Orders with a drawing need a few extra days.`,
              'At checkout you choose your dispatch date: the earliest possible date is shown there.',
            ],
          },
          {
            heading: 'Delivery time',
            body: [`${v.transit} Courier delays caused by weather, holidays, strikes or remote locations are outside our control.`],
          },
          {
            heading: 'Courier charges',
            body: [
              'The customer pays the courier charge. It depends on the size of your parcel and where it goes (Karnataka pincodes start with 56–59), and is shown at checkout before you pay. There is one charge per order: the highest rate among your items.',
              v.rates,
            ],
          },
          {
            heading: 'Tracking your order',
            body: [
              'When your order is shipped, we share the courier name and tracking number. You can also see your order’s status any time on the Track Order page, with your order number and mobile number.',
            ],
          },
          {
            heading: 'Perishable products',
            body: [
              'Our products are fresh, handmade food and are perishable. Please:',
              [
                'Give a complete address, pincode and a mobile number that is reachable on the delivery day',
                'Make sure someone can receive the parcel, and open it as soon as it arrives',
                'Keep chocolates and brownies in a cool, dry place away from sunlight, follow any storage instructions we share, and enjoy them soon after delivery',
              ],
              'If a parcel cannot be delivered because of a wrong address or because no one was available, perishable items cannot be sent again or refunded. Any extra courier charge for re-delivery is paid by the customer.',
            ],
          },
          {
            heading: 'Damaged or melted on arrival',
            body: ['Contact us within 24 hours of delivery with your order number and photos or a video, and we will replace the item (see our Refund & Cancellation Policy).'],
          },
        ],
      }

    case 'privacy':
      return {
        intro: `${name}, run by ${site.founder}, respects your privacy. This policy explains what we collect when you use this website, place an order or book a class, and how we use it. We handle your information in line with Indian law, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.`,
        sections: [
          {
            heading: 'What we collect',
            body: [
              [
                'Your name, mobile number and (if you give it) email address',
                'Your delivery address, pincode and state',
                'Your order details: items, notes, the name or drawing description for your box, and any reference photo you upload',
                'Class booking details: class, date and time slot',
                'Messages you send us through the website',
                'Payment details we need to match your payment: the Razorpay payment ID, or the UPI reference number and any screenshot you upload',
              ],
              'We never see or store your card, UPI PIN or bank login details. Online payments are handled by Razorpay, a secure payment gateway, under its own privacy policy.',
            ],
          },
          {
            heading: 'How we use it',
            body: [
              'We use your information only to:',
              [
                'Prepare, pack and deliver your order, and manage your class booking',
                'Contact you about your order, booking or message (by WhatsApp, phone or email)',
                'Show your order’s status on the Track Order page',
                'Keep the records the law requires (for example, for accounts and tax)',
              ],
              'We do not send you marketing messages without your permission.',
            ],
          },
          {
            heading: 'We never sell your data',
            body: [
              'We do not sell, rent or trade your personal information to anyone. We share it only as far as needed to complete your order:',
              [
                'With the courier company: your name, address and mobile number, to deliver the parcel',
                'With Razorpay: to process your payment',
                'With the services that run this website: website hosting (Netlify), our secure database (Supabase) and order emails (Resend)',
                'When the law requires it',
              ],
            ],
          },
          {
            heading: 'Saved on your phone',
            body: [
              'Your cart, your language choice and (only if you tick “Remember my details”) your checkout details are saved in your own browser on your device, not on our servers. You can clear them by clearing your browser’s site data. We do not use advertising or tracking cookies.',
            ],
          },
          {
            heading: 'How we keep it safe',
            body: [
              'Your information is stored in a secure database. Only Dream Kitchen can see your order details, with a password-protected login. We keep order records for as long as needed for your order and for the records the law requires, and then delete them.',
            ],
          },
          {
            heading: 'Your choices',
            body: [`You can ask us to show, correct or delete the personal information we hold about you (except records the law requires us to keep). ${v.reach}.`],
          },
          {
            heading: 'Changes to this policy',
            body: ['If we change this policy, the new version will be posted on this page with a new date.'],
          },
        ],
      }

    case 'terms':
    default:
      return {
        intro: `These terms apply when you use this website, place an order or book a class with ${name}. Please read them carefully: by placing an order or booking a class, you agree to them.`,
        sections: [
          {
            heading: 'About us',
            body: [
              `This website is run by ${name}, a home-based food business owned and run by ${site.founder}${v.where}. “We”, “us” and “our” mean ${name}; “you” means the person using the website, placing an order or booking a class.`,
            ],
          },
          {
            heading: 'Our products',
            body: [
              'Everything is handmade fresh to order in a home kitchen. Photos and drawings on the website are for illustration: handmade items can vary slightly in look, size, colour and decoration.',
              'Our products may contain, or come into contact with, egg, dairy, gluten and nuts. Please read the ingredients and tell us about any allergy before you order. We cannot guarantee that any item is free from allergens.',
            ],
          },
          {
            heading: 'Prices',
            body: [
              'All prices are in Indian Rupees (₹) and are shown on the website. Courier charges are added at checkout and shown before you pay. Prices may change from time to time; the price you pay is the one shown when you place your order.',
            ],
          },
          {
            heading: 'Orders and payment',
            body: [
              'Payments are made online through Razorpay, a secure third-party payment gateway, using the methods it offers (such as UPI, debit or credit cards and net banking), or by UPI where the payment page shows it. Your order is confirmed only after your payment is received, and only then do we start preparing it.',
              'We may decline or cancel an order, for example if an item is unavailable, a courier cannot reach your address, or a price was shown wrongly. If we cancel an order you have paid for, we refund the full amount (see our Refund & Cancellation Policy).',
            ],
          },
          {
            heading: 'Customized orders',
            body: [
              'For names, messages, drawings and other personalized items, you are responsible for the text, description and reference photos you send. They must not be offensive or copy someone else’s work or trademark; we may decline such requests. Handmade drawings are made by hand and can differ slightly from a reference photo.',
            ],
          },
          {
            heading: 'Delivery',
            body: [
              'We deliver across India by courier. Please give a complete and correct address and a reachable mobile number. Dispatch dates, courier charges and delivery details are in our Shipping & Delivery Policy.',
            ],
          },
          {
            heading: 'Refunds, replacements and cancellations',
            body: [
              'Because everything is made fresh to order, we do not offer refunds. Customized orders and class fees are non-refundable; damaged, melted, incorrect or faulty items are replaced. The full rules are in our Refund & Cancellation Policy.',
            ],
          },
          {
            heading: 'Chocolate classes',
            body: [
              'Class fees are paid in advance when you book. Your seat is for the class, date and time slot you booked. If you cannot attend, you can shift to another available date by informing us at least 24 hours before the class. If we ever have to cancel a class, we will offer you another date.',
            ],
          },
          {
            heading: 'Use of this website',
            body: [
              `The name ${name}, the logo, the photos, the drawings and the text on this website belong to ${name}. Please do not copy or use them without our permission. Do not misuse the website, for example by placing fake orders or trying to break its security.`,
            ],
          },
          {
            heading: 'Our responsibility',
            body: [
              'We take great care with every order. To the extent the law allows, our responsibility for any order is limited to replacing the item as described in our Refund & Cancellation Policy, or to the amount you paid for that order. We are not responsible for delays or problems caused by courier companies or by events outside our control.',
            ],
          },
          {
            heading: 'Changes to these terms',
            body: ['We may update these terms from time to time. The version on this page when you place your order or book your class applies to it.'],
          },
          {
            heading: 'Governing law',
            body: [`These terms are governed by the laws of India. Any dispute is subject to the jurisdiction of ${v.courts}.`],
          },
        ],
      }
  }
}
