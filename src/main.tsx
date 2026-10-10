import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { tuning } from '@/game/tuning'

// Development only: lets a browser script set up a descent to look at. Not part of the production build.
if (import.meta.env.DEV) {
  void Promise.all([import('@/state/run-store'), import('@/state/store')]).then(([run, game]) => {
    (window as unknown as Record<string, unknown>).__emberdeep = { useRun: run.useRun, useGame: game.useGame }
  })
}

// Development only: VITE_DROP_OIL in .env.local multiplies all the oil that drops in the deep (1.3 is +30%), to try a
// richer deep in local play before the balance changes for everyone. The signing server plays by the normal rules, so
// a descent played this way cannot be recorded in the Hall.
const dropOil = Number(import.meta.env.VITE_DROP_OIL)
if (import.meta.env.DEV && dropOil > 0) tuning.dropOil = dropOil

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
