import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { reasoningPayload, responsesContinue, responsesCreate, responsesGet } from '../src/openai'
import type { ResponsesMessageItem } from '../src/types'

describe('Responses API model compatibility', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'resp_test', output: [] }) })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  test.each([
    ['fast', 'none'],
    ['thinking', 'medium']
  ] as const)('%s uses supported effort %s for both creation and continuation', async (mode, effort) => {
    expect(reasoningPayload(mode)).toEqual({ reasoning: { effort } })
    const input: ResponsesMessageItem[] = [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: '要約して' }] }
    ]
    await responsesCreate(input, mode)
    // Preserve the tool output payload and response chain without rewriting either.
    const outputs = [{ type: 'function_call_output' as const, call_id: 'call_1', output: 'ページ本文' }]
    await responsesContinue('resp_previous', outputs, mode)

    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe('https://api.openai.com/v1/responses')
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe('Bearer test-key')
      const body = JSON.parse(init.body)
      expect(body.model).toBe('gpt-5.6-sol')
      expect(body.reasoning).toEqual({ effort })
      expect(body).not.toHaveProperty('temperature')
      expect(body).not.toHaveProperty('max_tokens')
    }
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ model: 'gpt-5.6-sol', input, reasoning: { effort } })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      model: 'gpt-5.6-sol',
      previous_response_id: 'resp_previous',
      input: outputs,
      reasoning: { effort }
    })
  })

  test('polling keeps the existing Responses endpoint', async () => {
    await expect(responsesGet('resp_test')).resolves.toEqual({ id: 'resp_test', output: [] })
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses/resp_test')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  test('a missing API key fails before network access', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '')
    await expect(responsesCreate([], 'fast')).rejects.toThrow('OPENAI_API_KEY not set')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('API failures are surfaced without silently retrying on a different model', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'invalid request' })
    await expect(responsesCreate([], 'fast')).rejects.toThrow('HTTP 400: invalid request')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
