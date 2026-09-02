import { Routes, Route } from 'react-router-dom'
import { HealthDashboard } from './components/dashboard/HealthDashboard'
import { AIAdvisorPanel } from './components/ai/AIAdvisorPanel'
import { VaccinationCalendar } from './components/vaccination/VaccinationCalendar'
import { TreatmentManager } from './components/treatment/TreatmentManager'
import { WithdrawalTracker } from './components/withdrawal/WithdrawalTracker'
import { DiseaseLibrary } from './components/disease/DiseaseLibrary'

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Turkey Health Intelligence Engine</h1>
          <div className="flex gap-4 text-sm">
            <a href="/" className="hover:text-indigo-300">Dashboard</a>
            <a href="/ai-advisor" className="hover:text-indigo-300">AI Advisor</a>
            <a href="/vaccinations" className="hover:text-indigo-300">Szczepienia</a>
            <a href="/treatments" className="hover:text-indigo-300">Leczenie</a>
            <a href="/withdrawals" className="hover:text-indigo-300">Karencja</a>
            <a href="/diseases" className="hover:text-indigo-300">Choroby</a>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<HealthDashboard />} />
          <Route path="/ai-advisor" element={<AIAdvisorPanel flockId="demo-flock" />} />
          <Route path="/vaccinations" element={<VaccinationCalendar />} />
          <Route path="/treatments" element={<TreatmentManager flockId="demo-flock" />} />
          <Route path="/withdrawals" element={<WithdrawalTracker flockId="demo-flock" />} />
          <Route path="/diseases" element={<DiseaseLibrary />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
