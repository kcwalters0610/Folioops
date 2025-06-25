import React, { useState, useEffect } from 'react';
import { Save, Building, User, Bell, Shield, Palette, Database, Hash } from 'lucide-react';
import { supabase, Company } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Settings: React.FC = () => {
  const { profile } = useAuth();
  const { appearance, updateAppearance } = useTheme();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  
  const [companyData, setCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    industry: '',
    subscription_plan: '',
  });

  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    work_order_updates: true,
    invoice_reminders: true,
    system_updates: false,
  });

  const [numberingSettings, setNumberingSettings] = useState({
    work_order_prefix: 'WO',
    work_order_format: 'WO-{YYYY}-{####}',
    work_order_next_number: 1,
    purchase_order_prefix: 'PO',
    purchase_order_format: 'PO-{YYYY}-{####}',
    purchase_order_next_number: 1,
    estimate_prefix: 'EST',
    estimate_format: 'EST-{YYYY}-{####}',
    estimate_next_number: 1,
    invoice_prefix: 'INV',
    invoice_format: 'INV-{YYYY}-{####}',
    invoice_next_number: 1,
  });

  // Local state for appearance settings to allow changes before saving
  const [localAppearance, setLocalAppearance] = useState(appearance);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompanyData();
    }
  }, [profile]);

  // Update local appearance when global appearance changes
  useEffect(() => {
    setLocalAppearance(appearance);
  }, [appearance]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile?.company_id)
        .single();

      if (error) throw error;
      
      setCompany(data);
      setCompanyData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip_code: data.zip_code || '',
        industry: data.industry || '',
        subscription_plan: data.subscription_plan || '',
      });

      // Load numbering settings from company settings
      if (data.settings?.numbering) {
        setNumberingSettings({
          ...numberingSettings,
          ...data.settings.numbering,
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', profile?.company_id);

      if (error) throw error;
      alert('Company settings saved successfully!');
    } catch (error) {
      console.error('Error saving company data:', error);
      alert('Error saving company settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', profile?.id);

      if (error) throw error;
      alert('Profile settings saved successfully!');
    } catch (error) {
      console.error('Error saving profile data:', error);
      alert('Error saving profile settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNumbering = async () => {
    setLoading(true);
    try {
      // Get current company settings
      const currentSettings = company?.settings || {};
      
      // Update with new numbering settings
      const updatedSettings = {
        ...currentSettings,
        numbering: numberingSettings,
      };

      const { error } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', profile?.company_id);

      if (error) throw error;
      alert('Document numbering settings saved successfully!');
    } catch (error) {
      console.error('Error saving numbering settings:', error);
      alert('Error saving numbering settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppearance = async () => {
    setLoading(true);
    try {
      await updateAppearance(localAppearance);
      alert('Appearance settings saved successfully!');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      alert('Error saving appearance settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = (format: string, nextNumber: number) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentDay = String(new Date().getDate()).padStart(2, '0');
    
    return format
      .replace('{YYYY}', currentYear.toString())
      .replace('{YY}', currentYear.toString().slice(-2))
      .replace('{MM}', currentMonth)
      .replace('{DD}', currentDay)
      .replace('{####}', nextNumber.toString().padStart(4, '0'))
      .replace('{###}', nextNumber.toString().padStart(3, '0'))
      .replace('{##}', nextNumber.toString().padStart(2, '0'));
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'numbering', label: 'Document Numbering', icon: Hash },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Privacy', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account and company preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-folioops transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-text-primary hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card p-8">
            {activeTab === 'company' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-h2 text-primary mb-2">Company Information</h2>
                  <p className="text-text-secondary">Update your company details and business information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Industry
                    </label>
                    <select
                      value={companyData.industry}
                      onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                      className="input-field"
                    >
                      <option value="HVAC">HVAC</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="General Maintenance">General Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={companyData.address}
                    onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={companyData.state}
                      onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={companyData.zip_code}
                      onChange={(e) => setCompanyData({ ...companyData, zip_code: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Subscription Plan
                  </label>
                  <select
                    value={companyData.subscription_plan}
                    onChange={(e) => setCompanyData({ ...companyData, subscription_plan: e.target.value })}
                    className="input-field"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveCompany}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-h2 text-primary mb-2">Personal Information</h2>
                  <p className="text-text-secondary">Update your personal details and contact information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input-field"
                    disabled
                  />
                  <p className="text-xs text-text-secondary mt-1">Email cannot be changed from this interface</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'numbering' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-h2 text-primary mb-2">Document Numbering</h2>
                  <p className="text-text-secondary">Customize how your documents are numbered</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-folioops p-4 mb-6">
                  <h3 className="font-medium text-blue-800 mb-2">Format Variables</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><code className="bg-blue-100 px-1 rounded">{'{YYYY}'}</code> - Full year (2024)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{YY}'}</code> - Short year (24)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{MM}'}</code> - Month (01-12)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{DD}'}</code> - Day (01-31)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{####}'}</code> - 4-digit number (0001)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{###}'}</code> - 3-digit number (001)</p>
                    <p><code className="bg-blue-100 px-1 rounded">{'{##}'}</code> - 2-digit number (01)</p>
                  </div>
                </div>

                {/* Work Orders */}
                <div className="border border-gray-200 rounded-folioops p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Work Orders</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.work_order_prefix}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, work_order_prefix: e.target.value })}
                        className="input-field"
                        placeholder="WO"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Format
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.work_order_format}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, work_order_format: e.target.value })}
                        className="input-field"
                        placeholder="WO-{YYYY}-{####}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Next Number
                      </label>
                      <input
                        type="number"
                        value={numberingSettings.work_order_next_number}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, work_order_next_number: parseInt(e.target.value) || 1 })}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-folioops">
                    <span className="text-sm text-gray-600">Preview: </span>
                    <span className="font-mono font-semibold text-primary">
                      {generatePreview(numberingSettings.work_order_format, numberingSettings.work_order_next_number)}
                    </span>
                  </div>
                </div>

                {/* Purchase Orders */}
                <div className="border border-gray-200 rounded-folioops p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Purchase Orders</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.purchase_order_prefix}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, purchase_order_prefix: e.target.value })}
                        className="input-field"
                        placeholder="PO"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Format
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.purchase_order_format}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, purchase_order_format: e.target.value })}
                        className="input-field"
                        placeholder="PO-{YYYY}-{####}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Next Number
                      </label>
                      <input
                        type="number"
                        value={numberingSettings.purchase_order_next_number}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, purchase_order_next_number: parseInt(e.target.value) || 1 })}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-folioops">
                    <span className="text-sm text-gray-600">Preview: </span>
                    <span className="font-mono font-semibold text-primary">
                      {generatePreview(numberingSettings.purchase_order_format, numberingSettings.purchase_order_next_number)}
                    </span>
                  </div>
                </div>

                {/* Estimates */}
                <div className="border border-gray-200 rounded-folioops p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Estimates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.estimate_prefix}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, estimate_prefix: e.target.value })}
                        className="input-field"
                        placeholder="EST"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Format
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.estimate_format}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, estimate_format: e.target.value })}
                        className="input-field"
                        placeholder="EST-{YYYY}-{####}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Next Number
                      </label>
                      <input
                        type="number"
                        value={numberingSettings.estimate_next_number}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, estimate_next_number: parseInt(e.target.value) || 1 })}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-folioops">
                    <span className="text-sm text-gray-600">Preview: </span>
                    <span className="font-mono font-semibold text-primary">
                      {generatePreview(numberingSettings.estimate_format, numberingSettings.estimate_next_number)}
                    </span>
                  </div>
                </div>

                {/* Invoices */}
                <div className="border border-gray-200 rounded-folioops p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">Invoices</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Prefix
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.invoice_prefix}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, invoice_prefix: e.target.value })}
                        className="input-field"
                        placeholder="INV"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Format
                      </label>
                      <input
                        type="text"
                        value={numberingSettings.invoice_format}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, invoice_format: e.target.value })}
                        className="input-field"
                        placeholder="INV-{YYYY}-{####}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Next Number
                      </label>
                      <input
                        type="number"
                        value={numberingSettings.invoice_next_number}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, invoice_next_number: parseInt(e.target.value) || 1 })}
                        className="input-field"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-folioops">
                    <span className="text-sm text-gray-600">Preview: </span>
                    <span className="font-mono font-semibold text-primary">
                      {generatePreview(numberingSettings.invoice_format, numberingSettings.invoice_next_number)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNumbering}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Numbering Settings'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-h2 text-primary mb-2">Appearance Settings</h2>
                  <p className="text-text-secondary">Customize the look and feel of your interface</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Theme
                      </label>
                      <select
                        value={localAppearance.theme}
                        onChange={(e) => setLocalAppearance({ ...localAppearance, theme: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Color Scheme
                      </label>
                      <select
                        value={localAppearance.colorScheme}
                        onChange={(e) => setLocalAppearance({ ...localAppearance, colorScheme: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="default">Default (Teal)</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Font Size
                      </label>
                      <select
                        value={localAppearance.fontSize}
                        onChange={(e) => setLocalAppearance({ ...localAppearance, fontSize: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Layout Spacing
                      </label>
                      <select
                        value={localAppearance.layout}
                        onChange={(e) => setLocalAppearance({ ...localAppearance, layout: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="default">Default</option>
                        <option value="compact">Compact</option>
                        <option value="spacious">Spacious</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                      <div>
                        <h3 className="font-medium text-primary">Sidebar Collapsed</h3>
                        <p className="text-sm text-text-secondary">Keep the sidebar collapsed by default</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localAppearance.sidebarCollapsed}
                          onChange={(e) => setLocalAppearance({ ...localAppearance, sidebarCollapsed: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                      <div>
                        <h3 className="font-medium text-primary">Compact Mode</h3>
                        <p className="text-sm text-text-secondary">Use a more compact interface layout</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localAppearance.compactMode}
                          onChange={(e) => setLocalAppearance({ ...localAppearance, compactMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                      <div>
                        <h3 className="font-medium text-primary">Show Animations</h3>
                        <p className="text-sm text-text-secondary">Enable smooth transitions and animations</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localAppearance.showAnimations}
                          onChange={(e) => setLocalAppearance({ ...localAppearance, showAnimations: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAppearance}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Appearance Settings'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-h2 text-primary mb-2">Notification Preferences</h2>
                  <p className="text-text-secondary">Choose how you want to be notified about important updates</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                    <div>
                      <h3 className="font-medium text-primary">Email Notifications</h3>
                      <p className="text-sm text-text-secondary">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.email_notifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                    <div>
                      <h3 className="font-medium text-primary">SMS Notifications</h3>
                      <p className="text-sm text-text-secondary">Receive notifications via text message</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.sms_notifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, sms_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                    <div>
                      <h3 className="font-medium text-primary">Work Order Updates</h3>
                      <p className="text-sm text-text-secondary">Get notified when work orders are updated</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.work_order_updates}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, work_order_updates: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-folioops">
                    <div>
                      <h3 className="font-medium text-primary">Invoice Reminders</h3>
                      <p className="text-sm text-text-secondary">Receive reminders about overdue invoices</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.invoice_reminders}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, invoice_reminders: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'security' || activeTab === 'data') && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'security' && <Shield className="h-8 w-8 text-gray-400" />}
                  {activeTab === 'data' && <Database className="h-8 w-8 text-gray-400" />}
                </div>
                <h3 className="text-lg font-medium text-primary mb-2">
                  {activeTab === 'security' && 'Security Settings'}
                  {activeTab === 'data' && 'Data & Privacy Settings'}
                </h3>
                <p className="text-text-secondary">
                  This section is coming soon. We're working on adding more customization options.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;