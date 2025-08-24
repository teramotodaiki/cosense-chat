export function extractLinkTitles(text: string): string[] {
  const set = new Set<string>()
  // Single-bracket link syntax: [Title]
  const re = /\[([^\]]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const t = m[1].trim()
    if (t) set.add(t)
  }
  return Array.from(set)
}
