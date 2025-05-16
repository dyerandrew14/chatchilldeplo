import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabaseClient';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        setUser(user);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          // If profile doesn't exist, create one
          if (profileError.code === 'PGRST116') {
            const { error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  email: user.email,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ]);
            
            if (createError) throw createError;
          } else {
            throw profileError;
          }
        } else if (profile) {
          setBio(profile.bio || '');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          bio,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <div className="bg-[#1F2937] rounded-xl p-6 shadow-xl">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Email</label>
            <p className="text-gray-300">{user?.email}</p>
          </div>

          <div className="mb-6">
            <label htmlFor="bio" className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#374151] rounded-lg p-3 text-white"
              rows={4}
              placeholder="Tell others about yourself..."
            />
            <p className="text-sm text-gray-400 mt-2">
              Your bio will be shown briefly when connecting with other users.
            </p>
          </div>

          <button
            onClick={updateProfile}
            className="bg-[#00FF85] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#00FF85]/90 transition-colors"
          >
            Save Changes
          </button>
        </div>

        <button
          onClick={() => router.push('/')}
          className="mt-6 text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Chat
        </button>
      </div>
    </div>
  );
} 