import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ApiProjectLoader } from './projectLoader'
import './styles.css'

const projectLoader = new ApiProjectLoader(fetch)
const root = document.getElementById('root')

if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <App projectLoader={projectLoader} />
  </StrictMode>,
)
