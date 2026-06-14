import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [apiStatus, setApiStatus] = useState("checking...");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const status = await window.ipcRenderer.invoke("health:check");
        if (typeof status !== "string") {
          setApiStatus("unreachable");
          return;
        }
        setApiStatus(status);
      } catch {
        setApiStatus("unreachable");
      }
    };

    checkHealth();
  }, []);

  return (
    <main className="app-shell">
      <h1>Mentor AMP</h1>
      <p className="api-status">Mentor AMP API: {apiStatus}</p>
    </main>
  );
}

export default App;
