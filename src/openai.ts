import type { ResponsesData, ResponsesMessageItem } from './types'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-5'

function apiKey(): string {
  try {
    return (localStorage && (localStorage as any).OPENAI_API_KEY) || (window as any).OPENAI_API_KEY || ''
  } catch {
    return ''
  }
}

export type Role = 'system' | 'user' | 'assistant'

export function reasoningPayload(mode: 'fast' | 'thinking') {
  const effort = mode === 'thinking' ? 'medium' : 'minimal'
  // Responses API requires reasoning.effort only
  return { reasoning: { effort } }
}

export async function responsesCreate(input: ResponsesMessageItem[], mode: 'fast' | 'thinking'): Promise<ResponsesData> {
  const key = apiKey()
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const body: any = {
    model: OPENAI_MODEL,
    input,
    ...reasoningPayload(mode),
  }
  const r = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
  return r.json()
}

export async function responsesContinue(previousId: string, function_call_outputs: ResponsesMessageItem[], mode: 'fast' | 'thinking'): Promise<ResponsesData> {
  const key = apiKey()
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const body: any = {
    model: OPENAI_MODEL,
    previous_response_id: previousId,
    input: function_call_outputs,
    ...reasoningPayload(mode),
  }
  const r = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
  return r.json()
}

export async function responsesGet(id: string): Promise<ResponsesData> {
  const key = apiKey()
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const r = await fetch(`${OPENAI_BASE_URL}/responses/${id}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${key}` },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
  return r.json()
}
