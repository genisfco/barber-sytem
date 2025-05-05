import * as Sentry from "@sentry/react";

// Inicialização do Sentry (coloque seu DSN)
Sentry.init({
  dsn: "https://5a93f3af8bf48d23a03b4932fdae8c9c@o4509272927961088.ingest.us.sentry.io/4509272933466112",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Renderização do React
createRoot(document.getElementById("root")!).render(<App />);


