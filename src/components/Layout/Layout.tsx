import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { appearance } = useTheme();
  const isCollapsed = appearance.sidebarCollapsed;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto section-padding">
          <div className="container-width">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;