import { __test__ as agentAPI } from './agent'

export function mountUI() {
  if ((window as any).__COSENSE_GPT5_USERSCRIPT__) return
  ;(window as any).__COSENSE_GPT5_USERSCRIPT__ = true

  const STYLE = `
  .cg5__wrap{position:fixed;inset:var(--cg5-top,40px) auto 0 0;z-index:2147483000;width:380px;max-width:90vw;transform:translateX(-340px);transition:transform .2s ease}
  .cg5__wrap[data-open="true"]{transform:none}
  .cg5__panel{box-sizing:border-box;height:100%;background:rgba(196,197,202,.7);backdrop-filter:saturate(1.2) blur(4px);color:#111;border-right:1px solid rgba(0,0,0,.18);padding:10px 10px 12px 10px;display:flex;flex-direction:column;font:13px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .cg5__toggle{position:absolute;top:8px;right:-24px;width:24px;height:48px;background:rgba(196,197,202,.7);border:1px solid rgba(0,0,0,.18);border-left:none;border-radius:0 6px 6px 0;color:#111;display:flex;align-items:center;justify-content:center;cursor:pointer}
  .cg5__msgs{flex:1;overflow:auto;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.55);border-radius:6px;padding:8px;color:#111;display:flex;flex-direction:column}
  .cg5__row{display:flex;margin:6px 0}
  .cg5__row.-user{justify-content:flex-end}
  .cg5__row.-asst{justify-content:flex-start}
  .cg5__msg{max-width:90%;white-space:pre-wrap;padding:8px 10px;border-radius:12px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.9)}
  .cg5__msg.-pending{opacity:.95}
  .cg5__dots{display:inline-block}
  .cg5__dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#555;margin-right:4px;animation:cg5Blink 1s infinite ease-in-out}
  .cg5__dot:nth-child(2){animation-delay:.15s}
  .cg5__dot:nth-child(3){animation-delay:.3s}
  @keyframes cg5Blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .cg5__input{display:flex;gap:6px;margin-top:8px}
  .cg5__textarea{flex:1;min-height:40px;max-height:160px;padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.9);color:#111;resize:vertical;font-size:16px}
  .cg5__send{padding:6px 10px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.7);color:#111;cursor:pointer;font-size:16px}
  .cg5__modeRow{display:flex;gap:8px;align-items:center;margin:6px 0}
  .cg5__label{font-size:12px;opacity:.85}
  .cg5__select{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.9);color:#111;font-size:16px}
  .cg5__quick{display:flex;gap:6px;margin:4px 0 6px 0;background:rgba(255,255,255,.6);border:1px solid rgba(0,0,0,.18);border-radius:6px;padding:6px}
  .cg5__qa{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.85);color:#111;cursor:pointer}
  .cg5__qa:hover{background:rgba(255,255,255,.95)}
  .cg5__actions{display:flex;gap:6px;margin-top:4px}
  .cg5__copy{padding:4px 6px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.85);color:#111;cursor:pointer;font-size:12px}
  .cg5__copy:hover{background:rgba(255,255,255,.95)}
  `

  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)

  const wrap = el('div', 'cg5__wrap')
  wrap.dataset.open = 'false'
  const panel = el('div', 'cg5__panel')
  const toggle = el('div', 'cg5__toggle', '>')
  const msgs = el('div', 'cg5__msgs')
  const quick = el('div', 'cg5__quick')
  const qa = el('button', 'cg5__qa', 'このページを要約して') as HTMLButtonElement
  qa.type = 'button'
  quick.appendChild(qa)
  const input = el('textarea', 'cg5__textarea') as HTMLTextAreaElement
  input.setAttribute('placeholder', '例: このページを要約して')
  const sendBtn = el('button', 'cg5__send', 'Send') as HTMLButtonElement
  sendBtn.type = 'button'

  // mode dropdown
  let MODE: 'fast' | 'thinking' = 'fast'
  try { MODE = (localStorage.getItem('COSENSE_GPT5_MODE') as any) || 'fast' } catch {}
  const modeRow = el('div', 'cg5__modeRow')
  const modeLbl = el('span', 'cg5__label', 'Mode')
  const modeSelect = document.createElement('select')
  modeSelect.className = 'cg5__select'
  const o1 = document.createElement('option'); o1.value = 'fast'; o1.textContent = 'Fast'
  const o2 = document.createElement('option'); o2.value = 'thinking'; o2.textContent = 'Thinking'
  modeSelect.append(o1, o2)
  modeSelect.value = MODE
  modeSelect.addEventListener('change', () => {
    MODE = (modeSelect.value === 'thinking') ? 'thinking' : 'fast'
    try { localStorage.setItem('COSENSE_GPT5_MODE', MODE) } catch {}
  })
  modeRow.append(modeLbl, modeSelect)

  const desc = el('div', '', 'このページと必要なリンク先を読んで回答します（GPT-5）')
  const inputRow = el('div', 'cg5__input')
  inputRow.append(input, sendBtn)
  panel.append(desc, modeRow, quick, msgs, inputRow)
  wrap.append(panel, toggle)
  document.body.appendChild(wrap)

  const openDrawer = () => { wrap.dataset.open = 'true'; toggle.textContent = '<'; input.focus() }
  const closeDrawer = () => { wrap.dataset.open = 'false'; toggle.textContent = '>' }
  toggle.addEventListener('click', () => { wrap.dataset.open === 'true' ? closeDrawer() : openDrawer() })

  sendBtn.addEventListener('click', async () => {
    const t = (input.value || '').trim()
    if (!t) return
    input.value = ''
    appendRow(msgs, 'user', t)
    openDrawer()

    const pending = appendRow(msgs, 'asst', '')
    pending.classList.add('-pending')
    const pc = pending.querySelector('.cg5__content') as HTMLElement
    if (pc) {
      pc.innerHTML = ''
      const dots = document.createElement('span')
      dots.className = 'cg5__dots'
      dots.innerHTML = '<span class="cg5__dot"></span><span class="cg5__dot"></span><span class="cg5__dot"></span>'
      pc.appendChild(dots)
    }
    try {
      const res = await agentAPI.respondWithTools({ history: [], userText: t, mode: MODE })
      setAssistantContent(pending, res.text)
    } catch (e: any) {
      setAssistantContent(pending, `Error: ${e?.message || e}`)
    }
  })

  qa.addEventListener('click', () => {
    input.value = 'このページを要約して'
    sendBtn.click()
  })

  // IME-aware Enter submit
  let composing = false
  input.addEventListener('compositionstart', () => { composing = true })
  input.addEventListener('compositionend', () => { composing = false })
  input.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (
      ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey
    ) {
      if (composing || (ev as any).isComposing) return
      ev.preventDefault()
      sendBtn.click()
    }
  })
}

