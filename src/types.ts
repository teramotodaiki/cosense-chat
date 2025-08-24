export type ScrapboxLine = { text?: string }

export type ResponsesMessageItem = {
  id?: string
  type: 'message' | 'function_call' | 'function_call_output' | 'reasoning'
  role?: 'assistant' | 'user' | 'system'
  name?: string
  call_id?: string
  tool_call_id?: string
  status?: string
  arguments?: string
  content?: { type: 'text' | 'input_text' | 'output_text'; text: string }[]
}

export type ResponsesData = {
  id: string
  status?: string
  output_text?: string
  output?: ResponsesMessageItem[]
}

