import { useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    let mounted = true;
    
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              *,
              social_links (platform, username),
              user_preferences (preferred_lobby, preferred_gender, preferred_country, is_vip)
            `)
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              *,
              social_links (platform, username),
              user_preferences (preferred_lobby, preferred_gender, preferred_country, is_vip)
            `)
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (provider: 'google' | 'discord') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateSocialLink = async (platform: string, username: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('social_links')
        .upsert({
          user_id: user.id,
          platform,
          username
        }, {
          onConflict: '(user_id, platform)'
        });

      if (error) throw error;

      // Refresh user data
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          *,
          social_links (platform, username),
          user_preferences (preferred_lobby, preferred_gender, preferred_country, is_vip)
        `)
        .eq('id', user.id)
        .single();

      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.error('Error updating social link:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    updateProfile,
    updateSocialLink
  };
} 