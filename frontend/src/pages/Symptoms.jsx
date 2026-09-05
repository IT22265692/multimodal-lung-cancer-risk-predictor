import { AlertCircle, Heart, Cigarette, Wind, Activity, Stethoscope } from 'lucide-react'

/**
 * Place your own photos in frontend/public/symptoms/ with these names to override:
 * cough.jpg, breath.jpg, chest.jpg, throat.jpg, weight.jpg, infection.jpg
 * The images you shared (cough, breathlessness, chest pain, throat, baggy jeans, illness)
 * map to those six files in order.
 */
const symptoms = [
  {
    icon: Wind,
    title: 'Persistent cough',
    desc: 'A cough that does not go away or gets worse over weeks. May produce blood-tinged sputum.',
    img: '/symptoms/cough.jpg',
    fallback:
      'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&q=80',
  },
  {
    icon: Activity,
    title: 'Shortness of breath',
    desc: 'Feeling breathless during routine activities or at rest can signal airway or lung involvement.',
    img: '/symptoms/breath.jpg',
    fallback:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
  },
  {
    icon: AlertCircle,
    title: 'Chest pain',
    desc: 'Pain that worsens with deep breathing, coughing, or laughing. Often related to the chest wall or pleura.',
    img: '/symptoms/chest.jpg',
    fallback:
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
  },
  {
    icon: Cigarette,
    title: 'Hoarseness and wheezing',
    desc: 'Voice changes or new wheezing may occur if a tumor affects the larynx or large airways.',
    img: '/symptoms/throat.jpg',
    fallback:
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80',
  },
  {
    icon: Heart,
    title: 'Unexplained weight loss',
    desc: 'Losing weight without trying, fatigue, and loss of appetite are common systemic signs.',
    img: '/symptoms/weight.jpg',
    fallback:
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  },
  {
    icon: Stethoscope,
    title: 'Recurrent infections',
    desc: 'Repeated bronchitis or pneumonia in the same area of the lung can be a warning sign.',
    img: '/symptoms/infection.jpg',
    fallback:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
  },
]

const tips = [
  'Quit smoking and avoid second-hand smoke. This is the single most effective prevention step.',
  'Seek care early if you have a lasting cough, chest pain, or coughing up blood.',
  'Discuss low-dose CT screening with your doctor if you are a long-term smoker (or former smoker) aged 50+.',
  'Stay active, eat a balanced diet, and attend regular health check-ups.',
  'Know your family history and occupational exposures (asbestos, radon, diesel).',
]

const ytVideos = [
  { id: 'hKV0f_h-f6w', title: 'Understand lung cancer' },
  { id: 'GwVz0HyMyds', title: 'Warning signs to discuss with a doctor' },
  { id: 'gIbmqYEf2ag', title: 'Symptoms explained for lung cancer' },
  { id: 'XIemxRJRuuQ', title: 'Living with lung cancer guidance' },
]

function SymptomCard({ s }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <img
        src={s.img}
        alt={s.title}
        style={{ width: '100%', height: 168, objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          if (e.currentTarget.src !== s.fallback) {
            e.currentTarget.src = s.fallback
          }
        }}
      />
      <div style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            color: 'var(--primary)',
          }}
        >
          <s.icon size={20} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</h3>
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.65 }}>{s.desc}</p>
      </div>
    </div>
  )
}

export default function Symptoms() {
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
          Symptoms and Guidance
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>
          Early recognition matters. This page is educational only. It is not a diagnosis. See a
          qualified clinician for personal advice.
        </p>
      </header>

      <h2 className="section-title">Common symptoms</h2>
      <div className="symptom-grid" style={{ marginBottom: 40 }}>
        {symptoms.map((s) => (
          <SymptomCard key={s.title} s={s} />
        ))}
      </div>

      <h2 className="section-title">How to reduce risk and seek help</h2>
      <div className="card" style={{ marginBottom: 40 }}>
        <ol
          style={{
            paddingLeft: 22,
            fontSize: 15,
            color: 'var(--text-dim)',
            lineHeight: 1.95,
          }}
        >
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      </div>

      <h2 className="section-title">Educational videos</h2>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
        Public educational videos. Content belongs to the original creators.
      </p>
      <div className="video-grid" style={{ marginBottom: 28 }}>
        {ytVideos.map((v) => (
          <div key={v.id}>
            <div className="video-frame">
              <iframe
                src={`https://www.youtube.com/embed/${v.id}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p style={{ fontSize: 15, marginTop: 10, fontWeight: 600 }}>{v.title}</p>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          borderColor: 'rgba(220,38,38,0.3)',
          background: 'rgba(220,38,38,0.06)',
        }}
      >
        <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--danger)' }}>Emergency:</strong> Seek urgent care for
          sudden severe shortness of breath, coughing up large amounts of blood, chest pain with
          dizziness, or confusion. This site cannot provide emergency care.
        </p>
      </div>
    </div>
  )
}
