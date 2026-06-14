import { useEffect, useState } from "react";
import { healthApi } from "./lib/api/healthApi";
import type { HealthResponse } from "./lib/api/types";
import "./App.css";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      setIsLoading(true);
      setError(null);

      const result = await healthApi.getHealth();
      if (result.ok) {
        setHealth(result.data);
      } else {
        setHealth(null);
        setError(result.error);
      }

      setIsLoading(false);
    };

    checkHealth();
  }, []);

  const apiMessage = isLoading
    ? "Mentor AMP API: loading"
    : error
      ? `Mentor AMP API: error (${error})`
      : `Mentor AMP API: ${health?.status ?? "unknown"}`;

  return (
    <main className="app-shell">
      <h1>Mentor AMP</h1>
      <p className="api-status">{apiMessage}</p>
    </main>
  );
}

export default App;
