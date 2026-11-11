/* eslint-env node, jest */
const { test, expect } = require('@playwright/test')
const path = require('path')

for (const [mode, effort] of [
  ['fast', 'none'],
  ['thinking', 'medium']
]) {
  for (const action of ['typed message', 'quick summary']) {
    test(`user can send ${action} and receive final response in ${mode} mode`, async ({ page }) => {
      await page.addInitScript(() => {
        const calls = []
        window.__FETCH_CALLS__ = calls

        function mkRes(status, text) {
          return {
            ok: status >= 200 && status < 300,
            status,
            text: async () => text,
            json: async () => {
              throw new Error('not json')
            }
          }
        }
        function mkJson(status, obj) {
          return {
            ok: status >= 200 && status < 300,
            status,
            text: async () => JSON.stringify(obj),
            json: async () => obj
          }
        }

        window.fetch = async (url, init = {}) => {
          calls.push({ url: String(url), init })
          const u = String(url)

          if (u.includes('/api/pages/')) {
            if (u.endsWith('/text')) return mkRes(200, 'TEXT Fallback')
            return mkJson(200, { lines: [{ text: 'Page Title' }, { text: 'Body line' }] })
          }

          if (u.endsWith('/responses') && init.method === 'POST') {
            const body = JSON.parse(init.body || '{}')
            if (!body.previous_response_id) {
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
            }
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

          if (u.includes('/responses/') && init.method === 'GET') {
            return mkJson(200, { id: 'poll', status: 'completed', output: [] })
          }

          return mkJson(404, { error: 'not found' })
        }
      })

      const file = path.resolve(__dirname, 'page.html')
      await page.goto('file://' + file)

      await page.click('.cg5__toggle')
      await page.selectOption('.cg5__select', mode)
      if (action === 'typed message') {
        await page.fill('.cg5__textarea', '要約して')
        await page.click('.cg5__send')
      } else {
        await page.click('.cg5__qa')
      }

      await expect(page.locator('.cg5__row.-asst .cg5__content')).toHaveText('最終回答です')

      const calls = await page.evaluate(() => window.__FETCH_CALLS__)
      const firstPost = calls.find(c => c.url.endsWith('/responses') && !JSON.parse(c.init.body).previous_response_id)
      for (const call of calls.filter(c => c.url.endsWith('/responses') && c.init.method === 'POST')) {
        const payload = JSON.parse(call.init.body)
        expect(payload.model).toBe('gpt-5.6-sol')
        expect(payload.reasoning.effort).toBe(effort)
      }
      const continuation = calls.find(c => c.url.endsWith('/responses') && JSON.parse(c.init.body).previous_response_id)
      expect(JSON.parse(continuation.init.body).input[0].call_id).toBe('call_1')
      const body = JSON.parse(firstPost.init.body)
      const last = body.input[body.input.length - 1]
      expect(last.role).toBe('user')
      expect(last.content[0].text).toContain('--- Current Page ---')
    })
  }
}
