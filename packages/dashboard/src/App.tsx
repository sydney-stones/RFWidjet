import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ApiKeys from './pages/ApiKeys'
import Analytics from './pages/Analytics'
import './App.css'

function App() {
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>Rendered Fits</h1>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/api-keys">API Keys</Link>
          </li>
          <li>
            <Link to="/analytics">Analytics</Link>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
