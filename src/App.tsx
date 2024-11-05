import React from 'react';
import { Users, Upload, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import PatientList from './components/PatientList';
import FileList from './components/FileList';
import Settings from './components/Settings';
import Auth from './components/Auth';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = React.useState('patients');

  const menuItems = [
    { icon: Users, label: 'Patients', href: '#patients', id: 'patients' },
    { icon: Upload, label: 'Files', href: '#files', id: 'files' },
    { icon: SettingsIcon, label: 'Settings', href: '#settings', id: 'settings' },
  ];

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="pt-16 md:pt-0 md:pl-64 min-h-screen">
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {currentView === 'patients' ? 'Patients' : 'Settings'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentView === 'patients' 
                ? 'Manage your patients and dental records efficiently'
                : 'Configure your account and application preferences'
              }
            </p>
          </div>
          <main>
            {currentView === 'patients' ? <PatientList /> : <Settings />}
          </main>
        </div>
      </div>
      <Sidebar
        menuItems={menuItems}
        onMenuClick={setCurrentView}
        currentView={currentView}
      />
    </div>
  );
}

export default App;