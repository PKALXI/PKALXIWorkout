import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Plans', icon: '🏋️' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/history', label: 'History', icon: '🗓️' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  // The guided workout screen owns the whole viewport — its own footer buttons
  // replace the tab bar so nothing competes for thumb space.
  if (pathname.startsWith('/workout/')) return null

  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">
          <span className="tab-icon" aria-hidden>
            {t.icon}
          </span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
