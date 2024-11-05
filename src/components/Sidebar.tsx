import React, { useState } from 'react';
import { LucideIcon, LogOut, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuClick = (id: string) => {
    onMenuClick(id);
    setIsMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg md:hidden z-[60]"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[45] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Update positioning and height */}
      <aside className={`
        fixed top-0 left-0 h-full z-[50]
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex items-center mb-8 px-2 pt-12 md:pt-4">
            <span className="text-2xl font-semibold text-gray-900 dark:text-white">DentaCare</span>
          </div>
          <ul className="space-y-2 font-medium">
            {menuItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => handleMenuClick(item.id)}
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
    </>
  );
}

export default Sidebar;