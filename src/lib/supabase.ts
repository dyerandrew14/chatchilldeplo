import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhxszmhstoulrehfhftu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeHN6bWhzdG91bHJlaGZoZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyODAzMTgsImV4cCI6MjA2Mjg1NjMxOH0.7cqhwZtPxDOmW8KRgUtU9oQXcaopjkhKOCHIGRSFGQw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  country?: string;
  gender?: string;
  social_links?: SocialLink[];
  preferences?: UserPreferences;
}

export interface SocialLink {
  platform: string;
  username: string;
}

export interface UserPreferences {
  preferred_lobby: string;
  preferred_gender?: string;
  preferred_country?: string;
  is_vip: boolean;
}

// Auth helper functions
export const auth = {
  signIn: async (provider: 'google' | 'discord') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          *,
          social_links (*),
          preferences (*)
        `)
        .eq('id', user.id)
        .single();
      
      return { user: { ...user, ...profile }, error };
    }
    return { user: null, error };
  }
};

// Profile management functions
export const profiles = {
  update: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .single();
    return { data, error };
  },

  updateSocialLinks: async (userId: string, platform: string, username: string) => {
    const { data, error } = await supabase
      .from('social_links')
      .upsert({
        user_id: userId,
        platform,
        username
      }, {
        onConflict: '(user_id, platform)'
      });
    return { data, error };
  },

  updatePreferences: async (userId: string, preferences: Partial<UserPreferences>) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });
    return { data, error };
  }
}; 