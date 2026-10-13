import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { starterProject } from '@ancadeba/schemas'
import { App } from './App'
import './styles.css'
import { ContainerBuilder } from './ioc/containerBuilder'

const project = starterProject
const root = document.getElementById('root')

const containerBuilder = new ContainerBuilder()
containerBuilder.build()

if (!root) throw new Error('Missing root element')

createRoot(root).render(
  <StrictMode>
    <App project={project} />
  </StrictMode>,
)
