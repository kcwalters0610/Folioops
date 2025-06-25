import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signOut: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        
        // Get session with a shorter timeout
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }, error: any }>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 5000)
          )
        ]);
        
        if (error) {
          console.warn('⚠️ Session error:', error.message);
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log('📋 Session status:', session ? 'Found' : 'None');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }

        if (session?.user && mounted) {
          console.log('👤 User found, fetching profile...');
          await fetchProfile(session.user.id);
        } else if (mounted) {
          console.log('🚫 No user session');
          setLoading(false);
        }

      } catch (error) {
        console.warn('⚠️ Auth initialization error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile...');
      
      // Use a single optimized query with timeout
      const profilePromise = supabase
        .from('profiles')
        .select(`
          *,
          companies (
            id,
            name,
            industry
          )
        `)
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      );

      const { data: profileData, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.warn('⚠️ Profile fetch error:', error.message);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.log('📝 No profile found');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile loaded successfully');
      setProfile(profileData);
      
    } catch (error) {
      console.warn('⚠️ Profile fetch failed:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Signing in...');
    setLoading(true);
    
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      console.log('🔐 Sign in result:', result.error ? 'Error' : 'Success');
      return result;
    } catch (error) {
      console.error('💥 Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { data, error };

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          company_id: userData.companyId,
          role: userData.role || 'tech',
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return { data, error };
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } finally {
      // Auth state change handler will set loading to false
    }
  };

  const hasRole = (roles: string[]) => {
    return profile ? roles.includes(profile.role) : false;
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};