import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2, FolderOpen, FileImage, Info } from 'lucide-react'

const API = '/api'

export default function Predict() {
  const [config, setConfig] = useState(null)
  const [dicomFiles, setDicomFiles] = useState([])
  const [rtstructFile, setRtstructFile] = useState(null)
  const [roiName, setRoiName] = useState('GTV-1')
  const [age, setAge] = useState('')
  const [tStage, setTStage] = useState('')
  const [nStage, setNStage] = useState('')
  const [mStage, setMStage] = useState('')
  const [overallStage, setOverallStage] = useState('')
  const [histology, setHistology] = useState('')
  const [gender, setGender] = useState('male')
  const [status, setStatus] = useState('')
  const [statusError, setStatusError] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingPredict, setLoadingPredict] = useState(false)
  const [previews, setPreviews] = useState(null)
  const [result, setResult] = useState(null)

  const dicomInputRef = useRef()
  const rtInputRef = useRef()

  useEffect(() => {
    fetch(`${API}/config`)
      .then((r) => r.json())
      .then((data) => {
        setConfig(data)
        if (data.stage_options?.length) setOverallStage(data.stage_options[0])
        if (data.histology_options?.length)
          setHistology(data.histology_options[0])
      })
      .catch(() => {
        setConfig({
          test_cindex: 0.5983,
          stage_options: ['I', 'II', 'IIIa', 'IIIb'],
          histology_options: [
            'adenocarcinoma',
            'large cell',
            'nos',
            'squamous cell carcinoma',
          ],
        })
        setOverallStage('I')
        setHistology('adenocarcinoma')
      })
  }, [])

  const onDicomChange = (e) => {
    const files = Array.from(e.target.files || [])
    setDicomFiles(files)
  }

  const onDicomDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    // Folder drop is limited; prefer file input with webkitdirectory
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) setDicomFiles(files)
  }

  const buildForm = () => {
    const form = new FormData()
    dicomFiles.forEach((f) => form.append('dicom_files', f))
    if (rtstructFile) form.append('rtstruct_file', rtstructFile)
    form.append('roi_name', roiName)
    form.append('age', age)
    form.append('t_stage', tStage)
    form.append('n_stage', nStage)
    form.append('m_stage', mStage)
    form.append('overall_stage', overallStage)
    form.append('histology', histology)
    form.append('gender', gender)
    return form
  }

  const loadPreview = async () => {
    if (!dicomFiles.length || !rtstructFile) {
      setStatus('Please select a DICOM folder and an RTSTRUCT file.')
      setStatusError(true)
      return
    }
    setLoadingPreview(true)
    setStatus('Loading preview images…')
    setStatusError(false)
    setPreviews(null)

    try {
      const form = new FormData()
      dicomFiles.forEach((f) => form.append('dicom_files', f))
      form.append('rtstruct_file', rtstructFile)
      form.append('roi_name', roiName)

      const res = await fetch(`${API}/preview`, { method: 'POST', body: form })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Preview failed')
      setPreviews(data.images)
      setStatus('')
    } catch (err) {
      setStatus('Error loading preview: ' + err.message)
      setStatusError(true)
    } finally {
      setLoadingPreview(false)
    }
  }

  const runPredict = async () => {
    if (!dicomFiles.length || !rtstructFile) {
      setStatus('Please select a DICOM folder and an RTSTRUCT file.')
      setStatusError(true)
      return
    }
    if (!age || tStage === '' || nStage === '' || mStage === '') {
      setStatus('Please fill in age and T/N/M stages.')
      setStatusError(true)
      return
    }

    setLoadingPredict(true)
    setStatus('Extracting features and predicting… this may take a moment.')
    setStatusError(false)
    setResult(null)

    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        body: buildForm(),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Prediction failed')
      setResult(data.result)
      setStatus('')
    } catch (err) {
      setStatus('Error: ' + err.message)
      setStatusError(true)
    } finally {
      setLoadingPredict(false)
    }
  }

  const riskFraction = result ? 1 / (1 + Math.exp(-result.risk_score)) : 0
  const riskLevel =
    riskFraction < 0.4 ? 'low' : riskFraction < 0.65 ? 'moderate' : 'high'
  const riskColor =
    riskLevel === 'low'
      ? 'var(--success)'
      : riskLevel === 'moderate'
        ? 'var(--warning)'
        : 'var(--danger)'
  const riskLabel =
    riskLevel === 'low'
      ? 'Lower relative risk'
      : riskLevel === 'moderate'
        ? 'Moderate relative risk'
        : 'Higher relative risk'

  return (
    <div className="fade-in">
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 'clamp(22px, 5vw, 28px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            marginBottom: 6,
          }}
        >
          Risk Prediction
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
          Lunexa multimodal fusion
          {config && (
            <>
              {' '}
              · Test C-index:{' '}
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {config.test_cindex.toFixed(4)}
              </span>
            </>
          )}
        </p>
      </header>

      <div
        style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr' }}
        className="predict-layout"
      >
        {/* Form */}
        <section className="card">
          <h2 className="section-title" style={{ color: 'var(--secondary)' }}>
            CT Scan: Raw DICOM Folder
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              marginBottom: 10,
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
            }}
          >
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            Select the entire DICOM series folder (multiple .dcm files). Use the
            folder picker below.
          </p>
          <div
            className={`upload-zone ${dicomFiles.length ? 'has-file' : ''}`}
            onClick={() => dicomInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('drag-over')
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
            onDrop={onDicomDrop}
          >
            <FolderOpen
              className="icon"
              size={30}
              style={{ margin: '0 auto 8px' }}
            />
            <p>Click to select DICOM folder (or drop .dcm files)</p>
            {dicomFiles.length > 0 && (
              <p className="filename">
                {dicomFiles.length} file{dicomFiles.length > 1 ? 's' : ''} selected
                {dicomFiles[0]?.webkitRelativePath
                  ? ` · ${dicomFiles[0].webkitRelativePath.split('/')[0]}`
                  : ''}
              </p>
            )}
            <input
              ref={dicomInputRef}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              directory=""
              accept=".dcm,.dicom,application/dicom"
              hidden
              onChange={onDicomChange}
            />
          </div>

          <h2
            className="section-title"
            style={{ marginTop: 8, color: 'var(--secondary)' }}
          >
            Tumor Mask: RTSTRUCT Contour
          </h2>
          <div
            className={`upload-zone ${rtstructFile ? 'has-file' : ''}`}
            onClick={() => rtInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('drag-over')
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('drag-over')
              const f = e.dataTransfer.files?.[0]
              if (f) setRtstructFile(f)
            }}
          >
            <FileImage
              className="icon"
              size={30}
              style={{ margin: '0 auto 8px' }}
            />
            <p>Drop RTSTRUCT DICOM (.dcm) or click to browse</p>
            {rtstructFile && (
              <p className="filename">{rtstructFile.name}</p>
            )}
            <input
              ref={rtInputRef}
              type="file"
              accept=".dcm,.dicom,application/dicom"
              hidden
              onChange={(e) => setRtstructFile(e.target.files?.[0] || null)}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="field-label">ROI name (RTSTRUCT)</label>
            <input
              className="input"
              value={roiName}
              onChange={(e) => setRoiName(e.target.value)}
              style={{ maxWidth: 180 }}
              placeholder="GTV-1"
            />
          </div>

          <button
            className="btn-load"
            onClick={loadPreview}
            disabled={loadingPreview || !dicomFiles.length || !rtstructFile}
          >
            {loadingPreview ? (
              <>
                <Loader2 size={18} className="pulse" /> Loading images…
              </>
            ) : (
              <>
                <Upload size={18} /> Load Preview Images
              </>
            )}
          </button>

          {previews && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                { key: 'full', label: 'Full CT slice' },
                { key: 'overlay', label: 'Tumor contour' },
                { key: 'cropped', label: 'Cropped region' },
              ].map((p) => (
                <div
                  key={p.key}
                  style={{
                    background: 'var(--entry-bg)',
                    borderRadius: 10,
                    padding: 8,
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={`data:image/png;base64,${previews[p.key]}`}
                    alt={p.label}
                    style={{ borderRadius: 6, width: '100%' }}
                  />
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginTop: 6,
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <h2 className="section-title">Clinical Details</h2>
          <div className="grid-3" style={{ marginBottom: 8 }}>
            <div>
              <label className="field-label">Age</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 65"
              />
            </div>
            <div>
              <label className="field-label">T-Stage</label>
              <input
                className="input"
                type="number"
                value={tStage}
                onChange={(e) => setTStage(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">N-Stage</label>
              <input
                className="input"
                type="number"
                value={nStage}
                onChange={(e) => setNStage(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">M-Stage</label>
              <input
                className="input"
                type="number"
                value={mStage}
                onChange={(e) => setMStage(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Overall Stage</label>
              <select
                className="select"
                value={overallStage}
                onChange={(e) => setOverallStage(e.target.value)}
              >
                {(config?.stage_options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Histology</label>
              <select
                className="select"
                value={histology}
                onChange={(e) => setHistology(e.target.value)}
              >
                {(config?.histology_options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Gender</label>
              <select
                className="select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">male</option>
                <option value="female">female</option>
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={runPredict}
            disabled={loadingPredict}
            style={{ width: '100%', marginTop: 18 }}
          >
            {loadingPredict ? (
              <>
                <Loader2 size={18} className="pulse" /> Predicting…
              </>
            ) : (
              'Predict Risk Score'
            )}
          </button>

          <div className={`status ${statusError ? 'error' : ''}`}>{status}</div>
        </section>

        {/* Results + detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <h2 className="section-title">Prediction Result</h2>

            {!result && (
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                Select DICOM folder + RTSTRUCT, fill clinical data, then click
                Predict to see the risk score and survival estimates.
              </p>
            )}

            {result && (
              <div className="fade-in">
                <div className="gauge-wrap">
                  <div className="gauge-labels">
                    <span>Low risk</span>
                    <span>High risk</span>
                  </div>
                  <div className="gauge-track">
                    <div
                      className="gauge-fill"
                      style={{
                        width: `${(riskFraction * 100).toFixed(1)}%`,
                        background: riskColor,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background:
                      riskLevel === 'low'
                        ? 'rgba(22,163,74,0.12)'
                        : riskLevel === 'moderate'
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(220,38,38,0.12)',
                    color: riskColor,
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {riskLabel}
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.7,
                    color: 'var(--text)',
                    marginBottom: 18,
                  }}
                >
                  Risk score:{' '}
                  <span style={{ color: riskColor }}>
                    {result.risk_score.toFixed(4)}
                  </span>
                  <br />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-dim)' }}>
                    Estimated median survival:{' '}
                    {result.median_survival_days != null
                      ? `${result.median_survival_days.toFixed(0)} days (~${(
                          result.median_survival_days / 30.4
                        ).toFixed(1)} months)`
                      : 'beyond available follow-up (favorable)'}
                  </span>
                </div>

                <div>
                  <div className="bar-group">
                    <div className="bar-label">1-Year Survival Probability</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(result.prob_1yr * 100).toFixed(1)}%`,
                        }}
                      />
                    </div>
                    <div className="bar-value">
                      {(result.prob_1yr * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bar-group">
                    <div className="bar-label">2-Year Survival Probability</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(result.prob_2yr * 100).toFixed(1)}%`,
                        }}
                      />
                    </div>
                    <div className="bar-value">
                      {(result.prob_2yr * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Detailed breakdown - fills empty space */}
          <section className="card">
            <h2 className="section-title">Detailed Breakdown</h2>
            {result ? (
              <div className="fade-in">
                <div className="detail-row">
                  <span className="label">Risk score (raw)</span>
                  <span className="value">{result.risk_score.toFixed(4)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Risk band</span>
                  <span className="value" style={{ color: riskColor }}>
                    {riskLabel}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Sigmoid risk fraction</span>
                  <span className="value">
                    {(riskFraction * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Median survival</span>
                  <span className="value">
                    {result.median_survival_days != null
                      ? `${result.median_survival_days.toFixed(0)} days`
                      : 'Not reached'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">~ Months</span>
                  <span className="value">
                    {result.median_survival_days != null
                      ? `${(result.median_survival_days / 30.4).toFixed(1)} mo`
                      : 'n/a'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">P(survive ≥ 1 yr)</span>
                  <span className="value">
                    {(result.prob_1yr * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">P(survive ≥ 2 yr)</span>
                  <span className="value">
                    {(result.prob_2yr * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Model test C-index</span>
                  <span className="value">
                    {(result.test_cindex ?? config?.test_cindex)?.toFixed(4)}
                  </span>
                </div>
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Scores are relative within the training cohort. Higher risk
                  score → shorter expected survival. This is a research
                  prototype, not clinical advice.
                </p>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-dim)',
                    marginBottom: 14,
                  }}
                >
                  After prediction you will see:
                </p>
                <ul
                  style={{
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    paddingLeft: 18,
                    lineHeight: 1.8,
                  }}
                >
                  <li>Raw risk score &amp; risk band (low / moderate / high)</li>
                  <li>Estimated median survival (days &amp; months)</li>
                  <li>1-year and 2-year survival probabilities</li>
                  <li>Model C-index reference</li>
                </ul>
              </div>
            )}
          </section>

          <section
            className="card"
            style={{
              background: 'var(--primary-soft)',
              borderColor: 'rgba(15,118,110,0.25)',
            }}
          >
            <h2 className="section-title" style={{ color: 'var(--primary)' }}>
              Input checklist
            </h2>
            <ul
              style={{
                fontSize: 13,
                color: 'var(--text-dim)',
                paddingLeft: 18,
                lineHeight: 1.85,
              }}
            >
              <li>
                DICOM series:{' '}
                <strong>
                  {dicomFiles.length
                    ? `${dicomFiles.length} files`
                    : 'not selected'}
                </strong>
              </li>
              <li>
                RTSTRUCT:{' '}
                <strong>{rtstructFile ? rtstructFile.name : 'not selected'}</strong>
              </li>
              <li>
                ROI name: <strong>{roiName || 'not set'}</strong>
              </li>
              <li>
                Clinical:{' '}
                <strong>
                  {age ? `age ${age}` : 'age not set'}, stage {overallStage || 'not set'}
                </strong>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .predict-layout {
            grid-template-columns: 1.15fr 0.85fr !important;
          }
        }
      `}</style>
    </div>
  )
}
