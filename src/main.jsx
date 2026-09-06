import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store'
import App from './App'
import { Spectator } from './screens/Spectator'
import './index.css'

// A link with a payload opens the read-only view instead of the app. Nothing
// about the host's own game is loaded on that path.
const shared = window.location.hash.startsWith('#g=')
  ? window.location.hash.slice(3)
  : null

// The route is read once at boot, so a hash change inside an already-open tab
// (tapping a shared link while the app is running) has to re-enter the app.
window.addEventListener('hashchange', () => window.location.reload())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shared !== null ? (
      <Spectator encoded={shared} />
    ) : (
      <StoreProvider>
        <App />
      </StoreProvider>
    )}
  </StrictMode>,
)
