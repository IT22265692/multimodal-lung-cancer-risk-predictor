import { Link } from 'react-router-dom'
import {
  BookOpen,
  Users,
  Shield,
  Scan,
  Brain,
  Stethoscope,
  ArrowRight,
  BarChart3,
} from 'lucide-react'

const pillars = [
  {
    icon: Scan,
    title: 'CT imaging',
    text: 'Deep features from the full DICOM volume using MedicalNet ResNet-10.',
  },
  {
    icon: Brain,
    title: 'Radiomics',
    text: 'Sixteen selected texture and shape features from the RTSTRUCT tumor mask.',
  },
  {
    icon: Stethoscope,
    title: 'Clinical data',
    text: 'Age, TNM, overall stage, histology and gender fused with imaging signals.',
  },
]

export default function About() {
  return (
    <div className="fade-in page-full">
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #0d9488 45%, #2563EB 100%)',
          borderRadius: 20,
          color: '#fff',
          padding: '40px 28px',
          marginBottom: 24,
          textAlign: 'center',
        }}
      >
        
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, marginBottom: 10 }}>
          About Lunexa
        </h1>
        <p style={{ fontSize: 17, opacity: 0.95, maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
          Lung Cancer Prognosis and Risk Assessment. A multimodal research tool that combines CT,
          radiomics and clinical data to estimate relative survival risk.
        </p>
      </section>

      {/* Stat strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Validation C-index', value: '0.665' },
          { label: 'Test C-index', value: '0.598' },
          { label: 'Imaging + clinical', value: '3 modalities' },
          { label: 'Radiomics features', value: '16' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* What it does */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>What Lunexa does</h2>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.75 }}>
              You upload a raw CT DICOM series and an RTSTRUCT tumor contour, then enter clinical
              fields. A fusion network produces a relative risk score plus 1-year and 2-year
              survival estimates when the baseline hazard allows.
            </p>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.75, marginTop: 12 }}>
              The tool is for research and education. It is not a certified medical device and
              does not replace advice from a clinician.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars full width */}
      <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 16 }}>
        Three inputs, one risk score
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {pillars.map((p) => (
          <div key={p.title} className="card" style={{ padding: 22 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <p.icon size={24} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
            <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.65 }}>{p.text}</p>
          </div>
        ))}
      </div>

      {/* Performance */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <BarChart3 size={22} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Performance</h2>
            <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              Validation C-index about <strong style={{ color: 'var(--text)' }}>0.665</strong>.
              Held-out test C-index about <strong style={{ color: 'var(--text)' }}>0.598</strong>.
              C-index measures ranking ability for survival times (0.5 is random).
            </p>
          </div>
        </div>
      </section>

      {/* Team placeholder style inspired by sample - Group 7 */}
      <section
        className="card"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(180deg, rgba(15,118,110,0.06), #fff)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Users size={28} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Project team</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Group 7 · Multimodal Cancer Prognosis</p>
        </div>
        <p
          style={{
            textAlign: 'center',
            fontSize: 15,
            color: 'var(--text-dim)',
            maxWidth: 520,
            margin: '0 auto',
            lineHeight: 1.7,
          }}
        >
          Built as a research prototype combining imaging AI and clinical variables for lung
          cancer survival risk estimation. For terms and definitions used in the form, open the{' '}
          <Link to="/help" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
            Help
          </Link>{' '}
          page.
        </p>
      </section>

      <section
        className="card"
        style={{
          borderColor: 'rgba(220,38,38,0.3)',
          background: 'rgba(220,38,38,0.05)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Shield size={22} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Important disclaimer</h2>
            <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              Lunexa is a research prototype only. It is not a certified medical device and must
              not be used alone for clinical decisions. Always rely on qualified professionals and
              standard care guidelines.
            </p>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', paddingBottom: 12 }}>
        <Link to="/predict" className="btn-primary">
          Start Assessment <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  )
}
