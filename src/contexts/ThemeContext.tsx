import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  colorScheme: 'default' | 'blue' | 'green' | 'purple';
  fontSize: 'small' | 'medium' | 'large';
  layout: 'default' | 'compact' | 'spacious';
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showAnimations: boolean;
}

interface ThemeContextType {
  appearance: AppearanceSettings;
  updateAppearance: (settings: Partial<AppearanceSettings>) => Promise<void>;
  isDark: boolean;
}

const defaultAppearance: AppearanceSettings = {
  theme: 'light',
  colorScheme: 'default',
  fontSize: 'medium',
  layout: 'default',
  sidebarCollapsed: false,
  compactMode: false,
  showAnimations: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      loadAppearanceSettings();
    }
  }, [profile]);

  useEffect(() => {
    applyTheme();
  }, [appearance]);

  const loadAppearanceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', profile?.company_id)
        .single();

      if (error) throw error;

      const savedAppearance = data?.settings?.appearance;
      if (savedAppearance) {
        setAppearance({ ...defaultAppearance, ...savedAppearance });
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
    }
  };

  const updateAppearance = async (newSettings: Partial<AppearanceSettings>) => {
    try {
      const updatedAppearance = { ...appearance, ...newSettings };
      setAppearance(updatedAppearance);

      // Get current company settings
      const { data: companyData, error: fetchError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', profile?.company_id)
        .single();

      if (fetchError) throw fetchError;

      const currentSettings = companyData?.settings || {};
      
      // Update with new appearance settings
      const updatedSettings = {
        ...currentSettings,
        appearance: updatedAppearance,
      };

      const { error: updateError } = await supabase
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', profile?.company_id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating appearance settings:', error);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Apply theme (dark/light)
    let shouldBeDark = appearance.theme === 'dark';
    if (appearance.theme === 'auto') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    setIsDark(shouldBeDark);
    
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply color scheme
    root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple');
    root.classList.add(`theme-${appearance.colorScheme}`);

    // Apply font size
    root.classList.remove('text-small', 'text-medium', 'text-large');
    root.classList.add(`text-${appearance.fontSize}`);

    // Apply layout
    root.classList.remove('layout-default', 'layout-compact', 'layout-spacious');
    root.classList.add(`layout-${appearance.layout}`);

    // Apply animations
    if (!appearance.showAnimations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  };

  // Listen for system theme changes
  useEffect(() => {
    if (appearance.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance.theme]);

  const value = {
    appearance,
    updateAppearance,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};