import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        // Sign up with email
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) throw signUpError;

        if (data?.user?.identities?.length === 0) {
          throw new Error('An account with this email already exists.');
        }

        if (data.user) {
          try {
            // Create initial profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: data.user.id,
                  email: data.user.email,
                  username: email.split('@')[0],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);

            if (profileError) {
              console.error('Error creating profile:', profileError);
              throw profileError;
            }
            
            setError('');
            handleSuccess();
          } catch (profileErr: any) {
            console.error('Profile creation error:', profileErr);
            setError(profileErr.message || 'Failed to complete signup. Please try again.');
          }
        }
      } else {
        // Sign in with email
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        if (data.user) {
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
            throw profileError;
          }

          // Create profile if it doesn't exist
          if (!profile) {
            const { error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: data.user.id,
                  email: data.user.email,
                  username: email.split('@')[0],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);

            if (createError) {
              console.error('Error creating profile:', createError);
              throw createError;
            }
          }

          handleSuccess();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    console.log('Auth success, calling onSuccess callback');
    onSuccess?.();
    onClose();
  };

  const handleLogin = async (provider: 'google' | 'discord') => {
    try {
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      handleSuccess();
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'An error occurred during social login');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1F2937] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/chatchill-logo.png" alt="ChatChill" className="h-8 w-8" />
            <h2 className="text-xl font-semibold text-white">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600"
                required
              />
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-400">
                  Password must be at least 6 characters
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-[#00FF85] hover:bg-[#00CC6A] text-black font-medium px-4 py-2 rounded-lg transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1F2937] text-gray-400">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={() => handleLogin('google')}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <button 
            onClick={() => handleLogin('discord')}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-3 rounded-lg font-medium transition-colors"
          >
            <img src="https://discord.com/assets/favicon.ico" alt="Discord" className="w-5 h-5" />
            Continue with Discord
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#00FF85] hover:text-[#00CC6A]"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 