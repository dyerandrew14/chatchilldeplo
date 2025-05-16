import { createClient } from '@supabase/supabase-js';

// These values should come from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bhxszmhstoulrehfhftu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeHN6bWhzdG91bHJlaGZoZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyODAzMTgsImV4cCI6MjA2Mjg1NjMxOH0.7cqhwZtPxDOmW8KRgUtU9oQXcaopjkhKOCHIGRSFGQw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SocialLinks {
  discord?: string;
  snapchat?: string;
  instagram?: string;
  facebook?: string;
  steam?: string;
  phone?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  email?: string;
  social: SocialLinks;
  country?: string;
  is_vip?: boolean;
  subscription_date?: string;
  created_at?: string;
  updated_at?: string;
  discord?: string;
  snapchat?: string;
  instagram?: string;
  facebook?: string;
  steam?: string;
  phone?: string;
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
        .select('*')
        .eq('id', user.id)
        .single();
      
      return { user: { ...user, ...profile }, error };
    }
    return { user: null, error };
  }
};

// Profile management functions
export const profiles = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  async update(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  createOrUpdate: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  }
}; 