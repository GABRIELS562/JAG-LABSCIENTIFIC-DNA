import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PaternityTestForm from './components/forms/PaternityTestForm';
import HomePage from './components/ui/HomePage';
import ThemeToggle from './components/ui/ThemeToggle';
import Sidebar from './components/layout/Sidebar';
import Reports from './components/features/Reports';
import GenerateBatch from './components/features/GenerateBatch';
import SampleSearch from './components/features/SampleSearch';
import Statistics from './components/features/Statistics';
import QualityControl from './components/features/QualityControl';
import ClientRegister from './components/features/ClientRegister';
import PCRPlate from './components/features/PCRPlate';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';

function AppContent() {
  const { isDarkMode, toggleTheme } = useThemeContext();

  const mainBackground = isDarkMode
    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d]'
    : 'bg-gradient-to-br from-[#e6e9f0] to-[#eef1f5]';

  const containerBackground = isDarkMode
    ? 'bg-black/70'
    : 'bg-white/70';

  return (
    <Router>
      <div className={`flex h-screen w-screen ${mainBackground}`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <ThemeToggle onToggle={toggleTheme} isDarkMode={isDarkMode} />
          <Routes>
            <Route 
              path="/" 
              element={
                <div className={`min-h-screen w-full ${containerBackground} backdrop-blur-md`}>
                  <HomePage isDarkMode={isDarkMode} />
                </div>
              } 
            />
            <Route 
              path="/register-client" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PaternityTestForm />
                </div>
              } 
            />
            <Route 
              path="/client-register" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <ClientRegister />
                </div>
              } 
            />
            <Route 
              path="/pcr-plate" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <PCRPlate />
                </div>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <Reports />
                </div>
              } 
            />
            <Route 
              path="/generate-batch" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <GenerateBatch />
                </div>
              } 
            />
            <Route 
              path="/assign-lab-number" 
              element={
                <div className={`${containerBackground} min-h-screen p-3`}>
                  <div>Assign Lab Number Page</div>
                </div>
              } 
            />
            <Route path="/sample-search" element={<SampleSearch />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route 
              path="/quality-control" 
              element={
                <div className={`${containerBackground} min-h-screen`}>
                  <QualityControl />
                </div>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;