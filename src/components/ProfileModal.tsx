import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExtendedProfile {
  id: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  discord?: string;
  snapchat?: string;
  instagram?: string;
  youtube?: string;
  spotify?: string;
  soundcloud?: string;
  facebook?: string;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(updates: Partial<ExtendedProfile>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
      setTimeout(() => setError(null), 3000);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload avatar');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1F2937]/80 rounded-lg p-6 w-[600px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Your Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ← Back to Chat
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-500">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-700/50 border-2 border-[#00FF85]">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Photo
                </div>
              )}
            </div>
            <label className="cursor-pointer bg-[#00FF85] hover:bg-[#00CC6A] text-black font-medium px-4 py-2 rounded-lg transition-colors">
              {uploading ? 'Uploading...' : 'Upload Photo'}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="px-4 py-2 bg-gray-700/50 text-white rounded-lg">
                {profile?.email || ''}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
              <textarea
                value={profile?.bio || ''}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50 h-24 resize-none"
                placeholder="Tell others about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
              <input
                type="text"
                value={profile?.country || ''}
                onChange={(e) => updateProfile({ country: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                placeholder="Your country"
              />
            </div>
          </div>

          {/* Social Media Links */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Social Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-discord mr-2"></i>Discord
                </label>
                <input
                  type="text"
                  value={profile?.discord || ''}
                  onChange={(e) => updateProfile({ discord: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="Discord username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-snapchat mr-2"></i>Snapchat
                </label>
                <input
                  type="text"
                  value={profile?.snapchat || ''}
                  onChange={(e) => updateProfile({ snapchat: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="Snapchat username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-instagram mr-2"></i>Instagram
                </label>
                <input
                  type="text"
                  value={profile?.instagram || ''}
                  onChange={(e) => updateProfile({ instagram: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="Instagram username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-youtube mr-2"></i>YouTube
                </label>
                <input
                  type="text"
                  value={profile?.youtube || ''}
                  onChange={(e) => updateProfile({ youtube: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="YouTube channel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-spotify mr-2"></i>Spotify
                </label>
                <input
                  type="text"
                  value={profile?.spotify || ''}
                  onChange={(e) => updateProfile({ spotify: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="Spotify profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-soundcloud mr-2"></i>SoundCloud
                </label>
                <input
                  type="text"
                  value={profile?.soundcloud || ''}
                  onChange={(e) => updateProfile({ soundcloud: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="SoundCloud profile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <i className="fab fa-facebook mr-2"></i>Facebook
                </label>
                <input
                  type="text"
                  value={profile?.facebook || ''}
                  onChange={(e) => updateProfile({ facebook: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-600/50"
                  placeholder="Facebook profile"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#00FF85] hover:bg-[#00CC6A] text-black font-medium py-2 rounded-lg transition-colors mt-4"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 