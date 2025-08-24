import { describe, expect, test } from 'vitest'
import { extractLinkTitles } from '../src/util'

describe('extractLinkTitles', () => {
  test('extracts unique link titles', () => {
    expect(extractLinkTitles('before [Foo] after [Bar]')).toEqual(['Foo', 'Bar'])
  })

  test('removes duplicates and trims', () => {
    expect(extractLinkTitles('[A] [B] [A] [  C  ]')).toEqual(['A', 'B', 'C'])
  })

  test('returns empty array when no links', () => {
    expect(extractLinkTitles('no links here')).toEqual([])
  })
})
