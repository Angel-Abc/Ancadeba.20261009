import { format } from 'node:util'
import { expect, it, vi } from 'vitest'
import { ConsoleLogger } from '@ancadeba/utilities'

it.each(['debug', 'info', 'warn', 'error'] as const)(
  '%s preserves literal specifiers in the category, message, and string arguments',
  (method) => {
    const output = vi.spyOn(console, method).mockImplementation(() => {})

    try {
      new ConsoleLogger()[method]('Channel %s', 'Progress %o {0}: {1}', '%c', {
        id: 42,
      })

      expect(output).toHaveBeenCalledOnce()
      const call = output.mock.calls[0] ?? []
      expect(format(...call)).toContain(
        '[Channel %s] Progress %o %c: { id: 42 }',
      )
    } finally {
      output.mockRestore()
    }
  },
)

it('preserves category percent signs without object arguments', () => {
  const output = vi.spyOn(console, 'info').mockImplementation(() => {})

  try {
    const returnedMessage = new ConsoleLogger().info(
      'Channel %s',
      '100%: {0}',
      '%%',
    )

    expect(returnedMessage).toBe('[Channel %s] 100%: %%')
    expect(format(...(output.mock.calls[0] ?? []))).toContain(
      '[Channel %s] 100%: %%',
    )
  } finally {
    output.mockRestore()
  }
})
