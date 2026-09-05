import { FolderOpen, Scan, Layers, Cpu, LineChart } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  {
    icon: FolderOpen,
    title: '1. Upload DICOM and RTSTRUCT',
    body: 'Select a raw DICOM series folder and the RTSTRUCT contour file. Enter the ROI name (for example GTV-1) so the tumor mask can be built.',
  },
  {
    icon: Scan,
    title: '2. Deep CT embedding',
    body: 'The volume is windowed in HU, resized to 96 cubed, and passed through MedicalNet ResNet-10. Adaptive pooling yields a 512-dimensional feature vector.',
  },
  {
    icon: Layers,
    title: '3. Radiomics extraction',
    body: 'PyRadiomics computes features on the RTSTRUCT mask. Sixteen pre-selected features are scaled with the training scaler.',
  },
  {
    icon: Cpu,
    title: '4. Clinical encoding',
    body: 'Age, T/N/M, overall stage, histology (one-hot) and gender form the clinical vector and are scaled.',
  },
  {
    icon: LineChart,
    title: '5. Fusion and survival',
    body: 'Three neural branches fuse into a risk head. The risk score plus a baseline hazard give median survival and 1-year and 2-year probabilities.',
  },
]

export default function HowItWorks() {
  return (
    <div className="fade-in page-full">
      <header style={{ marginBottom: 28, maxWidth: 720 }}>
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 10,
          }}
        >
          How Lunexa works
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>
          From DICOM series to a risk score in five clear steps. Need term definitions? See{' '}
          <Link to="/help" style={{ color: 'var(--secondary)', fontWeight: 600 }}>
            Help
          </Link>
          .
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: '1fr',
        }}
      >
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="card"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 18,
              alignItems: 'start',
              padding: 22,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'var(--primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <s.icon size={24} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--primary)',
                  marginBottom: 4,
                  letterSpacing: '0.04em',
                }}
              >
                STEP {i + 1}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h2>
              <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.7 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          marginTop: 28,
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          background: 'var(--entry-bg)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Tech stack</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            React + Vite · FastAPI · SimpleITK · MONAI · PyRadiomics · PyTorch fusion model
          </p>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Next step</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10 }}>
            Try a case with your DICOM folder and RTSTRUCT.
          </p>
          <Link to="/predict" className="btn-primary" style={{ display: 'inline-flex' }}>
            Open Predictor
          </Link>
        </div>
      </div>
    </div>
  )
}
