export function formatMessageForConsole(
  message: string,
  ...args: unknown[]
): { formattedMessage: string; extraArgs: unknown[] } {
  const extraArgs: unknown[] = []

  // Replace placeholders in the message with either their string value or with a console format specifier.
  // We use a regex to find all placeholders like {0}, {1}, etc.
  const formattedMessage = message.replace(
    /\{(\d+)\}/g,
    (_: string, indexStr: string) => {
      const index = parseInt(indexStr, 10)
      const arg: unknown = args[index]

      // If the argument is an object (or not a primitive), use '%o' as the placeholder
      // and push the object into extraArgs to be passed to the console.
      if (typeof arg === 'object' && arg !== null) {
        extraArgs.push(arg)
        return '%o'
      }

      // Otherwise, simply convert the argument to a string.
      return String(arg)
    },
  )

  return { formattedMessage, extraArgs }
}
