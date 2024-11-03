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

  const renderView = () => {
    switch (currentView) {
      case 'settings':
        return <Settings />;
      case 'files':
        return <FileList />;
      default:
        return <PatientList />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar 
        menuItems={menuItems} 
        onMenuClick={(id) => setCurrentView(id)}
        currentView={currentView}
      />
      <main className="flex-1 overflow-auto p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentView === 'patients'
                ? 'Manage your patients and dental records efficiently'
                : currentView === 'files'
                ? 'View and manage all dental files and records'
                : 'Configure your account and application preferences'}
            </p>
          </div>
          <ThemeToggle />
        </header>
        {renderView()}
      </main>
    </div>
  );
}

export default App;