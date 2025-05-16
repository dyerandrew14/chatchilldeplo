import React from 'react';
import { Target, Gamepad, Music, Film, Trophy, Laptop, Palette, Heart } from 'lucide-react';

interface InterestSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (interest: string) => void;
}

const interests = [
  {
    id: 'general',
    icon: <Target className="h-8 w-8 text-white" />,
    title: 'General',
    description: 'Chat about anything with people from around the world',
    color: 'bg-blue-600'
  },
  {
    id: 'gaming',
    icon: <Gamepad className="h-8 w-8 text-white" />,
    title: 'Gaming',
    description: 'Connect with fellow gamers and discuss your favorite games',
    color: 'bg-green-600'
  },
  {
    id: 'music',
    icon: <Music className="h-8 w-8 text-white" />,
    title: 'Music',
    description: 'Share your music taste and discover new artists',
    color: 'bg-purple-600'
  },
  {
    id: 'movies',
    icon: <Film className="h-8 w-8 text-white" />,
    title: 'Movies',
    description: 'Discuss films, TV shows, and entertainment',
    color: 'bg-red-600'
  },
  {
    id: 'sports',
    icon: <Trophy className="h-8 w-8 text-white" />,
    title: 'Sports',
    description: 'Talk about sports, teams, and athletic events',
    color: 'bg-yellow-600'
  },
  {
    id: 'tech',
    icon: <Laptop className="h-8 w-8 text-white" />,
    title: 'Tech',
    description: 'Discuss technology, gadgets, and innovations',
    color: 'bg-cyan-600'
  },
  {
    id: 'art',
    icon: <Palette className="h-8 w-8 text-white" />,
    title: 'Art',
    description: 'Connect with artists and art enthusiasts',
    color: 'bg-orange-600'
  },
  {
    id: 'dating',
    icon: <Heart className="h-8 w-8 text-white" />,
    title: 'Speed Dating',
    description: 'Meet new people for dating and relationships',
    color: 'bg-pink-600'
  }
];

export function InterestSelector({ isOpen, onClose, onSelect }: InterestSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1F2937] rounded-xl w-full max-w-4xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <img src="/chatchill-logo.png" alt="ChatChill" className="h-8 w-8" />
            <h2 className="text-xl font-semibold text-white">Select Your Interest</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {interests.map((interest) => (
            <button
              key={interest.id}
              onClick={() => {
                onSelect(interest.id);
                onClose();
              }}
              className={`${interest.color} rounded-lg p-4 text-center hover:opacity-90 transition-opacity`}
            >
              <div className="flex justify-center mb-3">
                {interest.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{interest.title}</h3>
              <p className="text-sm text-white/80">{interest.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            Skip for now
          </button>
          <div className="text-yellow-400">
            Pro tip: Choose an interest to find better matches
          </div>
        </div>
      </div>
    </div>
  );
} 