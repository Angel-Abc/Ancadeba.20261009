import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { projectSchema } from '@ancadeba/schemas'
import { App } from './App'
import './styles.css'

const project = projectSchema.parse({ id: 'basic-game', name: 'Basic Game' })
const root = document.getElementById('root')

if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <App project={project} />
  </StrictMode>,
)
