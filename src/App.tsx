import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Login from './pages/Login'
import Home from './pages/Home'
import PlanEditor from './pages/PlanEditor'
import Workout from './pages/Workout'
import Progress from './pages/Progress'
import History from './pages/History'
import Setup from './pages/Setup'
import NavBar from './components/NavBar'
import { isConfigured } from './firebase'

function Shell() {
  const { user, loading } = useAuth()

  if (!isConfigured) return <Setup />

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <>
      <main className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan/new" element={<PlanEditor />} />
          <Route path="/plan/:planId" element={<PlanEditor />} />
          <Route path="/workout/:planId" element={<Workout />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavBar />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  )
}
