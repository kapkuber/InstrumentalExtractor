import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { extractFromFile, extractFromYoutube } from './api'
import StarBorder from './components/StarBorder'
import { CloudUpload } from 'lucide-react'
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from 'flowbite-react'
import { HiViewBoards, HiInbox } from 'react-icons/hi'

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
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    localStorage.setItem('ie:history', JSON.stringify(history))
  }, [history])

  const canSubmit = useMemo(() => (mode === 'file' ? !!file : !!yt.trim()), [mode, file, yt])

  const handleChoose = () => fileInputRef.current?.click()

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      setFile(files[0])
      e.dataTransfer.clearData()
    }
  }
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!dragging) setDragging(true) }
  const onDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(true) }
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragging(false) }

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
      <div className="fb-sidebar">
        <Sidebar aria-label="App sidebar" data-testid="flowbite-sidebar">
          <SidebarItems>
            <SidebarItemGroup>
              <SidebarItem href="#" icon={HiViewBoards}>Extractor</SidebarItem>
              <SidebarItem href="#" icon={HiInbox}>Files</SidebarItem>
            </SidebarItemGroup>
          </SidebarItems>
        </Sidebar>
      </div>

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
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.flac"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                hidden
              />
              <div
                className={`dropzone ${dragging ? 'highlight' : ''}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onClick={handleChoose}
                role="button"
                tabIndex={0}
              >
                <CloudUpload size={48} color="#ffffff" />
                <div className="dz-title">Drag & Drop to Upload File</div>
                <div className="dz-or">OR</div>
                <button type="button" className="btn browse-btn" onClick={handleChoose}>Browse File</button>
                {file && <div className="dz-filename">Selected: {file.name}</div>}
              </div>
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
            <StarBorder as="button" onClick={go} className="cta" color="#6c63ff" speed="8s">
              {loading ? 'Working...' : 'Extract Instrumental'}
            </StarBorder>
            <div className="status">{status}</div>
          </div>
        </section>
      </main>
    </div>
  )
}
