import React, { useState } from 'react';
import { Bell, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header: React.FC = () => {
  const { profile } = useAuth();
  const { appearance, updateAppearance } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleSidebar = async () => {
    await updateAppearance({ sidebarCollapsed: !appearance.sidebarCollapsed });
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const closeNotifications = () => {
    setShowNotifications(false);
  };

  const handleNotificationClick = (notificationId: number) => {
    console.log('Notification clicked:', notificationId);
    // Here you would typically mark the notification as read
    // and potentially navigate to the relevant page
    closeNotifications();
  };

  const handleViewAllNotifications = () => {
    console.log('View all notifications clicked');
    // Here you would navigate to a dedicated notifications page
    closeNotifications();
  };

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: 'New Work Order Assigned',
      message: 'Work Order #WO-2024-0015 has been assigned to you',
      time: '5 minutes ago',
      type: 'work_order',
      unread: true,
    },
    {
      id: 2,
      title: 'Invoice Payment Received',
      message: 'Payment received for Invoice #INV-2024-0032',
      time: '1 hour ago',
      type: 'payment',
      unread: true,
    },
    {
      id: 3,
      title: 'Estimate Approved',
      message: 'Customer approved Estimate #EST-2024-0028',
      time: '2 hours ago',
      type: 'estimate',
      unread: true,
    },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-folioops transition-all duration-200"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className="relative p-2 text-text-secondary hover:text-primary hover:bg-gray-50 rounded-full transition-all duration-200"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-folioops-lg shadow-folioops-hover border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-primary">Notifications</h3>
                      <button
                        onClick={closeNotifications}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-folioops transition-colors duration-200"
                        aria-label="Close notifications"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 text-left ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.unread ? 'bg-accent' : 'bg-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-text-secondary mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <button 
                      onClick={handleViewAllNotifications}
                      className="w-full text-center text-sm text-accent hover:text-hover font-medium py-2 px-4 rounded-folioops hover:bg-gray-50 transition-colors duration-200"
                    >
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-folioops transition-all duration-200 cursor-pointer">
              <div className="text-right">
                <p className="text-sm font-medium text-primary">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-text-secondary capitalize">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay for notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40"
          onClick={closeNotifications}
        />
      )}
    </>
  );
};

export default Header;