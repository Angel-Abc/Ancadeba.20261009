const reservedPorts = new Set([5173, 5174, 3000])

function readPort(variable: string, fallback: number): number {
  const port = Number(process.env[variable] ?? fallback)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${variable} must be an integer between 1 and 65535`)
  }

  if (reservedPorts.has(port)) {
    throw new Error(`${variable} cannot use a reserved pnpm dev port: ${port}`)
  }

  return port
}

export const e2ePorts = {
  engine: readPort('E2E_ENGINE_PORT', 5273),
  editor: readPort('E2E_EDITOR_PORT', 5274),
  server: readPort('E2E_SERVER_PORT', 3100),
}

if (new Set(Object.values(e2ePorts)).size !== 3) {
  throw new Error('The engine, editor UI, and API must use different E2E ports')
}

export const e2eUrls = {
  engine: `http://127.0.0.1:${e2ePorts.engine}`,
  editor: `http://127.0.0.1:${e2ePorts.editor}`,
  server: `http://127.0.0.1:${e2ePorts.server}`,
}
