// One icon set for the whole site: lucide-react at a single stroke weight, plus
// custom WhatsApp and Instagram glyphs. Icons are decorative: the words beside them
// carry the meaning, so every icon is aria-hidden.
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Clock,
  Copy,
  Egg,
  Gift,
  Hand,
  Heart,
  House,
  Images,
  Info,
  Languages,
  Leaf,
  Mail,
  MapPin,
  Menu,
  MessagesSquare,
  Mic,
  Minus,
  Package,
  PackageSearch,
  Phone,
  PhoneIncoming,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react'

export const ICON_STROKE = 1.75

const make = (Lucide) =>
  function Icon({ className = 'h-6 w-6', ...props }) {
    return <Lucide className={className} strokeWidth={ICON_STROKE} aria-hidden="true" focusable="false" {...props} />
  }

export const PhoneIcon = make(Phone)
export const CartIcon = make(ShoppingBag)
export const MenuIcon = make(Menu)
export const CloseIcon = make(X)
export const PlusIcon = make(Plus)
export const MinusIcon = make(Minus)
export const TrashIcon = make(Trash2)
export const SearchIcon = make(Search)
export const CheckIcon = make(Check)
export const ChevronDownIcon = make(ChevronDown)
export const ClockIcon = make(Clock)
export const MailIcon = make(Mail)
export const PinIcon = make(MapPin)
export const CalendarIcon = make(CalendarClock)
export const ShopIcon = make(Store)
export const ClassesIcon = make(ChefHat)
export const StoryIcon = make(BookOpen)
export const TrackIcon = make(PackageSearch)
export const ContactIcon = make(MessagesSquare)
export const GalleryIcon = make(Images)
export const FaqIcon = make(CircleHelp)
export const HomeIcon = make(House)
export const LanguageIcon = make(Languages)
export const HeartIcon = make(Heart)
export const LeafIcon = make(Leaf)
export const HandIcon = make(Hand)
export const EggIcon = make(Egg)
export const GiftIcon = make(Gift)
export const BoxIcon = make(Package)
export const ChefIcon = make(ChefHat)
export const TruckIcon = make(Truck)
export const ArrowLeftIcon = make(ArrowLeft)
export const AlertIcon = make(CircleAlert)
export const MicIcon = make(Mic)
export const CopyIcon = make(Copy)
export const CallbackIcon = make(PhoneIncoming)
export const DateIcon = make(CalendarDays)
export const InfoIcon = make(Info)
export const WalletIcon = make(Wallet)

// WhatsApp mark, drawn as a clean filled glyph (speech bubble + handset)
export function WhatsAppIcon({ className = 'h-6 w-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  )
}

// Instagram glyph in the same stroke language as lucide
export function InstagramIcon({ className = 'h-6 w-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" />
    </svg>
  )
}
