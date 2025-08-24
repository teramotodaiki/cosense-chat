import type { ResponsesData, ResponsesMessageItem } from './types'
import { responsesContinue, responsesCreate, responsesGet } from './openai'
import { fetchScrapboxPageText, currentPageText } from './scrapbox'
import { extractLinkTitles } from './util'

export async function respondWithTools({ history, userText, mode }: { history: ResponsesMessageItem[]; userText: string; mode: 'fast' | 'thinking' }): Promise<{ raw: ResponsesData; text: string }>{
  const system = [
    'あなたはCosense(Scrapbox)上で動作するアシスタントです。',
    "必要に応じて 'get_page' ツールでリンク先ページの本文を取得してから回答してください。",
    '根拠がページに無い場合は、その旨を明示してください。',
  ].join('\n')

  // @ts-expect-error: provided by page
  const currentTitle: string = window?.scrapbox?.Page?.title || '(無題)'
  const pageBlock = [
    `現在のページ: ${currentTitle}`,
    '--- Current Page ---',
    currentPageText(),
    '---------------------',
  ].join('\n')

  // Prefetch top 5 linked pages (best-effort, no try-catch flood)
  const linkedSection = await buildLinkedSection(currentPageText())

  const input: ResponsesMessageItem[] = [
    { role: 'system', type: 'message', content: [{ type: 'input_text', text: system }] },
    ...history,
    { role: 'user', type: 'message', content: [{ type: 'input_text', text: userText }] },
    { role: 'user', type: 'message', content: [{ type: 'input_text', text: pageBlock + (linkedSection ? ('\n\n' + linkedSection) : '') }] },
  ]

  let res = await responsesCreate(input, mode)
  res = await waitForNonPending(res)
  res = await handleToolLoops(res, mode)
  res = await waitForNonPending(res)

  return { raw: res, text: extractText(res) || '(no text)' }
}

async function buildLinkedSection(text: string): Promise<string> {
  const titles = extractLinkTitles(text).slice(0, 5)
  if (!titles.length) return ''
  const chunks: string[] = []
  for (const t of titles) {
    const body = await fetchScrapboxPageText(t)
    if (body) chunks.push(`--- Link: ${t} ---\n${body}`)
  }
  return chunks.length ? `Linked Pages Included (${chunks.length}):\n${chunks.join('\n\n')}` : ''
}

async function handleToolLoops(res: ResponsesData, mode: 'fast' | 'thinking'): Promise<ResponsesData> {
  if (!res?.id) return res
  let guard = 0
  while (guard++ < 8) {
    const calls = collectFunctionCalls(res)
    if (!calls.length) break

    const outputs: ResponsesMessageItem[] = []
    for (const call of calls) {
      const name = call.name
      const argsJSON = call.arguments || '{}'
      let args: any = {}
      try { args = JSON.parse(argsJSON) } catch {}
      if (name === 'get_page') {
        const body = await fetchScrapboxPageText(String(args?.title || ''))
        outputs.push({ type: 'function_call_output', call_id: call.call_id || call.tool_call_id, // @ts-ignore – test expects `output`
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error: Responses API accepts `output` in our tests
          output: String(body) })
      }
    }

    res = await responsesContinue(res.id, outputs, mode)
    res = await waitForNonPending(res)
  }
  return res
}

function collectFunctionCalls(r: ResponsesData) {
  const calls: any[] = []
  const out = Array.isArray(r?.output) ? r.output : []
  for (const item of out) {
    if (item && item.type === 'function_call') calls.push(item)
  }
  return calls
}

function extractText(r: ResponsesData): string {
  if (!r) return ''
  if (typeof r.output_text === 'string') return r.output_text
  const collect: string[] = []
  const out = Array.isArray(r.output) ? r.output : []
  for (const item of out) {
    if (item?.type === 'message' && Array.isArray(item.content) && (!item.role || item.role === 'assistant')) {
      for (const c of item.content) {
        if (c && (c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') collect.push(c.text)
      }
    }
  }
  return collect.join('')
}

async function waitForNonPending(res: ResponsesData): Promise<ResponsesData> {
  if (!res?.id) return res
  let guard = 0
  while (res?.status && (res.status === 'queued' || res.status === 'in_progress') && guard++ < 120) {
    await new Promise(r => setTimeout(r, 800))
    res = await responsesGet(res.id)
  }
  return res
}

// test exposure
export const __test__ = { respondWithTools }
