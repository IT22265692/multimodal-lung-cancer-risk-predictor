import { useState } from 'react'
import { ChevronDown, FolderOpen, Target, Stethoscope, Scan, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="faq-item" style={{ marginBottom: 12 }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <Icon size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
          {title}
        </span>
        <ChevronDown
          size={20}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            color: 'var(--primary)',
          }}
        />
      </button>
      {open && <div className="faq-body">{children}</div>}
    </div>
  )
}

function QA({ q, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{q}</h3>
      <div style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

export default function Help() {
  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 999,
            marginBottom: 12,
          }}
        >
          <HelpCircle size={14} /> Help centre
        </p>
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 10,
          }}
        >
          Understanding inputs and results
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 16, maxWidth: 640 }}>
          Plain-language guides for DICOM, RTSTRUCT, staging, histology, and what Lunexa predicts.
          Open any section below.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          marginBottom: 28,
        }}
      >
        {[
          { href: '#dicom', label: 'CT and DICOM', icon: Scan },
          { href: '#tumor', label: 'Tumor and RTSTRUCT', icon: Target },
          { href: '#clinical', label: 'Clinical stages', icon: Stethoscope },
          { href: '#predict', label: 'Prediction meaning', icon: FolderOpen },
        ].map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="card"
            style={{
              padding: 14,
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--primary)',
            }}
          >
            <c.icon size={22} style={{ margin: '0 auto 6px', display: 'block' }} />
            {c.label}
          </a>
        ))}
      </div>

      <section id="dicom" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ color: 'var(--secondary)' }}>
          CT scan and DICOM
        </h2>

        <Section title="What is a CT scan?" icon={Scan} defaultOpen>
          <QA q="What is a CT scan?">
            <p>
              A CT (Computed Tomography) scan uses X-rays to create detailed cross-sectional
              images of the body. Lunexa uses the CT volume as the imaging input for the risk
              model.
            </p>
          </QA>
        </Section>

        <Section title="What is a DICOM file?" icon={FolderOpen}>
          <p>
            DICOM (Digital Imaging and Communications in Medicine) is the standard format used
            to store medical images such as CT scans.
          </p>
          <p style={{ marginTop: 10 }}>
            For this application, the <strong>raw DICOM folder</strong> contains the CT scan as
            multiple DICOM files. Each file is usually one CT slice.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> DICOM is the standard format used to store the
            patient CT images.
          </p>
        </Section>

        <Section title="What is a DICOM series?">
          <p>
            A CT scan is rarely one single image. It is many 2D slices that together form a 3D
            volume. A <strong>DICOM series</strong> is the set of DICOM files that belong to the
            same CT scan.
          </p>
          <p style={{ marginTop: 10 }}>
            That is why Lunexa asks you to select the <strong>entire DICOM series folder</strong>,
            not only one .dcm file.
          </p>
        </Section>

        <Section title="Why do I need the entire DICOM folder?">
          <p>
            A CT scan contains many 2D slices. The application combines those slices into the 3D
            CT volume needed for deep features and radiomics.
          </p>
        </Section>

        <Section title="What is HU (Hounsfield Unit)?">
          <p>
            HU is a numerical scale for tissue density on CT. Air has very low HU values; bone
            has high values. Lunexa windows and scales HU values before the model sees the
            images.
          </p>
        </Section>
      </section>

      <section id="tumor" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ color: 'var(--secondary)' }}>
          Tumor segmentation
        </h2>

        <Section title="What is RTSTRUCT?" icon={Target} defaultOpen>
          <p>
            RTSTRUCT (Radiotherapy Structure Set) is a DICOM file that stores structures outlined
            by a clinician, often during radiotherapy planning.
          </p>
          <p style={{ marginTop: 10 }}>
            In Lunexa, the RTSTRUCT holds the <strong>tumor contour</strong> used to locate the
            tumor on the CT.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> RTSTRUCT tells the system where the tumor is.
          </p>
        </Section>

        <Section title="What is a contour?">
          <p>
            A contour is an outline drawn around a structure (such as a tumor) on CT slices.
            Outlines on many slices can form a 3D tumor mask.
          </p>
          <p style={{ marginTop: 10 }}>
            Flow: CT slices → tumor contours → 3D tumor mask.
          </p>
        </Section>

        <Section title="What is GTV-1?">
          <p>
            GTV means Gross Tumor Volume. <strong>GTV-1</strong> is the tumor label used in this
            dataset RTSTRUCT. Lunexa uses that name by default to extract the tumor region. You
            can change the ROI name if your RTSTRUCT uses a different label.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> GTV-1 is the labeled tumor region used for extraction.
          </p>
        </Section>

        <Section title="What is ROI?">
          <p>
            ROI means Region of Interest. Here it is the selected tumor structure (for example
            GTV-1).
          </p>
        </Section>

        <Section title="What is a tumor mask?">
          <p>
            A tumor mask is a 3D binary volume: typically <code>1 = tumor</code> and{' '}
            <code>0 = background</code>. It lets radiomics and analysis focus on the tumor, not
            the whole chest.
          </p>
        </Section>

        <Section title="Why both CT and RTSTRUCT?">
          <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>
              <strong>CT DICOM</strong> provides the medical images.
            </li>
            <li>
              <strong>RTSTRUCT</strong> provides the tumor contour.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Together they define the tumor region inside the CT volume.
          </p>
        </Section>
      </section>

      <section id="clinical" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ color: 'var(--secondary)' }}>
          Clinical information
        </h2>

        <Section title="What is T-stage?" icon={Stethoscope} defaultOpen>
          <p>
            T-stage describes the size and local extent of the primary tumor (for example T1 to
            T4). Higher T values usually mean a larger or more locally advanced primary tumor.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> T is about the main tumor size and local spread.
          </p>
        </Section>

        <Section title="What is N-stage?">
          <p>
            N-stage describes regional lymph-node involvement (for example N0 to N3). N0 means no
            regional node involvement; higher N values mean more extensive nodal spread.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> N is about nearby lymph nodes.
          </p>
        </Section>

        <Section title="What is M-stage?">
          <p>
            M-stage describes distant metastasis: M0 means none identified; M1 means distant
            spread is present.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>Simple idea:</strong> M is about spread to distant organs or tissues.
          </p>
        </Section>

        <Section title="What is Overall Stage?">
          <p>
            Overall stage summarizes disease extent from T, N, and M. Lunexa uses categories
            available in the training data:
          </p>
          <ul style={{ paddingLeft: 18, marginTop: 8, lineHeight: 1.8 }}>
            <li>
              <strong>Stage I</strong> - earlier, more localized disease
            </li>
            <li>
              <strong>Stage II</strong> - more locally advanced than Stage I
            </li>
            <li>
              <strong>Stage IIIa</strong> - advanced regional disease
            </li>
            <li>
              <strong>Stage IIIb</strong> - more advanced regional disease than IIIa
            </li>
          </ul>
          <p style={{ marginTop: 10 }}>
            Flow: T → N → M → Overall Stage.
          </p>
        </Section>

        <Section title="What is Histology?">
          <p>
            Histology is the cancer type based on how cells look under a microscope. Options in
            Lunexa include:
          </p>
          <ul style={{ paddingLeft: 18, marginTop: 8, lineHeight: 1.85 }}>
            <li>
              <strong>Adenocarcinoma</strong> - often from glandular cells (common NSCLC type)
            </li>
            <li>
              <strong>Squamous cell carcinoma</strong> - from squamous cells lining airways
            </li>
            <li>
              <strong>Large cell</strong> - NSCLC with large-appearing cells without clear adeno
              or squamous features
            </li>
            <li>
              <strong>NOS</strong> - Not Otherwise Specified; not classified more specifically
            </li>
          </ul>
        </Section>
      </section>

      <section id="predict" style={{ marginBottom: 24 }}>
        <h2 className="section-title" style={{ color: 'var(--secondary)' }}>
          What the prediction means
        </h2>
        <div className="card">
          <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.75 }}>
            Lunexa combines <strong>CT imaging</strong>, <strong>radiomics</strong>, and{' '}
            <strong>clinical information</strong> to estimate relative lung cancer survival risk.
            You see a risk score, optional median survival, and 1-year and 2-year survival
            probabilities.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.75, marginTop: 12 }}>
            Results are model-based estimates for research and education. They are not a medical
            diagnosis and do not replace clinical judgment.
          </p>
          <p style={{ marginTop: 16 }}>
            <Link to="/predict" className="btn-primary" style={{ display: 'inline-flex' }}>
              Go to Predict
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
