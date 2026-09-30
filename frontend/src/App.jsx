import ClaimForm from "./components/ClaimForm";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">PG</span>
          <span className="brand-name">PolicyGuard</span>
        </div>
        <p className="brand-sub">Insurance Claim Prediction</p>
        <nav className="side-nav">
          <span className="nav-item active">Predict</span>
          <a
            className="nav-item"
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
          >
            API Docs
          </a>
        </nav>
        <div className="side-info">
          <h3>How it works</h3>
          <ol>
            <li>Fill in vehicle &amp; customer details</li>
            <li>Click Predict Claim</li>
            <li>Review probability &amp; risk badge</li>
          </ol>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>PolicyGuard</h1>
            <p>Enter vehicle and customer information to estimate claim risk.</p>
          </div>
          <span className="status-pill">
            <span className="dot" />
            ML Service
          </span>
        </header>

        <main className="content">
          <ClaimForm />
        </main>

        <footer className="footer">
          PolicyGuard • Insurance Claim Prediction
        </footer>
      </div>
    </div>
  );
}
