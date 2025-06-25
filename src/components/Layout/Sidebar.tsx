import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  ClipboardList,
  ShoppingCart,
  FileText,
  Calculator,
  BarChart3,
  Settings,
  LogOut,
  Wrench,
  UserPlus,
  Target,
  MessageSquare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { profile, signOut, hasRole } = useAuth();
  const { appearance, updateAppearance } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(appearance.sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [dashboardExpanded, setDashboardExpanded] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with theme context
  useEffect(() => {
    setIsCollapsed(appearance.sidebarCollapsed);
  }, [appearance.sidebarCollapsed]);

  // Auto-expand dashboard menu if we're on a dashboard page
  useEffect(() => {
    if (location.pathname === '/dashboard' || location.pathname === '/interactive-dashboard') {
      setDashboardExpanded(true);
    }
  }, [location.pathname]);

  const toggleSidebar = async () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // Update the theme context to persist the setting
    await updateAppearance({ sidebarCollapsed: newCollapsed });
  };

  const toggleDashboardMenu = () => {
    if (!isCollapsed || isMobile) {
      setDashboardExpanded(!dashboardExpanded);
    }
  };

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/dashboard', 
      roles: ['admin', 'manager', 'tech'],
      hasSubmenu: true,
      subItems: [
        { icon: LayoutDashboard, label: 'Overview', path: '/dashboard', roles: ['admin', 'manager', 'tech'] },
        { icon: Activity, label: 'Interactive Dashboard', path: '/interactive-dashboard', roles: ['admin', 'manager'] },
      ]
    },
    { icon: Wrench, label: 'My Jobs', path: '/my-jobs', roles: ['tech'] },
    { 
      icon: TrendingUp, 
      label: 'CRM', 
      path: '/crm', 
      roles: ['admin', 'manager'],
      subItems: [
        { icon: Target, label: 'CRM Dashboard', path: '/crm', roles: ['admin', 'manager'] },
        { icon: UserPlus, label: 'Leads', path: '/crm/leads', roles: ['admin', 'manager'] },
        { icon: Target, label: 'Opportunities', path: '/crm/opportunities', roles: ['admin', 'manager'] },
        { icon: MessageSquare, label: 'Communications', path: '/crm/communications', roles: ['admin', 'manager'] },
      ]
    },
    { icon: Users, label: 'Customers', path: '/customers', roles: ['admin', 'manager', 'tech'] },
    { icon: Truck, label: 'Vendors', path: '/vendors', roles: ['admin', 'manager', 'tech'] },
    { icon: ClipboardList, label: 'Work Orders', path: '/work-orders', roles: ['admin', 'manager', 'tech'] },
    { icon: ShoppingCart, label: 'Purchase Orders', path: '/purchase-orders', roles: ['admin', 'manager', 'tech'] },
    { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['admin', 'manager'] },
    { icon: Calculator, label: 'Estimates', path: '/estimates', roles: ['admin', 'manager', 'tech'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
    { icon: Users, label: 'Employees', path: '/employees', roles: ['admin', 'manager'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin'] },
  ];

  const isActive = (path: string) => {
    if (path === '/crm') {
      return location.pathname.startsWith('/crm');
    }
    return location.pathname === path;
  };

  const isSubItemActive = (path: string) => location.pathname === path;

  const isDashboardActive = () => {
    return location.pathname === '/dashboard' || location.pathname === '/interactive-dashboard';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed' : 'relative'} 
        ${isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'}
        ${isCollapsed && !isMobile ? 'w-20' : 'w-64'}
        bg-white border-r border-gray-200 min-h-screen flex flex-col transition-all duration-300 ease-in-out z-50
      `}>
        {/* Logo and Toggle */}
        <div className={`p-6 border-b border-gray-200 ${isCollapsed && !isMobile ? 'px-4' : ''}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-2 ${isCollapsed && !isMobile ? 'justify-center' : ''}`}>
              <div className="w-12 h-12 bg-white rounded-folioops flex items-center justify-center shadow-folioops flex-shrink-0">
                <img 
                  src="/ChatGPT Image Jun 24, 2025, 12_18_24 PM.png" 
                  alt="Folioops Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="flex-1 min-w-0">
                  <img 
                    src="/Stylized 'Folioops' Logo With Vibrant Colors On White Background (1) copy copy copy.png" 
                    alt="Folioops" 
                    className="h-8 object-contain"
                  />
                </div>
              )}
            </div>
            
            {/* Toggle button */}
            <button
              onClick={toggleSidebar}
              className={`
                p-2 rounded-folioops hover:bg-gray-100 transition-colors duration-200
                ${isCollapsed && !isMobile ? 'absolute -right-3 top-6 bg-white border border-gray-200 shadow-sm' : ''}
                ${isMobile ? 'lg:hidden' : ''}
              `}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isMobile ? (
                <Menu className="h-5 w-5 text-gray-600" />
              ) : isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
          {menuItems
            .filter(item => hasRole(item.roles))
            .map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = isActive(item.path);
              const isDashboard = item.label === 'Dashboard';
              const showExpanded = isDashboard ? dashboardExpanded : isItemActive;
              
              return (
                <div key={item.path}>
                  {/* Main menu item */}
                  {isDashboard ? (
                    <button
                      onClick={toggleDashboardMenu}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-folioops transition-all duration-200 group relative
                        ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}
                        ${isDashboardActive()
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-text-primary hover:bg-gray-50 hover:text-primary'
                        }
                      `}
                      title={isCollapsed && !isMobile ? item.label : ''}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {(!isCollapsed || isMobile) && (
                        <>
                          <span className="font-medium truncate flex-1 text-left">{item.label}</span>
                          {hasSubItems && (
                            <div className="ml-auto">
                              {showExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && !isMobile && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-folioops opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.label}
                          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-folioops transition-all duration-200 group relative
                        ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}
                        ${isItemActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-text-primary hover:bg-gray-50 hover:text-primary'
                        }
                      `}
                      title={isCollapsed && !isMobile ? item.label : ''}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {(!isCollapsed || isMobile) && (
                        <span className="font-medium truncate">{item.label}</span>
                      )}
                      
                      {/* Tooltip for collapsed state */}
                      {isCollapsed && !isMobile && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-folioops opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.label}
                          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      )}
                    </Link>
                  )}
                  
                  {/* Sub-items */}
                  {hasSubItems && showExpanded && (!isCollapsed || isMobile) && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.subItems!
                        .filter(subItem => hasRole(subItem.roles))
                        .map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              className={`flex items-center space-x-3 px-4 py-2 rounded-folioops transition-all duration-200 text-sm ${
                                isSubItemActive(subItem.path)
                                  ? 'bg-accent text-white'
                                  : 'text-text-secondary hover:bg-gray-50 hover:text-primary'
                              }`}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span className="font-medium">{subItem.label}</span>
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>

        {/* User info and logout */}
        <div className={`p-4 border-t border-gray-200 ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-folioops">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-text-secondary capitalize">{profile?.role}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={signOut}
            className={`
              w-full flex items-center space-x-3 px-4 py-2 text-text-primary hover:bg-gray-50 hover:text-primary rounded-folioops transition-all duration-200 group relative
              ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}
            `}
            title={isCollapsed && !isMobile ? 'Sign out' : ''}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {(!isCollapsed || isMobile) && (
              <span className="font-medium">Sign out</span>
            )}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && !isMobile && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-folioops opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                Sign out
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;