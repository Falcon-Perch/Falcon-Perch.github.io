import { NavLink } from 'react-router-dom';
import { Bookmark, Map, ScrollText, SlidersHorizontal } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Map', Icon: Map },
  { to: '/places', label: 'Places', Icon: Bookmark },
  { to: '/log', label: 'Log', Icon: ScrollText },
  { to: '/settings', label: 'Settings', Icon: SlidersHorizontal },
];

export default function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="z-[1000] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm ${
                  isActive ? 'font-bold text-ink' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-0.5 ${isActive ? 'bg-cere text-falcon' : ''}`}>
                    <Icon size={20} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
