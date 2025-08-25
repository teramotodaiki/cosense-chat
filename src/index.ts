import { mountUI } from './ui'
import { __test__ as agentAPI } from './agent'

;(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI)
  } else {
    mountUI()
  }
})()

// expose for tests if hook present
try {
  if ((window as any).__COSENSE_GPT5_TEST_HOOK__) {
    ;(window as any).__COSENSE_GPT5_TEST = { respondWithTools: agentAPI.respondWithTools }
  }
} catch {}
