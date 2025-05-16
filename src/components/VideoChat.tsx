import React, { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import { Sidebar } from './ui/sidebar';
import { AuthModal } from './AuthModal';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Music, 
  Globe, 
  Users,
  ArrowRight,
  ChevronDown,
  Target,
  Crown,
  Filter,
  Heart,
  Instagram,
  Facebook,
  MessageSquare,
  Share2,
  Gamepad
} from 'lucide-react';
import { InterestSelector } from './InterestSelector';
import { useRouter } from 'next/router';
import { supabase, type Profile, type SocialLinks } from '../lib/supabaseClient';
import Image from 'next/image';
import WebRTCService from '../lib/webrtc';
import MatchmakingService from '../lib/matchmaking';

interface VideoChatProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isSearching: boolean;
  isChatting: boolean;
  error: string | null;
  onStartChat: () => void;
  onStopChat: () => void;
  currentUser?: {
    username: string;
    name: string;
    avatar?: string;
    instagram?: string;
    snapchat?: string;
    facebook?: string;
    discord?: string;
    steam?: string;
  };
}

interface ConnectedUser {
  name: string;
  avatar?: string;
  country?: string;
}

interface UserState {
  name: string;
  avatar?: string;
}

// Update the country and gender options
const countries = [
  { code: 'global', name: 'Global', flag: '🌎' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' }
];

const genders = [
  { icon: '👥', label: 'Everyone' },
  { icon: '👨', label: 'Male' },
  { icon: '👩', label: 'Female' },
  { icon: '🌈', label: 'Other' }
];

// Add this before the VideoChat component
const lobbies = [
  { id: 'speed-dating', name: 'Speed Dating', icon: '💝', color: 'pink' },
  { id: 'casual', name: 'Casual Chat', icon: '💬', color: 'green' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: 'green' },
  { id: 'language', name: 'Language Exchange', icon: '🌍', color: 'green' },
  { id: 'music', name: 'Music & Arts', icon: '🎵', color: 'green' }
];

const lobbyCategories = [
  { id: 'speed-dating', label: 'Speed Dating', icon: '💝', color: 'pink' },
  { id: 'coding', label: 'Coding', icon: '💻', color: 'green' },
  { id: 'music', label: 'Music', icon: '🎵', color: 'green' },
  { id: 'mental-health', label: 'Mental Health', icon: '🧠', color: 'green' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', color: 'green' },
  { id: 'casual', label: 'Casual Chat', icon: '💬', color: 'green' },
];

export default function VideoChat() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{text: string; isSelf: boolean}>>([]);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [showGenderSelector, setShowGenderSelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [selectedGender, setSelectedGender] = useState(genders[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [microphoneVolume, setMicrophoneVolume] = useState(80);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showCountryPopup, setShowCountryPopup] = useState(false);
  const [showGenderPopup, setShowGenderPopup] = useState(false);
  const [showMusicPopup, setShowMusicPopup] = useState(false);
  const [showInterestSelector, setShowInterestSelector] = useState(false);
  const [userCount] = useState(4500);
  const [connectedUser, setConnectedUser] = useState<ConnectedUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUserState, setCurrentUserState] = useState<UserState | null>(null);
  const [currentLobby, setCurrentLobby] = useState('Speed Dating');
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showMusicStore, setShowMusicStore] = useState(false);
  const [showLobbySelector, setShowLobbySelector] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<{ id: string; label: string; icon: string; color: string } | null>(null);
  const [remoteBio, setRemoteBio] = useState<string>('');
  const [showBio, setShowBio] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // WebRTC and Matchmaking services
  const webrtcRef = useRef<WebRTCService | null>(null);
  const matchmakingRef = useRef<MatchmakingService | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking auth state...');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        
        if (user) {
          // Initialize services when user is authenticated
          initializeServices(user.id);

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }

          console.log('Profile data:', profileData);
          setProfile(profileData);
          setCurrentUserState({
            name: profileData.username || user.email?.split('@')[0] || 'User',
            avatar: profileData.avatar_url
          });
        } else {
          console.log('No user found, clearing state');
          setProfile(null);
          setCurrentUserState(null);
          // Clean up services when user is logged out
          cleanup();
          webrtcRef.current = null;
          matchmakingRef.current = null;
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN') {
        await checkAuth();
      } else if (event === 'SIGNED_OUT') {
        // Clean up when user signs out
        cleanup();
        webrtcRef.current = null;
        matchmakingRef.current = null;
        setProfile(null);
        setCurrentUserState(null);
        setShowMenu(false);
        setIsSearching(false);
        setIsChatting(false);
        setConnectedUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update the initializeServices function to work without authentication
  const initializeServices = async (userId?: string) => {
    try {
      // First try to get camera permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(err => {
            console.error('Error playing local video:', err);
            addDebugLog('Error playing local video: ' + err.message);
          });
        }

        // Only initialize WebRTC and Matchmaking if we have a userId
        if (userId) {
          webrtcRef.current = new WebRTCService(userId);
          await webrtcRef.current.initialize();
          await webrtcRef.current.setLocalStream(stream);

          matchmakingRef.current = new MatchmakingService(userId);

          // Set up matchmaking callback
          matchmakingRef.current.onMatch(async (matchedUserId) => {
            try {
              await webrtcRef.current?.startCall(matchedUserId);
              setIsSearching(false);
              setIsChatting(true);
              addDebugLog('Connected to peer');
            } catch (err) {
              console.error('Error starting call:', err);
              setError('Failed to connect to peer');
            }
          });

          // Subscribe to signaling messages
          await webrtcRef.current.subscribeToSignaling(async (message) => {
            try {
              await webrtcRef.current?.handleIncomingCall(message);
              if (message.type === 'offer') {
                setIsSearching(false);
                setIsChatting(true);
                addDebugLog('Received incoming call');
              }
            } catch (err) {
              console.error('Error handling incoming call:', err);
              setError('Failed to handle incoming call');
            }
          });
        }

      } catch (err: any) {
        console.error('Error accessing camera:', err);
        setError('Please allow camera access to use video chat');
        addDebugLog('Camera access error: ' + err.message);
        return;
      }

    } catch (err: any) {
      console.error('Error initializing services:', err);
      setError('Failed to initialize video chat');
      addDebugLog('Service initialization error: ' + err.message);
    }
  };

  // Initialize camera on component mount
  useEffect(() => {
    initializeServices();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      cleanup();
    };
  }, []);

  // Update video elements when streams change
  useEffect(() => {
    const remoteStream = webrtcRef.current?.getRemoteStream();
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [isChatting]);

  // Show remote user's bio briefly when connected
  useEffect(() => {
    const remoteStream = webrtcRef.current?.getRemoteStream();
    if (isChatting && remoteStream) {
      setShowBio(true);
      const timer = setTimeout(() => {
        setShowBio(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isChatting]);

  // Update chat connection info when starting chat
  useEffect(() => {
    if (isChatting && currentUserState) {
      setConnectedUser({
        name: currentUserState.name,
        avatar: currentUserState.avatar,
        country: selectedCountry.name
      });
    } else {
      setConnectedUser(null);
    }
  }, [isChatting, currentUserState, selectedCountry]);

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Update the startChat function to work without authentication
  const startChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate a temporary ID if not logged in
      const tempUserId = user?.id || `temp-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize services if needed
      if (!webrtcRef.current || !matchmakingRef.current) {
        await initializeServices(tempUserId);
      }

      setError(null);
      setIsSearching(true);
      addDebugLog('Starting search for peer');

      // Make sure we're not already in a chat
      if (isChatting) {
        await cleanup();
      }

      if (matchmakingRef.current) {
        await matchmakingRef.current.startSearching({
          country: selectedCountry.name,
          gender: selectedGender.label,
          interests: [],
          lobby: currentLobby
        });
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
      setIsSearching(false);
    }
  };

  const stopChat = async () => {
    try {
      // Don't cleanup WebRTC yet, just stop searching
      if (matchmakingRef.current) {
        await matchmakingRef.current.cleanup();
      }
      
      // Reset states but keep camera on
      setIsSearching(false);
      setIsChatting(false);
      setConnectedUser(null);
      addDebugLog('Chat stopped, but camera still active');
    } catch (err) {
      console.error('Error stopping chat:', err);
      setError('Failed to stop chat');
    }
  };

  const cleanup = async () => {
    try {
      // Only cleanup WebRTC if we're actually connected
      if (webrtcRef.current && isChatting) {
        await webrtcRef.current.cleanup();
      }
      if (matchmakingRef.current) {
        await matchmakingRef.current.cleanup();
      }
      // Don't reset localStream here to keep camera on
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      addDebugLog(`Microphone ${!isMuted ? 'muted' : 'unmuted'}`);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      addDebugLog(`Camera ${!isVideoOff ? 'disabled' : 'enabled'}`);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setMessages([...messages, { text: message, isSelf: true }]);
      setMessage('');
    }
  };

  const handleProfileUpdate = async (updates: Partial<Profile>) => {
    try {
      console.log('Starting profile update with:', updates);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user found');
      }

      // Update the profile using the helper function
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setProfile(data);
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await handleProfileUpdate({ avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleSocialShare = (platform: string) => {
    if (!profile?.social) return;
    
    let url = '';
    switch (platform) {
      case 'discord':
        url = profile.social.discord || '';
        break;
      case 'instagram':
        url = profile.social.instagram || '';
        break;
      case 'snapchat':
        url = profile.social.snapchat || '';
        break;
      case 'facebook':
        url = profile.social.facebook || '';
        break;
      case 'steam':
        url = profile.social.steam || '';
        break;
      case 'phone':
        url = profile.social.phone || '';
        break;
    }

    if (url) {
      window.open(url, '_blank');
    }
  };

  // Add status messages
  const getStatusMessage = () => {
    if (isSearching) {
      return `Finding next person in ${selectedLobby?.label || currentLobby} lobby...`;
    } else if (!isChatting) {
      return "Click Start to begin chatting";
    }
    return null;
  };

  // Update handleAuthSuccess
  const handleAuthSuccess = async () => {
    console.log('Auth success in VideoChat');
    setShowAuthModal(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (user) {
        await fetchProfile();
      }
    } catch (error) {
      console.error('Error in handleAuthSuccess:', error);
    }
  };

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetching profile for user:', user);
      
      if (!user) {
        console.log('No user found, clearing profile');
        setProfile(null);
        setCurrentUserState(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('Profile data:', data);
      if (data) {
        setProfile(data);
        setCurrentUserState({
          name: data.username || user.email?.split('@')[0] || 'User',
          avatar: data.avatar_url
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#0F1117] relative">
      {/* Logo */}
      <div className="absolute top-4 left-4 z-50 scale-150 transform origin-top-left">
        <Logo size="xl" />
      </div>

      {/* Chat Sidebar with Status Message */}
      {showChat && (
        <div className="absolute top-0 right-0 w-[280px] h-full bg-[#151C28] border-l border-gray-800 flex flex-col">
          {/* Status Message at top of chat */}
          {getStatusMessage() && (
            <div className="w-full p-4 bg-[#1F2937] border-b border-gray-800">
              <div className="text-white text-sm text-center">
                {getStatusMessage()}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.isSelf
                      ? 'bg-[#00FF85] text-black'
                      : 'bg-[#1F2937] text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* User Info and Chat Input */}
          <div className="border-t border-gray-800">
            {/* User Info Bar */}
            {profile && (
              <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username || 'User'} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#00FF85] flex items-center justify-center text-black font-medium">
                    {(profile.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-white">{profile.username || 'User'}</span>
              </div>
            )}

            {/* Social Share Buttons */}
            {profile && (
              <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2 overflow-x-auto">
                {profile.discord && (
                  <button 
                    onClick={() => handleSocialShare('discord')} 
                    className="p-2 rounded-lg transition-colors text-[#5865F2] bg-[#5865F2]/10 hover:bg-[#5865F2]/20"
                  >
                    <i className="fab fa-discord text-xl"></i>
                  </button>
                )}
                {profile.instagram && (
                  <button 
                    onClick={() => handleSocialShare('instagram')} 
                    className="p-2 rounded-lg transition-colors text-[#E1306C] bg-[#E1306C]/10 hover:bg-[#E1306C]/20"
                  >
                    <i className="fab fa-instagram text-xl"></i>
                  </button>
                )}
                {profile.snapchat && (
                  <button 
                    onClick={() => handleSocialShare('snapchat')} 
                    className="p-2 rounded-lg transition-colors text-[#FFFC00] bg-[#FFFC00]/10 hover:bg-[#FFFC00]/20"
                  >
                    <i className="fab fa-snapchat text-xl"></i>
                  </button>
                )}
                {profile.facebook && (
                  <button 
                    onClick={() => handleSocialShare('facebook')} 
                    className="p-2 rounded-lg transition-colors text-[#1877F2] bg-[#1877F2]/10 hover:bg-[#1877F2]/20"
                  >
                    <i className="fab fa-facebook text-xl"></i>
                  </button>
                )}
                {profile.steam && (
                  <button 
                    onClick={() => handleSocialShare('steam')} 
                    className="p-2 rounded-lg transition-colors text-white bg-white/10 hover:bg-white/20"
                  >
                    <i className="fab fa-steam text-xl"></i>
                  </button>
                )}
                {profile.phone && (
                  <button 
                    onClick={() => handleSocialShare('phone')} 
                    className="p-2 rounded-lg transition-colors text-green-500 bg-green-500/10 hover:bg-green-500/20"
                  >
                    <i className="fas fa-phone text-xl"></i>
                  </button>
                )}
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4">
              <div className="relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2 bg-[#1F2937] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00FF85] border border-gray-700"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <span className="material-icons">send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex flex-1 ${showChat ? 'pr-[280px]' : ''}`}>
        {/* Left Video (Remote) */}
        <div className="w-1/2 relative">
          <div className="absolute inset-0 h-screen">
            {/* Pink glow effect for Speed Dating lobby */}
            {currentLobby === 'Speed Dating' && (
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-pink-500/20 to-transparent pointer-events-none" />
            )}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover bg-[#0F1117]"
            />

            {/* Remote User Profile Info Overlay */}
            {connectedUser && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="flex items-start gap-4">
                  {/* Profile Picture */}
                  {connectedUser.avatar ? (
                    <img 
                      src={connectedUser.avatar} 
                      alt={connectedUser.name} 
                      className="w-16 h-16 rounded-full border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#00FF85] flex items-center justify-center text-black font-medium text-2xl">
                      {connectedUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Profile Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-medium text-white">{connectedUser.name}</h3>
                      <div className="flex items-center gap-1 text-gray-300">
                        <span className="text-sm">{selectedCountry.name}</span>
                      </div>
                    </div>
                    
                    {/* Bio */}
                    {remoteBio && (
                      <p className="text-gray-300 text-sm line-clamp-2">{remoteBio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pre-start or Searching Screen */}
            {(!isChatting || isSearching) && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F1117]/95 backdrop-blur-sm">
                {isSearching ? (
                  // Searching Animation
                  <div className="text-center space-y-4">
                    <div className="inline-block w-16 h-16 relative">
                      <div className="absolute inset-0 border-4 border-[#00FF85]/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-[#00FF85] rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-xl font-medium text-white mb-4">
                      Finding next person in {selectedLobby?.label || currentLobby} lobby...
                    </p>
                    <button 
                      onClick={stopChat}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  // Pre-start Screen
                  <div className="text-center space-y-6 p-8">
                    <Logo size="xl" className="justify-center" />
                    
                    {/* Online Users Count */}
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-green-500">{userCount.toLocaleString()} users online</span>
                    </div>

                    {/* Welcome Message */}
                    {profile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username || 'User'} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#00FF85] flex items-center justify-center text-black font-medium text-xl">
                              {(profile.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <h2 className="text-xl font-medium text-white">Welcome back, {profile.username || 'User'}!</h2>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowAuthModal(true)}
                        className="bg-[#FFDD00] hover:bg-[#E5C700] text-black font-medium px-8 py-3 rounded-full"
                      >
                        Sign In / Create Account
                      </button>
                    )}

                    {/* Store Links */}
                    <div className="flex justify-center gap-4">
                      <button className="bg-[#1F2937] hover:bg-[#374151] text-white px-6 py-2 rounded-lg flex items-center gap-2">
                        <span className="material-icons">apple</span>
                        App Store
                      </button>
                      <button className="bg-[#1F2937] hover:bg-[#374151] text-white px-6 py-2 rounded-lg flex items-center gap-2">
                        <span className="material-icons">android</span>
                        Google Play
                      </button>
                    </div>

                    {/* Interest Button */}
                    <button 
                      onClick={() => setShowLobbySelector(true)}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-full flex items-center gap-2 mx-auto"
                    >
                      <Target className="h-5 w-5" />
                      Find People by Interest
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Video (Local) */}
        <div className="w-1/2 relative">
          <div className="absolute inset-0 h-screen">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                transform: 'scaleX(-1)',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#0F1117',
                display: 'block' // Ensure video is displayed
              }}
            />
          </div>

          {/* Top Right Controls */}
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            <button
              onClick={() => setShowVIPModal(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1F2937]/80 backdrop-blur-sm hover:bg-[#374151]/80 text-yellow-500"
            >
              <Crown className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1F2937]/80 backdrop-blur-sm hover:bg-[#374151]/80 text-white"
            >
              <span className="material-icons">{showChat ? 'chat' : 'chat_bubble_outline'}</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1F2937]/80 backdrop-blur-sm hover:bg-[#374151]/80 text-white"
            >
              <span className="material-icons">menu</span>
            </button>
          </div>

          {/* Top Left Controls */}
          <div className="absolute top-4 left-4 flex gap-2 z-20">
            <button
              onClick={() => setShowLobbySelector(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F2937]/80 backdrop-blur-sm hover:bg-[#374151]/80 text-white"
            >
              <span className="text-2xl">{selectedLobby?.icon || '💝'}</span>
              <span>{selectedLobby?.label || 'Speed Dating'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Lobby Selector */}
          {showLobbySelector && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
              <div className="bg-[#1F2937] rounded-xl w-[320px] overflow-hidden shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">Select Lobby</h3>
                  <button onClick={() => setShowLobbySelector(false)} className="text-gray-400 hover:text-white">
                    ✕
                  </button>
                </div>
                <div className="p-2">
                  {lobbyCategories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedLobby(category);
                        setShowLobbySelector(false);
                      }}
                      className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-colors ${
                        selectedLobby?.id === category.id
                          ? category.color === 'pink' 
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'bg-[#00FF85]/20 text-[#00FF85]'
                          : 'hover:bg-[#374151] text-white'
                      }`}
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pink overlay for speed dating mode */}
          {selectedLobby?.id === 'speed-dating' && connectedUser && (
            <div className="absolute inset-0 bg-pink-500/10 pointer-events-none rounded-xl" />
          )}

          {/* Bottom Right Corner Controls */}
          <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-20">
            <button
              onClick={toggleMute}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isMuted ? 'bg-red-500' : 'bg-[#1F2937]/80'
              } backdrop-blur-sm hover:bg-[#374151]/80`}
            >
              {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isVideoOff ? 'bg-red-500' : 'bg-[#1F2937]/80'
              } backdrop-blur-sm hover:bg-[#374151]/80`}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Chat Connection Info */}
        {connectedUser && showChat && (
          <div className="absolute top-4 right-[300px] z-50">
            <div className="px-4 py-2 rounded-lg bg-[#1F2937]/80 backdrop-blur-sm text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium">{connectedUser.name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-300">{selectedCountry.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <div className={`absolute bottom-0 left-0 ${showChat ? 'right-[280px]' : 'right-0'} h-16 bg-[#1F2937]/95 backdrop-blur-lg border-t border-gray-800 flex items-stretch z-10`}>
          <button
            onClick={startChat}
            className={`flex-1 flex items-center justify-center gap-2 ${
              selectedLobby?.id === 'speed-dating' 
                ? 'bg-pink-500 hover:bg-pink-600' 
                : 'bg-[#00FF85] hover:bg-[#00CC6A]'
            } text-black font-medium border-r border-gray-800`}
          >
            <ArrowRight className="h-5 w-5" />
            <span>Next</span>
          </button>
          
          <button
            onClick={stopChat}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium border-r border-gray-800"
          >
            <span>Stop</span>
          </button>

          <button 
            onClick={() => setShowCountryPopup(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1F2937] hover:bg-[#374151] text-white font-medium border-r border-gray-800"
          >
            <span className="text-2xl">{selectedCountry.flag}</span>
            <span>{selectedCountry.name}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <button 
            onClick={() => setShowGenderPopup(true)}
            className="flex-1 flex items-center justify-center gap-2 hover:bg-[#4B5563] text-white font-medium border-r border-gray-800"
          >
            <span className="text-2xl">{selectedGender.icon}</span>
            <span>{selectedGender.label}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <button 
            onClick={() => setShowMusicStore(true)}
            className="flex-1 flex items-center justify-center gap-2 hover:bg-[#4B5563] text-white font-medium"
          >
            <Music className="h-5 w-5" />
            <span>Music Store</span>
          </button>
        </div>
      </div>

      {/* Music Store Modal */}
      {showMusicStore && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-xl w-[480px] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Music Store</h2>
              <button onClick={() => setShowMusicStore(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="text-center text-gray-400 py-8">
              <Music className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <p>Coming soon! We're integrating with Shopify to bring you music controls.</p>
            </div>
          </div>
        </div>
      )}

      {/* VIP Modal */}
      {showVIPModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-xl w-[480px] p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                <h2 className="text-xl font-semibold text-white">ChatChill VIP</h2>
              </div>
              <button onClick={() => setShowVIPModal(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-gray-300">
                Unlock premium features and enhance your ChatChill experience
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Filter className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-white">Filter users by gender, country, and interests</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Music className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-white">Music control - override other users' music</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-white">Ad-free experience with priority matching</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-white">Send Super Likes and access your Dating List</span>
                </div>
              </div>

              <div className="bg-purple-500/20 rounded-lg p-4 space-y-3">
                <div className="text-sm">
                  <div className="font-medium text-white">Monthly subscription</div>
                  <div className="text-2xl font-bold text-white">$3.99</div>
                  <div className="text-gray-400 text-xs">Cancel anytime. Billed monthly.</div>
                </div>
                <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium px-4 py-2 rounded-lg">
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sidebar */}
      <Sidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={profile ? {
          name: profile.username || 'User',
          avatar: profile.avatar_url,
          email: profile.email,
          bio: profile.bio,
          social: {
            discord: profile.discord,
            snapchat: profile.snapchat,
            instagram: profile.instagram,
            facebook: profile.facebook,
            steam: profile.steam,
            phone: profile.phone
          }
        } : null}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setProfile(null);
          setCurrentUserState(null);
          setShowSettings(false);
        }}
        onAvatarChange={handleAvatarChange}
        onProfileUpdate={handleProfileUpdate}
        microphoneVolume={microphoneVolume}
        speakerVolume={speakerVolume}
        onMicrophoneVolumeChange={setMicrophoneVolume}
        onSpeakerVolumeChange={setSpeakerVolume}
        debugLogs={debugLogs}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Country Selector Popup */}
      {showCountryPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-xl w-[320px] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">Select Country</h3>
              <button onClick={() => setShowCountryPopup(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {countries.map(country => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountryPopup(false);
                  }}
                  className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-colors ${
                    selectedCountry.code === country.code
                      ? 'bg-[#00FF85]/20 text-[#00FF85]'
                      : 'hover:bg-[#374151] text-white'
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gender Selector Popup */}
      {showGenderPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1F2937] rounded-xl w-[320px] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">Select Gender</h3>
              <button onClick={() => setShowGenderPopup(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-2">
              {genders.map(gender => (
                <button
                  key={gender.label}
                  onClick={() => {
                    setSelectedGender(gender);
                    setShowGenderPopup(false);
                  }}
                  className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-colors ${
                    selectedGender.label === gender.label
                      ? 'bg-[#00FF85]/20 text-[#00FF85]'
                      : 'hover:bg-[#374151] text-white'
                  }`}
                >
                  <span className="text-2xl">{gender.icon}</span>
                  <span className="font-medium">{gender.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 