import React, { useState } from 'react';
import { Settings, Volume2, Mic, Bug, Crown, HelpCircle, User, Filter, Music, Users, Heart } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; avatar?: string } | null;
  onSignIn: () => void;
  onLogout: () => void;
  microphoneVolume: number;
  speakerVolume: number;
  onMicrophoneVolumeChange: (value: number) => void;
  onSpeakerVolumeChange: (value: number) => void;
  debugLogs: string[];
}

export function Sidebar({
  isOpen,
  onClose,
  user,
  onSignIn,
  onLogout,
  microphoneVolume,
  speakerVolume,
  onMicrophoneVolumeChange,
  onSpeakerVolumeChange,
  debugLogs
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState('settings');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[320px] bg-[#1F2937] border-l border-gray-800 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-lg font-medium text-white">Menu</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'profile' ? 'text-white border-b-2 border-[#00FF85]' : 'text-gray-400'
          }`}
        >
          <User className="h-5 w-5 mx-auto" />
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'settings' ? 'text-white border-b-2 border-[#00FF85]' : 'text-gray-400'
          }`}
        >
          <Settings className="h-5 w-5 mx-auto" />
        </button>
        <button
          onClick={() => setActiveTab('vip')}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'vip' ? 'text-white border-b-2 border-[#00FF85]' : 'text-gray-400'
          }`}
        >
          <Crown className="h-5 w-5 mx-auto text-yellow-500" />
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'faq' ? 'text-white border-b-2 border-[#00FF85]' : 'text-gray-400'
          }`}
        >
          <HelpCircle className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400">ACCOUNT</h3>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#00FF85] flex items-center justify-center text-black font-medium text-lg">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white">{user.name}</div>
                    <button 
                      onClick={onLogout}
                      className="text-sm text-red-500 hover:text-red-400"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="w-full bg-[#FFDD00] hover:bg-[#E5C700] text-black font-medium px-4 py-2 rounded-lg"
              >
                Sign In / Create Account
              </button>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Volume Controls */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">AUDIO</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Mic className="h-4 w-4" />
                      <span>Microphone</span>
                    </div>
                    <span className="text-sm text-gray-400">{microphoneVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={microphoneVolume}
                    onChange={(e) => onMicrophoneVolumeChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Volume2 className="h-4 w-4" />
                      <span>Speaker</span>
                    </div>
                    <span className="text-sm text-gray-400">{speakerVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speakerVolume}
                    onChange={(e) => onSpeakerVolumeChange(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">DEBUG LOGS</h3>
                <Bug className="h-4 w-4 text-gray-400" />
              </div>
              <div className="bg-gray-900 rounded-lg p-3 text-sm font-mono text-gray-300 h-[200px] overflow-y-auto">
                {debugLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vip' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                ChatChill VIP
              </h3>
              <p className="text-sm text-gray-400">
                Unlock premium features and enhance your experience
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">Filter users by gender, country, and interests</span>
              </div>
              <div className="flex items-center gap-3">
                <Music className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">Music control - override other users' music</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">Ad-free experience with priority matching</span>
              </div>
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">Send Super Likes and access your Dating List</span>
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
        )}

        {activeTab === 'faq' && (
          <div className="space-y-4">
            {[
              {
                q: "What is ChatChill?",
                a: "ChatChill is a platform that allows you to video chat with random people from around the world. It's a great way to meet new friends and have interesting conversations."
              },
              {
                q: "How do I start a chat?",
                a: "Simply click the 'Start' button on the main page and you'll be connected with a random person who is also looking to chat. If you want to end the current conversation and find someone new, click the 'Next Chat' button."
              },
              {
                q: "Is ChatChill free to use?",
                a: "Yes, ChatChill is completely free to use. We also offer a VIP subscription for $3.99/month that gives you access to premium features like filtering users by gender and country, music control, and more."
              },
              {
                q: "How do I add someone as a friend?",
                a: "When you're chatting with someone, you can click the '+Invite' button next to their name to send them a friend request. If they accept, they'll be added to your friends list."
              }
            ].map((item, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-white">{item.q}</h4>
                <p className="text-sm text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 