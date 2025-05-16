import React from 'react';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
  userCount?: number;
}

export default function Layout({ children, userCount = 1521 }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0F1117] relative">
      {/* Left Sidebar */}
      <div className="fixed left-0 top-0 h-full w-[250px] bg-[#0F1117] p-6 flex flex-col gap-6 border-r border-gray-800 z-50">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white">ChatChill</h1>
        </div>

        {/* Online Users */}
        <div className="flex items-center gap-2 text-[#00FF85]">
          <span className="w-2 h-2 bg-[#00FF85] rounded-full"></span>
          <span>{userCount.toLocaleString()} users online</span>
        </div>

        {/* Sign In Button */}
        <button className="bg-[#FFD700] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#FFE44D] transition-colors">
          Sign In / Create Account
        </button>

        {/* Store Buttons */}
        <div className="flex flex-col gap-2">
          <button className="bg-black text-white px-4 py-2 rounded-lg border border-gray-800 hover:border-gray-700 flex items-center gap-2">
            <span className="material-icons">phone_iphone</span>
            <span>App Store</span>
          </button>
          <button className="bg-black text-white px-4 py-2 rounded-lg border border-gray-800 hover:border-gray-700 flex items-center gap-2">
            <span className="material-icons">android</span>
            <span>Google Play</span>
          </button>
        </div>

        {/* Find People Button */}
        <button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <span className="material-icons">group_add</span>
          <span>Find People by Interest</span>
        </button>
      </div>

      {/* Top Bar */}
      <div className="fixed top-4 left-[270px] flex items-center gap-4 z-50">
        <div className="bg-[#1F2937]/60 backdrop-blur-sm rounded-full px-4 py-1 text-white">
          General Lobby
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-[250px]">
        {children}
      </main>
    </div>
  );
} 