import {ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Link2, List, Menu, Navigation, Pause, Phone, Play, Plus, ShoppingBag, User, X} from 'lucide-react';

const icons = {
  phone: Phone,
  map: Navigation,
  external: ExternalLink,
  bag: ShoppingBag,
  check: Check,
  plus: Plus,
  play: Play,
  pause: Pause,
  down: ChevronDown,
  up: ChevronUp,
  left: ChevronLeft,
  right: ChevronRight,
  menu: Menu,
  close: X,
  list: List,
  link: Link2,
  user: User,
  send: ArrowUp,
};

export function Icon({name, size = 18, filled = false}: {name: keyof typeof icons; size?: number; filled?: boolean}) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={2} fill={filled ? 'currentColor' : 'none'} aria-hidden="true" focusable="false"/>;
}
