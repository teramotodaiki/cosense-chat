// Global Scrapbox typing (approximate but comprehensive for our usage)
export type ScrapboxUser = { id?: string; name?: string; displayName?: string; photo?: string }

export type ScrapboxLine = {
  id?: string
  text: string
  indent?: number
  created?: number
  updated?: number
  userId?: string
}

export type ScrapboxPage = {
  title: string
  lines: ScrapboxLine[]
  created?: number
  updated?: number
  user?: ScrapboxUser
}

export type ScrapboxProject = { name: string; displayName?: string }

export type Scrapbox = { Project: ScrapboxProject; Page: ScrapboxPage }

declare global {
  interface Window {
    scrapbox?: Scrapbox
    OPENAI_API_KEY?: string
    __COSENSE_GPT5_USERSCRIPT__?: boolean
    __COSENSE_GPT5_TEST_HOOK__?: boolean
    __COSENSE_GPT5_TEST?: any
  }
}

export {}
