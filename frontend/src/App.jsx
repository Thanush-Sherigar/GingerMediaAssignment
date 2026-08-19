import { useEffect, useRef, useState } from 'react'
import {
	AlertTriangle,
	ArrowUpRight,
	Check,
	ChevronDown,
	CircleDashed,
	FileImage,
	LoaderCircle,
	RotateCcw,
	ScanSearch,
	Sparkles,
	Upload,
	X,
} from 'lucide-react'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/images`
const UPLOAD_API = `${API}/upload`

const statusLabels = {
	IDLE: 'Awaiting image',
	PENDING: 'Queued',
	PROCESSING: 'Analysing',
	COMPLETED: 'Complete',
	FAILED: 'Failed',
}

function formatValue(value) {
	if (typeof value === 'boolean') return value ? 'Yes' : 'No'
	if (value === null || value === undefined || value === '') return 'Not detected'
	return String(value)
}

function Metric({ icon: Icon, label, value, good, detail }) {
	return (
		<article className="metric-card">
			<Icon className="metric-icon" size={19} />
			{good ? <Check className="metric-check check-good" size={18} /> : <AlertTriangle className="metric-check check-alert" size={18} />}
			<div className="metric-copy">
				<p>{label}</p>
				<strong className={good ? 'value-good' : 'value-alert'}>{formatValue(value)}</strong>
				<small>{detail}</small>
			</div>
		</article>
	)
}

export function App() {
	const [file, setFile] = useState(null)
	const [preview, setPreview] = useState('')
	const [job, setJob] = useState(null)
	const [results, setResults] = useState(null)
	const [error, setError] = useState('')
	const [dragging, setDragging] = useState(false)
	const [rawOpen, setRawOpen] = useState(false)
	const inputRef = useRef(null)

	useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

	useEffect(() => {
		if (!job?.jobId || ['COMPLETED', 'FAILED'].includes(job.status)) return undefined
		const poll = async () => {
			try {
				const response = await fetch(`${API}/${job.jobId}/status`)
				if (!response.ok) throw new Error(`Could not read job status (${response.status}).`)
				setJob(await response.json())
			} catch (pollError) {
				setError(pollError.message)
			}
		}
		const timer = setInterval(poll, 2000)
		return () => clearInterval(timer)
	}, [job?.jobId, job?.status])

	useEffect(() => {
		if (job?.status !== 'COMPLETED') return
		fetch(`${API}/${job.jobId}/results`)
			.then((response) => {
				if (!response.ok) throw new Error(`Could not load analysis results (${response.status}).`)
				return response.json()
			})
			.then((data) => {
				let analysis = data.analysisResults ?? data.results ?? data
				if (typeof analysis === 'string') {
					try { analysis = JSON.parse(analysis) } catch { analysis = { detected_text: analysis } }
				}
				setResults(analysis)
			})
			.catch((resultsError) => setError(resultsError.message))
	}, [job?.jobId, job?.status])

	const chooseFile = (selected) => {
		const nextFile = selected?.[0]
		if (!nextFile) return
		if (!nextFile.type.startsWith('image/')) { setError('Please choose an image file.'); return }
		if (preview) URL.revokeObjectURL(preview)
		setFile(nextFile)
		setPreview(URL.createObjectURL(nextFile))
		setJob(null)
		setResults(null)
		setError('')
	}

	const upload = async () => {
		if (!file) return
		setError('')
		setJob({ status: 'PENDING' })
		const body = new FormData()
		body.append('file', file)
		try {
			const response = await fetch(UPLOAD_API, { method: 'POST', body })
			if (!response.ok) throw new Error(`Upload failed (${response.status}). Check that the backend is running.`)
			setJob(await response.json())
		} catch (uploadError) {
			setJob(null)
			setError(uploadError.message)
		}
	}

	const reset = () => {
		if (preview) URL.revokeObjectURL(preview)
		setFile(null); setPreview(''); setJob(null); setResults(null); setError(''); setRawOpen(false)
	}

	const status = job?.status ?? 'IDLE'
	const metrics = results ? [
		{ icon: ScanSearch, label: 'Blur score', value: results.blur_score, good: !results.is_blurry, detail: results.is_blurry ? 'Image may be blurry' : 'Sharpness check passed' },
		{ icon: Sparkles, label: 'Brightness', value: results.brightness_score, good: !results.is_low_light, detail: results.is_low_light ? 'Low light detected' : 'Lighting check passed' },
		{ icon: FileImage, label: 'Screenshot check', value: results.is_suspected_screenshot ? 'Suspected' : 'Original', good: !results.is_suspected_screenshot, detail: 'Source classification' },
		{ icon: ArrowUpRight, label: 'Plate format', value: results.is_valid_plate_format ? 'Valid' : 'Review', good: results.is_valid_plate_format, detail: results.detected_text ? `Text: ${results.detected_text}` : 'No plate text found' },
	] : []

	return (
		<main className="app-shell">
			<header className="topbar"><a className="brand" href="/"><span className="brand-mark">G</span>GINGER<span>MEDIA</span></a><div className="topbar-meta"><span className="live-dot" />Pipeline online <span className="slash">/</span> v1.0</div></header>
			<section className="intro"><div><div className="eyebrow"><CircleDashed size={13} /> Intelligent media processing</div><h1>See the image<br /><em>clearly.</em></h1><p className="lede">Upload a vehicle image and let the pipeline inspect its quality, lighting, source, and plate format.</p></div><div className="intro-side"><div /> Secure analysis</div></section>
			<section className="workspace">
				<div className="upload-panel"><div className="section-label"><span>01</span> Upload source</div>
					{preview ? <div className="preview-wrap"><img src={preview} alt="Selected vehicle" /><button className="icon-button remove-button" onClick={reset} aria-label="Remove image"><X size={16} /></button><div className="preview-caption"><FileImage size={14} />{file.name}<span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div></div> : <button className={`dropzone ${dragging ? 'is-dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files) }}><span className="upload-orb"><Upload size={22} /></span><strong>Drop an image here</strong><span>or choose a file from your device</span><small>JPG <b>•</b> PNG <b>•</b> WEBP <b>•</b> max 10 MB</small></button>}
					<input ref={inputRef} hidden type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files)} />
					<div className="upload-actions"><button className="secondary-button" onClick={reset} disabled={!file}><RotateCcw size={15} /> Reset</button><button className="primary-button" onClick={upload} disabled={!file || ['PENDING', 'PROCESSING'].includes(status)}>{status === 'PENDING' ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />} Analyse image</button></div>
					{error && <p className="error-message">{error}</p>}
				</div>
				<div className="status-panel"><div className="section-label"><span>02</span> Pipeline status</div><div className="status-heading"><div className={`status-badge status-${status.toLowerCase()}`}><span />{statusLabels[status]}</div><small>{job?.jobId ? `ID ${job.jobId.slice(0, 8)}` : 'No active job'}</small></div><div className="progress-track"><div className={`progress-fill ${status.toLowerCase()}`} /></div><div className="status-steps">{['Upload', 'Queue', 'Analyse', 'Result'].map((step, index) => <div className={`step ${index <= (status === 'COMPLETED' ? 3 : status === 'PROCESSING' ? 2 : status === 'PENDING' ? 1 : 0) && status !== 'IDLE' ? 'active' : ''}`} key={step}><span>{index + 1}</span><p>{step}</p></div>)}</div>{status === 'IDLE' && <div className="empty-status"><CircleDashed size={28} /><p>Your analysis status will<br />appear here.</p></div>}{status === 'FAILED' && <div className="empty-status"><AlertTriangle size={28} /><p>{job.failureReason || 'The analysis could not be completed.'}</p></div>}</div>
			</section>
			{results && <section className="results-section"><div className="results-header"><div><div className="section-label"><span>03</span> Analysis results</div><h2>Image intelligence</h2></div><div className="result-stamp"><Check size={14} /> Analysis complete</div></div><div className="metrics-grid">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</div><div className="raw-details"><button onClick={() => setRawOpen(!rawOpen)}>Raw response <ChevronDown className={rawOpen ? 'rotate' : ''} size={14} /></button>{rawOpen && <pre>{JSON.stringify(results, null, 2)}</pre>}</div></section>}
			<footer><span>GINGER<span>MEDIA</span></span><span>Image intelligence pipeline <b>•</b> local instance</span></footer>
		</main>
	)
}
