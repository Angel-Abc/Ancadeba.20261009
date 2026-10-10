export function formatMessageForConsole(
  message: string,
  ...args: unknown[]
): { formattedMessage: string; extraArgs: unknown[] } {
  const extraArgs: unknown[] = []

  // Escape literal percent signs before introducing our own console specifiers.
  const formattedMessage = message
    .replaceAll('%', '%%')
    .replace(/\{(\d+)\}/g, (_: string, indexStr: string) => {
      const index = parseInt(indexStr, 10)
      const arg: unknown = args[index]

      // Keep objects inspectable in the console at their placeholder positions.
      if (typeof arg === 'object' && arg !== null) {
        extraArgs.push(arg)
        return '%o'
      }

      return String(arg).replaceAll('%', '%%')
    })

  // Console calls with no extra arguments do not interpret format specifiers.
  return {
    formattedMessage:
      extraArgs.length > 0
        ? formattedMessage
        : formattedMessage.replaceAll('%%', '%'),
    extraArgs,
  }
}
