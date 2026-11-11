import { __test__ as agentAPI } from './agent'
import { mountUI } from './ui'

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
