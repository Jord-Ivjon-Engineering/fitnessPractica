import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Header from './components/Header'
import Index from './pages/Index'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Header />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
