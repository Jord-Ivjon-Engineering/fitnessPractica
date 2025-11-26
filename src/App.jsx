import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { CartProvider } from './contexts/CartContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Index from './pages/Index'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'
import VideoEditor from './pages/VideoEditor'
import ProgramVideoEditor from './pages/ProgramVideoEditor'
import AdminDashboard from './pages/AdminDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import './App.css'

function AppContent() {
  const location = useLocation();
  const hideFooter = location.pathname.includes('/admin');

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/video-editor" element={<VideoEditor />} />
        <Route path="/admin/program-video-editor" element={<ProgramVideoEditor />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
      </Routes>
      {!hideFooter && <Footer />}
    </>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
