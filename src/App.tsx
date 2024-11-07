import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Users, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import PatientList from './components/PatientList';
import Settings from './components/Settings';
import Auth from './components/Auth';
import ThemeToggle from './components/ThemeToggle';
import PatientDetails from './components/PatientDetails';

function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = React.useState('patients');

  const menuItems = [
    { icon: Users, label: 'Patients', href: '/patients', id: 'patients' },
    { icon: SettingsIcon, label: 'Settings', href: '/settings', id: 'settings' },
  ];

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="pt-16 md:pt-0 md:pl-64 min-h-screen">
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentView === 'patients' ? 'Patients' : 'Settings'}
              </h1>
              <ThemeToggle />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {currentView === 'patients' 
                ? 'Manage your patients and dental records efficiently'
                : 'Configure your account and application preferences'
              }
            </p>
            <main>
              <Routes>
                <Route path="/patients" element={<PatientList />} />
                <Route path="/patients/:id" element={<PatientDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Navigate to="/patients" replace />} />
              </Routes>
            </main>
          </div>
        </div>
        <Sidebar
          menuItems={menuItems}
          onMenuClick={setCurrentView}
          currentView={currentView}
        />
      </div>
    </Router>
  );
}

export default App;