export async function extractFromFile(file: File): Promise<Blob> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/extract-instrumental/', { method: 'POST', body: form })
  if (!res.ok) throw new Error((await safeJson(res)).error || res.statusText)
  return res.blob()
}

export async function extractFromYoutube(url: string): Promise<Blob> {
  const form = new FormData()
  form.append('url', url)
  const res = await fetch('/extract-from-youtube/', { method: 'POST', body: form })
  if (!res.ok) throw new Error((await safeJson(res)).error || res.statusText)
  return res.blob()
}

async function safeJson(res: Response): Promise<any> {
  try { return await res.json() } catch { return {} }
}

