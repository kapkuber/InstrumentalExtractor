import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { extractFromFile, extractFromYoutube } from './api'
import StarBorder from './components/StarBorder'
import { CloudUpload } from 'lucide-react'
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from 'flowbite-react'
import { HiViewBoards, HiInbox } from 'react-icons/hi'
import { Pencil, Download as DlIcon, Play, Pause, Trash2 } from 'lucide-react'

// Persisted metadata for extracted files (blobs live in IndexedDB)
type FileItem = { id: string; name: string; size: number; date: string; type: string }

// Simple IndexedDB helpers
const DB_NAME = 'ie-db'
const STORE = 'extracted'
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function dbPut(id: string, blob: Blob) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
async function dbGet(id: string): Promise<Blob | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
    req.onerror = () => reject(req.error)
  })
}
async function dbDel(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [mode, setMode] = useState<'file' | 'youtube'>('file')
  const [view, setView] = useState<'extractor' | 'files'>('extractor')
  const [file, setFile] = useState<File | null>(null)
  const [yt, setYt] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [filesMeta, setFilesMeta] = useState<FileItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('ie:extracted') || '[]') } catch { return [] }
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    localStorage.setItem('ie:extracted', JSON.stringify(filesMeta))
  }, [filesMeta])

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
      const id = crypto.randomUUID()
      await dbPut(id, blob)
      const displayName = file?.name || 'instrumental.wav'
      setFilesMeta(prev => [{ id, name: displayName, size: blob.size, date: new Date().toISOString(), type: blob.type || 'audio/wav' }, ...prev])
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
              <SidebarItem href="#" icon={HiViewBoards} className={view==='extractor' ? 'active-item' : ''} onClick={(e:any)=>{e.preventDefault(); setView('extractor')}}>
                Extractor
              </SidebarItem>
              <SidebarItem href="#" icon={HiInbox} className={view==='files' ? 'active-item' : ''} onClick={(e:any)=>{e.preventDefault(); setView('files')}}>
                Files
              </SidebarItem>
            </SidebarItemGroup>
          </SidebarItems>
        </Sidebar>
      </div>

      <main className={`content ${view}`}>
        {view === 'extractor' ? (
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
        ) : (
        <section className="files-view">
          <h2>Your Files</h2>
          {filesMeta.length === 0 ? (
            <div className="files-empty">No extracted files yet.</div>
          ) : (
            <ul className="files-list wide">
              {filesMeta.map((f) => (
                <li key={f.id} className="file-row">
                  <div className="file-meta">
                    <div className="file-name">{f.name}</div>
                    <div className="file-sub">{(f.size/1024/1024).toFixed(2)} MB • {new Date(f.date).toLocaleString()}</div>
                  </div>
                  <div className="file-actions">
                    <button className="icon-btn" title="Rename" onClick={() => {
                      const name = prompt('Rename file', f.name) || f.name
                      setFilesMeta(prev => prev.map(x => x.id===f.id ? { ...x, name } : x))
                    }}><Pencil size={18} /></button>
                    <button className="icon-btn" title="Download" onClick={async () => {
                      const blob = await dbGet(f.id); if (!blob) return; const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                    }}><DlIcon size={18} /></button>
                    <PlayPause fileId={f.id} />
                    <button className="icon-btn danger" title="Delete" onClick={async () => {
                      if (!confirm('Delete this file?')) return; await dbDel(f.id); setFilesMeta(prev => prev.filter(x=>x.id!==f.id))
                    }}><Trash2 size={18} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </main>
    </div>
  )
}

function PlayPause({ fileId }: { fileId: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause(); setPlaying(false); return
    }
    if (!audioRef.current) audioRef.current = new Audio()
    let url = urlRef.current
    if (!url) {
      const blob = await dbGet(fileId)
      if (!blob) return
      url = URL.createObjectURL(blob)
      urlRef.current = url
    }
    audioRef.current.src = url!
    await audioRef.current.play()
    setPlaying(true)
  }

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  return (
    <button className="icon-btn" title={playing ? 'Pause' : 'Play'} onClick={toggle}>
      {playing ? <Pause size={18} /> : <Play size={18} />}
    </button>
  )
}
