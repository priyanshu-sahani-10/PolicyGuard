import { useState } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import NewPrediction from "./pages/NewPrediction";
import History from "./pages/History";
import Model from "./pages/Model";
import usePredictionHistory from "./hooks/usePredictionHistory";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const { history, latest, stats, addPrediction, clearHistory } =
    usePredictionHistory();

  return (
    <div className="app">
      <Navbar current={page} onNavigate={setPage} />
      <main className="page">
        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            latest={latest}
            history={history}
            onNavigate={setPage}
          />
        )}
        {page === "new" && <NewPrediction onPrediction={addPrediction} />}
        {page === "analytics" && <Analytics />}
        {page === "history" && (
          <History history={history} onClear={clearHistory} onNavigate={setPage} />
        )}
        {page === "model" && <Model />}
      </main>
      <footer className="footer">
        <span>PolicyGuard · Internal insurance analytics tool</span>
      </footer>
    </div>
  );
}
