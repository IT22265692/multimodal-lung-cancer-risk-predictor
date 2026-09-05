import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

function LungLogo({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v16" />
      <path d="M12 6c-1.5-1.5-4-2-6-1-2.5 1.2-3.5 4-3 7.5 0.4 2.8 2 5 4 6.5 0.8 0.6 1.8 0.2 2.2-0.6L12 12" />
      <path d="M12 6c1.5-1.5 4-2 6-1 2.5 1.2 3.5 4 3 7.5-0.4 2.8-2 5-4 6.5-0.8 0.6-1.8 0.2-2.2-0.6L12 12" />
    </svg>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const links = [
    { to: '/', label: 'Home' },
    { to: '/predict', label: 'Predict' },
    { to: '/symptoms', label: 'Symptoms' },
    { to: '/help', label: 'Help' },
    { to: '/how-it-works', label: 'How it Works' },
    { to: '/about', label: 'About' },
  ]

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand" onClick={close}>
        <span className="logo-mark" title="Lunexa">
          <LungLogo size={22} />
        </span>
        <span className="brand-text">
          <span className="brand-name">Lunexa</span>
          <span className="brand-tag">Lung Cancer Prognosis</span>
        </span>
      </Link>

      <div className="nav-links">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      <Link to="/predict" className="nav-cta">
        Start Assessment
      </Link>

      <button
        className="menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={close}
          >
            {l.label}
          </NavLink>
        ))}
        <Link to="/predict" className="nav-cta" onClick={close}>
          Start Assessment
        </Link>
      </div>
    </nav>
  )
}
