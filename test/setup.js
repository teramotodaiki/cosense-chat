// JSDOM setup for tests
Object.defineProperty(window, '__COSENSE_GPT5_TEST_HOOK__', { value: true, writable: true });

// Provide a stable Date.now if needed
Date.now = () => 1700000000000;

// Minimal scrapbox stubs so code can read current project/page
window.scrapbox = {
  Project: { name: 'proj' },
  Page: {
    title: 'Home',
    lines: [{ text: 'L1' }, { text: 'L2' }],
  },
};

// API key so the code path doesn’t error out
window.localStorage.setItem('OPENAI_API_KEY', 'test-key');
