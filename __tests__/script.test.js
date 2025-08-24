/* eslint-env jest */

const path = require('path')

// Utility to (re)load the userscript fresh for each test
function loadScript () {
  // reset singleton guard and module cache
  delete window.__COSENSE_GPT5_USERSCRIPT__
  const p = path.resolve(__dirname, '..', 'dist', 'script.js')
  delete require.cache[p]
  return require(p)
}

// Basic fetch mock router
function makeFetchRouter () {
  const calls = []
  const router = jest.fn(async (url, init = {}) => {
    calls.push({ url: String(url), init })
    const u = String(url)

    // Scrapbox page JSON
    if (u.includes('/api/pages/')) {
      if (u.endsWith('/text')) {
        return mkRes(200, 'TEXT Fallback')
      }
      return mkJson(200, { lines: [{ text: 'Page Title' }, { text: 'Body line' }] })
    }

    // OpenAI Responses API – first call returns a function_call to get_page
    if (u.endsWith('/responses') && init.method === 'POST') {
      const body = JSON.parse(init.body || '{}')
      if (!body.previous_response_id) {
        // assert: current page block is appended at the end of input
        const input = body.input || []
        const last = input[input.length - 1]
        expect(last && last.role).toBe('user')
        const text = last && last.content && last.content[0] && last.content[0].text
        expect(typeof text).toBe('string')
        expect(text).toContain('--- Current Page ---')

        return mkJson(200, {
          id: 'resp_first',
          status: 'completed',
          output: [
            { id: 'rs1', type: 'reasoning', summary: [] },
            {
              id: 'fc1',
              type: 'function_call',
              status: 'completed',
              name: 'get_page',
              call_id: 'call_1',
              arguments: JSON.stringify({ title: 'Home' })
            }
          ]
        })
      } else {
        // Continuation – should carry function_call_output in input
        expect(Array.isArray(body.input)).toBe(true)
        const item = body.input[0]
        expect(item.type).toBe('function_call_output')
        expect(item.call_id).toBe('call_1')
        expect(typeof item.output).toBe('string')

        return mkJson(200, {
          id: 'resp_final',
          status: 'completed',
          output: [
            {
              id: 'm1',
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text: '最終回答です' }]
            }
          ]
        })
      }
    }

    // Polling endpoint
    if (u.includes('/responses/') && init.method === 'GET') {
      return mkJson(200, { id: 'poll', status: 'completed', output: [] })
    }

    // fallthrough
    return mkJson(404, { error: 'not found' })
  })
  return { router, calls }
}

function mkRes (status, text) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => { throw new Error('not json') }
  }
}
function mkJson (status, obj) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(obj),
    json: async () => obj
  }
}

// Note: each test prepares its own DOM reset explicitly

test('UI: no section label and quick exists; IME enter behavior', async () => {
  document.body.innerHTML = ''
  const { router } = makeFetchRouter()
  global.fetch = router
  loadScript()
  // There should be no .cg5__section or label text
  expect(document.querySelector('.cg5__section')).toBeNull()
  expect(document.body.textContent).not.toContain('クイックアクション')
  // Quick container exists
  expect(document.querySelector('.cg5__quick')).not.toBeNull()

  // IME behavior on the same instance
  const ta = document.querySelector('.cg5__textarea')
  expect(ta).not.toBeNull()
  ta.value = 'hello'
  ta.dispatchEvent(new window.CompositionEvent('compositionstart'))
  ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(document.querySelector('.cg5__row.-user')).toBeNull()
  ta.dispatchEvent(new window.CompositionEvent('compositionend'))
  ta.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(document.querySelector('.cg5__row.-user')).not.toBeNull()
})


test('Tool loop: function_call -> function_call_output continuation and final text extraction', async () => {
  document.body.innerHTML = ''
  const { router, calls } = makeFetchRouter()
  global.fetch = router
  loadScript()

  const api = window.__COSENSE_GPT5_TEST
  expect(api).toBeTruthy()

  const res = await api.respondWithTools({ history: [], userText: '要約して' })
  expect(res.text).toBe('最終回答です')

  // Verify first POST constructed input with page block at the end
  const firstPost = calls.find(c => c.url.endsWith('/responses') && !JSON.parse(c.init.body).previous_response_id)
  const body = JSON.parse(firstPost.init.body)
  const last = body.input[body.input.length - 1]
  expect(last.role).toBe('user')
  expect(last.content[0].text).toContain('--- Current Page ---')
})
