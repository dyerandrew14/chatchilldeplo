'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError: string | null;
}

export function AuthModal({ isOpen, onClose, initialError }: AuthModalProps) {
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(initialError);
  const [isLoading, setIsLoading] = useState(false);

  // Reset error when props change
  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement login logic here
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement signup logic here
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md border-gray-800 bg-gray-900 text-white relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to ChatChill</CardTitle>
          <CardDescription className="text-gray-400">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-900/50 p-3 text-red-200">
              <p>{error}</p>
            </div>
          )}

          <Tabs defaultValue="sign_in" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign_in">Sign In</TabsTrigger>
              <TabsTrigger value="sign_up">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="sign_in">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FFDD00] hover:bg-[#E5C700] text-black"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="sign_up">
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FFDD00] hover:bg-[#E5C700] text-black"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-2 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button
                type="button"
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                onClick={() => {}}
              >
                Discord
              </Button>
              <Button
                type="button"
                className="w-full bg-[#171A21] hover:bg-[#2A475E] text-white"
                onClick={() => {}}
              >
                Steam
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 