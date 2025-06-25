import React, { useState, useEffect } from 'react';
import { User, Building, Mail, UserCheck, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileSetupProps {
  user: any;
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    companyEmail: '',
    industry: 'HVAC',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [authDebug, setAuthDebug] = useState<any>(null);
  const [checkingExistingProfile, setCheckingExistingProfile] = useState(true);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  // Quick check for existing profile
  useEffect(() => {
    let mounted = true;

    const checkForExistingProfile = async () => {
      try {
        console.log('🔍 Quick profile check...');
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !currentUser) {
          console.error('❌ Could not get current user:', userError);
          if (mounted) setCheckingExistingProfile(false);
          return;
        }

        // Quick profile check with timeout
        const profileCheck = supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', currentUser.id)
          .single();

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile check timeout')), 2000)
        );

        const { data: profileData, error: profileError } = await Promise.race([
          profileCheck,
          timeout
        ]) as any;

        if (profileError) {
          console.log('📝 No existing profile found');
          if (mounted) setCheckingExistingProfile(false);
        } else if (profileData) {
          console.log('✅ Found existing profile');
          if (mounted) {
            setExistingProfile(profileData);
            setTimeout(() => {
              if (mounted) onComplete();
            }, 100);
          }
        } else {
          if (mounted) setCheckingExistingProfile(false);
        }
      } catch (err) {
        console.log('⚠️ Profile check failed, proceeding with setup');
        if (mounted) setCheckingExistingProfile(false);
      }
    };

    if (user?.id) {
      checkForExistingProfile();
    } else {
      setCheckingExistingProfile(false);
    }

    return () => {
      mounted = false;
    };
  }, [user, onComplete]);

  // Check auth state
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        const debugData = {
          providedUser: { id: user?.id, email: user?.email },
          currentUser: { id: currentUser?.id, email: currentUser?.email },
          match: user?.id === currentUser?.id,
          timestamp: new Date().toISOString()
        };
        
        setAuthDebug(debugData);
        
        if (user?.id !== currentUser?.id) {
          setError('Authentication mismatch detected. Please sign out and sign back in.');
          setDebugInfo(`User ID Mismatch:\nProvided: ${user?.id}\nActual: ${currentUser?.id}`);
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
      }
    };
    
    if (user?.id) {
      checkAuthState();
    }
  }, [user]);

  const handleRefreshAuth = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        setError('Failed to refresh authentication. Please sign out and sign back in.');
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to refresh authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo('');

    try {
      const { data: { user: actualUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !actualUser) {
        throw new Error('No authenticated user found. Please sign in again.');
      }
      
      console.log('🚀 Creating profile...');
      
      const userIdToUse = actualUser.id;
      const emailToUse = actualUser.email || user.email;

      // Quick check if profile already exists
      const { data: existingCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userIdToUse)
        .single();

      if (existingCheck) {
        console.log('✅ Profile already exists');
        onComplete();
        return;
      }

      // Use the debug function with timeout
      const functionCall = supabase.rpc('create_user_profile_with_debug', {
        user_id: userIdToUse,
        user_email: emailToUse,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName,
        company_email: formData.companyEmail,
        industry: formData.industry
      });

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile creation timeout')), 10000)
      );

      const { data: functionResult, error: functionError } = await Promise.race([
        functionCall,
        timeout
      ]) as any;

      if (functionError) {
        throw functionError;
      }

      if (functionResult && !functionResult.success) {
        if (functionResult.error?.includes('duplicate key')) {
          console.log('✅ Profile already exists (duplicate key)');
          onComplete();
          return;
        }
        throw new Error(functionResult.error || 'Profile creation failed');
      }

      console.log('✅ Profile created successfully');
      
      // Brief wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();

    } catch (err: any) {
      console.error('💥 Profile setup error:', err);
      
      if (err.message?.includes('duplicate key')) {
        onComplete();
        return;
      }
      
      let errorMessage = 'Failed to set up profile. ';
      if (err.message?.includes('timeout')) {
        errorMessage += 'The request timed out. Please try again.';
      } else if (err.message?.includes('permission')) {
        errorMessage += 'Permission denied. Please check your account status.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      setDebugInfo(`Error: ${err.message}\nCode: ${err.code || 'N/A'}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking
  if (checkingExistingProfile) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Checking your profile...</p>
        </div>
      </div>
    );
  }

  // Show success if profile exists
  if (existingProfile) {
    return (
      <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-white/80 text-lg mb-4">Redirecting to dashboard...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-folioops flex items-center justify-center shadow-folioops">
              <img 
                src="/ChatGPT Image Jun 24, 2025, 12_18_24 PM.png" 
                alt="Folioops Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <div className="mb-4">
            <img 
              src="/Stylized 'Folioops' Logo With Vibrant Colors On White Background (1) copy copy copy.png" 
              alt="Folioops" 
              className="h-12 mx-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome!</h1>
          <p className="text-white/80 text-lg">Let's set up your profile</p>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-h2 text-primary mb-2">Profile Setup</h2>
            <p className="text-text-secondary">Complete your profile to get started</p>
          </div>

          {/* Auth Debug Warning */}
          {authDebug && !authDebug.match && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-folioops p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-yellow-700 text-sm font-medium">Authentication Issue</span>
                  <p className="text-yellow-600 text-sm mt-1">
                    Please refresh your authentication.
                  </p>
                  <button
                    onClick={handleRefreshAuth}
                    className="mt-2 flex items-center space-x-2 text-yellow-700 hover:text-yellow-800 text-sm font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Authentication</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-folioops p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-red-700 text-sm font-medium">Setup Failed</span>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    {debugInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-500 cursor-pointer">Debug Info</summary>
                        <pre className="text-xs text-red-500 mt-1 whitespace-pre-wrap bg-red-100 p-2 rounded">
                          {debugInfo}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field pl-10"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-field"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Company Name *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="input-field pl-10"
                  placeholder="ACME HVAC Services"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Company Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  className="input-field pl-10"
                  placeholder="info@acmehvac.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="input-field"
              >
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="General Maintenance">General Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Setting up...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          {authDebug && (
            <div className="mt-6 p-4 bg-gray-50 rounded-folioops">
              <p className="text-xs text-text-secondary">
                <strong>User Match:</strong> {authDebug.match ? '✅ Yes' : '❌ No'}<br />
                <strong>Email:</strong> {user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;