function el(tag: string, cls = '', text = ''): HTMLElement {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

function appendRow(container: HTMLElement, role: 'user' | 'asst', text: string) {
  const row = el('div', `cg5__row -${role}`)
  const bubble = el('div', `cg5__msg -${role}`)
  const content = el('div', 'cg5__content', text)
  bubble.appendChild(content)
  row.appendChild(bubble)
  container.appendChild(row)
  container.scrollTop = container.scrollHeight
  return bubble
}

function setAssistantContent(bubble: HTMLElement, text: string) {
  bubble.classList.remove('-pending')
  const content = bubble.querySelector('.cg5__content') as HTMLElement
  if (content) content.textContent = text
  // Copy button
  if (!bubble.querySelector('.cg5__actions')) {
    const actions = el('div', 'cg5__actions')
    const copy = el('button', 'cg5__copy', 'コピー') as HTMLButtonElement
    copy.type = 'button'
    copy.addEventListener('click', async (ev) => {
      try { ev.preventDefault() } catch {}
      const txt = content?.textContent || ''
      try {
        await navigator.clipboard.writeText(txt)
        const old = copy.textContent || ''
        copy.textContent = 'コピーしました'
        setTimeout(() => { copy.textContent = old }, 1200)
      } catch {}
    })
    actions.appendChild(copy)
    bubble.appendChild(actions)
  }
}
