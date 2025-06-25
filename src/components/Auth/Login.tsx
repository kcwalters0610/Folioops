import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Provide more user-friendly error messages
        if (error.message === 'Invalid login credentials') {
          setError('The email or password you entered is incorrect. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a few minutes before trying again.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-white/80 text-lg">Field Service Management</p>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-h2 text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary">Sign in to your account to continue</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-folioops p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-red-700 text-sm">{error}</span>
                  {error.includes('email or password you entered is incorrect') && (
                    <div className="mt-2 text-xs text-red-600">
                      <p>• Make sure your email address is spelled correctly</p>
                      <p>• Check that Caps Lock is not enabled</p>
                      <p>• Contact your administrator if you need account access</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-hover font-medium transition-colors">
                Contact your administrator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;