import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Scan,
  Brain,
  Stethoscope,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react'

const slides = [
  {
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80',
    title: 'Precision imaging meets AI',
    subtitle: 'CT-driven multimodal risk assessment for lung cancer prognosis',
  },
  {
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1400&q=80',
    title: 'From scan to survival insight',
    subtitle: 'Radiomics + deep learning + clinical data in one pipeline',
  },
  {
    url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1400&q=80',
    title: 'Built for research teams',
    subtitle: 'Transparent risk scores with 1- and 2-year survival estimates',
  },
  {
    url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1400&q=80',
    title: 'Lunexa',
    subtitle: 'Lung Cancer Prognosis & Risk Assessment',
  },
]

const features = [
  {
    icon: Scan,
    title: 'CT Deep Features',
    desc: 'MedicalNet ResNet-10 extracts rich 3D embeddings from the full CT volume.',
  },
  {
    icon: Brain,
    title: 'Radiomics Fusion',
    desc: '16 selected PyRadiomics features capture texture, shape and intensity.',
  },
  {
    icon: Stethoscope,
    title: 'Clinical Variables',
    desc: 'Age, TNM stage, histology and gender fused for a true multimodal score.',
  },
  {
    icon: BarChart3,
    title: 'Survival Estimates',
    desc: 'Baseline hazard model yields median survival and 1-/2-year probabilities.',
  },
]

export default function Home() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fade-in">
      {/* Slideshow */}
      <section style={{ marginBottom: 36 }}>
        <div className="slideshow">
          {slides.map((s, i) => (
            <div
              key={i}
              className={`slideshow-slide ${i === idx ? 'active' : ''}`}
              style={{ backgroundImage: `url(${s.url})` }}
            >
              <div className="slideshow-overlay">
                <h1
                  style={{
                    fontSize: 'clamp(22px, 5vw, 36px)',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    marginBottom: 6,
                  }}
                >
                  {s.title}
                </h1>
                <p style={{ fontSize: 15, opacity: 0.95, maxWidth: 480 }}>
                  {s.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="slideshow-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === idx ? 'active' : ''}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Intro */}
      <section style={{ textAlign: 'center', marginBottom: 40 }}>
        <p
          style={{
            display: 'inline-block',
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 14px',
            borderRadius: 999,
            marginBottom: 14,
          }}
        >
          Multimodal Deep Survival Model
        </p>
        <h2
          style={{
            fontSize: 'clamp(24px, 4vw, 34px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            marginBottom: 12,
          }}
        >
          Welcome to <span style={{ color: 'var(--primary)' }}>Lunexa</span>
        </h2>
        <p
          style={{
            maxWidth: 560,
            margin: '0 auto 24px',
            color: 'var(--text-dim)',
            fontSize: 16,
          }}
        >
          Upload a DICOM CT series and RTSTRUCT tumor contour, add clinical
          details, and receive a personalized relative risk score with estimated
          survival curves.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <Link to="/predict" className="btn-primary">
            Start Assessment <ArrowRight size={18} />
          </Link>
          <Link to="/symptoms" className="btn-secondary">
            Symptoms & Guidance
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 28,
            marginTop: 36,
          }}
        >
          {[
            { label: 'Test C-index', value: '0.598' },
            { label: 'Val C-index', value: '0.665' },
            { label: 'Modalities', value: '3' },
            { label: 'Radiomics feats', value: '16' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center', minWidth: 90 }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: 'var(--primary)',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ marginBottom: 40 }}>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 22 }}>
          Why multimodal fusion?
        </h2>
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {features.map((f) => (
            <div key={f.title} className="card">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--primary-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                  color: 'var(--primary)',
                }}
              >
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="card"
        style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--primary-soft), var(--secondary-soft))',
          border: '1px solid rgba(15,118,110,0.2)',
          padding: '36px 24px',
        }}
      >
        <Shield size={32} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Ready to explore a case?
        </h2>
        <p
          style={{
            color: 'var(--text-dim)',
            maxWidth: 420,
            margin: '0 auto 20px',
            fontSize: 15,
          }}
        >
          Select a raw DICOM folder and RTSTRUCT contour, fill clinical fields,
          and get an instant risk assessment.
        </p>
        <Link to="/predict" className="btn-primary">
          <Zap size={18} /> Open Predictor
        </Link>
      </section>
    </div>
  )
}
