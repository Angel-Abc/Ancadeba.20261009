import { useState } from 'react'
import type { Project } from '@ancadeba/schemas'

export function useProjectHistory(initial: Project) {
  const [history, setHistory] = useState({
    past: [] as Project[],
    present: initial,
    future: [] as Project[],
  })
  return {
    project: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    setProject: (next: Project) =>
      setHistory((previous) => ({
        past: [...previous.past, previous.present].slice(-50),
        present: next,
        future: [],
      })),
    undo: () =>
      setHistory((previous) =>
        previous.past.length === 0
          ? previous
          : {
              past: previous.past.slice(0, -1),
              present: previous.past.at(-1)!,
              future: [previous.present, ...previous.future],
            },
      ),
    redo: () =>
      setHistory((previous) =>
        previous.future.length === 0
          ? previous
          : {
              past: [...previous.past, previous.present],
              present: previous.future[0]!,
              future: previous.future.slice(1),
            },
      ),
  }
}
