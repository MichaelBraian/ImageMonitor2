import React from 'react';
import { LucideIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  id: string;
}

interface SidebarProps {
  menuItems: MenuItem[];
  onMenuClick: (id: string) => void;
  currentView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ menuItems, onMenuClick, currentView }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-colors">
      <div className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="flex items-center mb-8 px-2">
          <span className="text-2xl font-semibold text-gray-900 dark:text-white">DentaCare</span>
        </div>
        <ul className="space-y-2 font-medium">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onMenuClick(item.id)}
                className={`flex w-full items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group transition-colors ${
                  currentView === item.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <item.icon className={`w-5 h-5 transition duration-75 ${
                  currentView === item.id 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`} />
                <span className={`ml-3 ${
                  currentView === item.id 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-700 dark:text-gray-400'
                }`}>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="flex w-full items-center p-2 text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 group transition-colors"
        >
          <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
          <span className="ml-3">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;