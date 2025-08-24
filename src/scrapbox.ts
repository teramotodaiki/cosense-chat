import type { ScrapboxLine } from './types'

export function currentProject(): string {
  try {
    // @ts-expect-error: scrapbox is injected
    if (window.scrapbox?.Project?.name) return window.scrapbox.Project.name
  } catch {}
  const m = location.pathname.split('/').filter(Boolean)
  return m[0] || ''
}

export function currentPageText(limit = 15000): string {
  // @ts-expect-error: scrapbox is injected
  const lines: ScrapboxLine[] = window?.scrapbox?.Page?.lines || []
  const text = lines.map(l => l?.text || '').join('\n')
  return text.length > limit ? text.slice(0, limit) : text
}

export async function fetchScrapboxPageText(title: string, limit = 15000): Promise<string> {
  const project = currentProject()
  const base = `/api/pages/${encodeURIComponent(project)}/${encodeURIComponent(title)}`

  const r = await fetch(base, { credentials: 'same-origin' })
  if (r.ok) {
    try {
      const j = await r.json()
      if (Array.isArray(j?.lines)) {
        const txt = j.lines.map((l: ScrapboxLine) => l.text || '').join('\n')
        return txt.length > limit ? txt.slice(0, limit) : txt
      }
    } catch {}
  }

  const r2 = await fetch(base + '/text', { credentials: 'same-origin' })
  if (r2.ok) {
    const t = await r2.text()
    return t.length > limit ? t.slice(0, limit) : t
  }
  return ''
}

