import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RepositoryProvider } from './hooks/useRepository';
import { LandingPage } from './pages/LandingPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { AssistantPage } from './pages/AssistantPage';
import { SearchPage } from './pages/SearchPage';
import { GraphPage } from './pages/GraphPage';
import { ImpactPage } from './pages/ImpactPage';
import { BugInvestigatorPage } from './pages/BugInvestigatorPage';
import { GeneratorsPage } from './pages/GeneratorsPage';
import { SecurityPage } from './pages/SecurityPage';
import { HealthPage } from './pages/HealthPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <RepositoryProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Core Dashboard Workspace */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/bugs" element={<BugInvestigatorPage />} />
            <Route path="/tests" element={<GeneratorsPage />} />
            <Route path="/docs" element={<GeneratorsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RepositoryProvider>
    </BrowserRouter>
  );
};

export default App;
