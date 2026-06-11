import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// StrictMode removed — it double-invokes useEffect in dev which causes
// every API call to fire twice. Re-enable if you need it for debugging.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
