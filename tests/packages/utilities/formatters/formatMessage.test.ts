import { format } from 'node:util'
import { describe, expect, it } from 'vitest'
import { formatMessageForConsole } from '@ancadeba/utilities'

describe('formatMessageForConsole', () => {
  it('preserves literal percent specifiers alongside object placeholders', () => {
    const object = { id: 42 }
    const { formattedMessage, extraArgs } = formatMessageForConsole(
      'Progress %s: {0}; 100% complete; %%',
      object,
    )

    expect(extraArgs).toEqual([object])
    expect(format(formattedMessage, ...extraArgs)).toBe(
      'Progress %s: { id: 42 }; 100% complete; %%',
    )
  })

  it('preserves percent specifiers in substituted strings', () => {
    const { formattedMessage, extraArgs } = formatMessageForConsole(
      '{0}: {1}',
      '%s %o %c %%',
      { id: 42 },
    )

    expect(format(formattedMessage, ...extraArgs)).toBe(
      '%s %o %c %%: { id: 42 }',
    )
  })

  it('preserves percent signs when no console arguments remain', () => {
    const result = formatMessageForConsole('100%: {0}; %%', '%s')

    expect(result.extraArgs).toEqual([])
    expect(result.formattedMessage).toBe('100%: %s; %%')
    expect(format(result.formattedMessage, ...result.extraArgs)).toBe(
      '100%: %s; %%',
    )
  })

  it('keeps repeated and reordered object placeholders in the correct positions', () => {
    const first = { id: 1 }
    const second = { id: 2 }
    const { formattedMessage, extraArgs } = formatMessageForConsole(
      '{1} / {0} / {1}',
      first,
      second,
    )

    expect(extraArgs).toEqual([second, first, second])
    expect(format(formattedMessage, ...extraArgs)).toBe(
      '{ id: 2 } / { id: 1 } / { id: 2 }',
    )
  })
})
