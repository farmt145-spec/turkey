import { Routes, Route } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Structure from "./pages/Structure";
import Production from "./pages/Production";
import BatchDetail from "./pages/BatchDetail";
import Transfers from "./pages/Transfers";
import Schedule from "./pages/Schedule";
import Feed from "./pages/Feed";
import Warehouse from "./pages/Warehouse";
import Health from "./pages/Health";
import Economics from "./pages/Economics";
import Erd from "./pages/Erd";
import Analytics from "./pages/Analytics";
import AiAdvisor from "./pages/AiAdvisor";
import Erp from "./pages/Erp";
import NutritionLab from "./pages/NutritionLab";
import CommandCenter from "./pages/CommandCenter";
import Editions from "./pages/Editions";
import Coverage from "./pages/Coverage";
import Integrations from "./pages/Integrations";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import DevAuthGate from "./components/DevAuthGate";

const L = (el: React.ReactNode) => <Layout>{el}</Layout>;

export default function App() {
  return (
    <DevAuthGate>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={L(<Dashboard />)} />
      <Route path="/centrum-decyzji" element={L(<CommandCenter />)} />
      <Route path="/struktura" element={L(<Structure />)} />
      <Route path="/produkcja" element={L(<Production />)} />
      <Route path="/produkcja/:id" element={L(<BatchDetail />)} />
      <Route path="/transfery" element={L(<Transfers />)} />
      <Route path="/harmonogram" element={L(<Schedule />)} />
      <Route path="/zywienie" element={L(<Feed />)} />
      <Route path="/laboratorium-zywienia" element={L(<NutritionLab />)} />
      <Route path="/magazyn" element={L(<Warehouse />)} />
      <Route path="/zdrowie" element={L(<Health />)} />
      <Route path="/ekonomia" element={L(<Economics />)} />
      <Route path="/analityka" element={L(<Analytics />)} />
      <Route path="/ai" element={L(<AiAdvisor />)} />
      <Route path="/erp/:module" element={L(<Erp />)} />
      <Route path="/erp" element={L(<Erp />)} />
      <Route path="/erd" element={L(<Erd />)} />
      <Route path="/wersje" element={L(<Editions />)} />
      <Route path="/raport-architektury" element={L(<Coverage />)} />
      <Route path="/integracje" element={L(<Integrations />)} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </DevAuthGate>
  );
}
