import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <p style={{ marginBottom: 6 }}>
        <strong style={{ color: 'var(--primary)' }}>Lunexa</strong>
        {' '}&middot; Lung Cancer Prognosis &amp; Risk Assessment
      </p>
      <p style={{ marginTop: 8 }}>
        <Link to="/about">About</Link>
        {' · '}
        <Link to="/symptoms">Symptoms</Link>
        {' · '}
        <Link to="/help">Help</Link>
        {' · '}
        <Link to="/predict">Predict</Link>
      </p>
    </footer>
  )
}
