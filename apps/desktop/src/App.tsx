import { useEffect, useState } from "react";
import { systemStatusApi } from "./lib/api/systemStatusApi";
import type { SystemStatusResponse } from "./lib/api/types";
import "./App.css";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSystemStatus = async () => {
      setIsLoading(true);
      setError(null);

      const result = await systemStatusApi.getSystemStatus();
      if (result.ok) {
        setStatus(result.data);
      } else {
        setStatus(null);
        setError(result.error);
      }

      setIsLoading(false);
    };

    checkSystemStatus();
  }, []);

  return (
    <main className="app-shell">
      <h1>Mentor AMP</h1>

      {isLoading && <p className="status-message">Loading system status...</p>}

      {!isLoading && error && (
        <p className="status-message error">Unable to load status: {error}</p>
      )}

      {!isLoading && !error && status && (
        <section className="status-grid" aria-label="System status">
          <article className="status-card">
            <h2>API Status</h2>
            <p>{status.api.status === "ok" ? "Online" : "Offline"}</p>
          </article>
          <article className="status-card">
            <h2>Database Status</h2>
            <p>
              {status.database.status === "connected"
                ? "Connected"
                : "Not connected"}
            </p>
          </article>
          <article className="status-card">
            <h2>App Version</h2>
            <p>{status.api.version}</p>
          </article>
          <article className="status-card">
            <h2>Environment</h2>
            <p>{status.app.environment}</p>
          </article>
        </section>
      )}
    </main>
  );
}

export default App;
