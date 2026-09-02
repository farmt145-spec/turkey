import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import WorkflowBuilder from './pages/WorkflowBuilder';
import ProcessMonitor from './pages/ProcessMonitor';
import EventHistory from './pages/EventHistory';
import ScheduleManager from './pages/ScheduleManager';
import NotificationPanel from './pages/NotificationPanel';
import AISuggestions from './pages/AISuggestions';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflows" element={<WorkflowBuilder />} />
        <Route path="/monitor" element={<ProcessMonitor />} />
        <Route path="/history" element={<EventHistory />} />
        <Route path="/schedule" element={<ScheduleManager />} />
        <Route path="/notifications" element={<NotificationPanel />} />
        <Route path="/ai-suggestions" element={<AISuggestions />} />
      </Routes>
    </Layout>
  );
}

export default App;
