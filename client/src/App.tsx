import { useEffect, useMemo, useRef, useState } from 'react'
import { extractFromFile, extractFromYoutube } from './api'
import StarBorder from './components/StarBorder'

type HistoryItem = { name: string; size: number; date: string }

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [mode, setMode] = useState<'file' | 'youtube'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [yt, setYt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('ie:history') || '[]') } catch { return [] }
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    localStorage.setItem('ie:history', JSON.stringify(history))
  }, [history])

  const canSubmit = useMemo(() => (mode === 'file' ? !!file : !!yt.trim()), [mode, file, yt])

  const handleChoose = () => fileInputRef.current?.click()

  const go = async () => {
    try {
      setLoading(true)
      setStatus('Processing...')
      const blob = mode === 'file'
        ? await extractFromFile(file as File)
        : await extractFromYoutube(yt.trim())
      downloadBlob(blob, 'instrumental.wav')
      setStatus('Instrumental downloaded!')
      if (mode === 'file' && file) {
        setHistory(prev => [{ name: file.name, size: file.size, date: new Date().toISOString() }, ...prev].slice(0, 20))
      }
    } catch (e: any) {
      setStatus('Error: ' + (e?.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Instrumental Extractor</div>

        <div className="files">
          <div className="files-title">My Files</div>
          {history.length === 0 ? (
            <div className="files-empty">No uploads yet</div>
          ) : (
            <ul className="files-list">
              {history.map((h, i) => (
                <li key={i} title={new Date(h.date).toLocaleString()}>
                  <span className="file-name">{h.name}</span>
                  <span className="file-size">{(h.size/1024/1024).toFixed(1)} MB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="content">
        <section className="hero">
          <h1>Instrumental Extractor</h1>
          <p>Separate vocals from music with powerful AI algorithms.</p>

          <div className="mode-toggle">
            <button onClick={() => setMode('file')} className={mode==='file' ? 'active' : ''}>Upload File</button>
            <button onClick={() => setMode('youtube')} className={mode==='youtube' ? 'active' : ''}>YouTube Link</button>
          </div>

          {mode === 'file' ? (
            <div className="uploader">
              <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.flac" onChange={(e) => setFile(e.target.files?.[0] ?? null)} hidden />
              <StarBorder as="button" className="primary" onClick={handleChoose} color="#3b82f6" speed="6s">
                Browse my files
              </StarBorder>
              {file && <div className="file-picked">Selected: {file.name}</div>}
            </div>
          ) : (
            <div className="yt-box">
              <input
                type="text"
                placeholder="Paste YouTube URL here"
                value={yt}
                onChange={(e) => setYt(e.target.value)}
              />
            </div>
          )}

          <div className="actions">
            <StarBorder as="button" onClick={go} className="cta" color="#6c63ff" speed="7s">
              {loading ? 'Working...' : 'Extract Instrumental'}
            </StarBorder>
            <div className="status">{status}</div>
          </div>
        </section>
      </main>
    </div>
  )
}
