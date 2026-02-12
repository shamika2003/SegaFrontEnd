import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/animations.css'
import './styles/effects.css'
import './styles/mask.css'
import './styles/markdown.css'
import App from './App.tsx'
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="317977579477-lq0tbk83668occ9eo0n9uvtpm8f8jm0o.apps.googleusercontent.com">
    <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
