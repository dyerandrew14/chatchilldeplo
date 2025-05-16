import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';
import VideoChat from '../components/VideoChat';
import type { Socket } from 'socket.io-client';
import { AuthModal } from '../components/AuthModal';
import { ProfileModal } from '../components/ProfileModal';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize local video stream
  const initializeLocalStream = async () => {
    try {
      console.log('Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('Got media stream:', stream.id);
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera and microphone. Please ensure they are connected and permissions are granted.');
      throw err;
    }
  };

  const connectSocket = () => {
    try {
      if (socket?.connected) return;

      console.log('Connecting to socket server...');
      const newSocket = io('http://localhost:4000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts. Please refresh the page.');
          newSocket.close();
        } else {
          setError(`Connection attempt ${reconnectAttempts.current} failed. Retrying...`);
        }
        setIsConnected(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        setIsConnected(false);
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          setTimeout(() => {
            connectSocket();
          }, 1000);
        }
      });

      return newSocket;
    } catch (err) {
      console.error('Socket connection error:', err);
      setError('Failed to connect to chat server. Please try again later.');
      return null;
    }
  };

  useEffect(() => {
    const socket = connectSocket();
    
    // Initialize local stream on mount
    initializeLocalStream().catch(err => {
      console.error('Failed to initialize local stream:', err);
    });

    return () => {
      if (socket) {
        socket.close();
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startChat = async () => {
    if (!socket?.connected) {
      const newSocket = connectSocket();
      if (!newSocket) {
        setError('Unable to connect to server. Please try again.');
        return;
      }
    }

    if (socket && isConnected) {
      setIsSearching(true);
      setError(null);
      socket.emit('find-partner');
    } else {
      setError('Not connected to server. Please try again.');
    }
  };

  const stopChat = () => {
    setIsSearching(false);
    setIsChatting(false);
    setRemoteStream(null);
    if (socket) {
      socket.emit('leave-chat');
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleMatched = async ({ initiator }: { initiator: boolean }) => {
      console.log('Matched with a partner, initiator:', initiator);
      try {
        const pc = await setupPeerConnection();
        if (!pc) {
          throw new Error('Failed to create peer connection');
        }
        
        setIsChatting(true);
        setIsSearching(false);
        
        if (initiator) {
          console.log('Creating and sending offer...');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          socket.emit('offer', offer);
        }
      } catch (err) {
        console.error('Error in matched handler:', err);
        setError('Failed to start video chat');
        stopChat();
      }
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log('Received offer');
      try {
        const pc = await setupPeerConnection();
        if (!pc) {
          throw new Error('Failed to create peer connection');
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
      } catch (err) {
        console.error('Error handling offer:', err);
        setError('Failed to handle video chat offer');
        stopChat();
      }
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      console.log('Received answer');
      try {
        if (!peerConnection.current) {
          throw new Error('No peer connection available');
        }
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error handling answer:', err);
        setError('Failed to handle video chat answer');
        stopChat();
      }
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      console.log('Received ICE candidate');
      try {
        if (peerConnection.current?.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    };

    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('peer-disconnected', stopChat);

    return () => {
      socket.off('matched', handleMatched);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-disconnected', stopChat);
    };
  }, [socket]);

  const setupPeerConnection = async () => {
    try {
      const configuration: RTCConfiguration = {
        iceServers: [
          { 
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
          },
          {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h'
          },
          {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h'
          },
          {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h'
          }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy
      };

      if (peerConnection.current) {
        peerConnection.current.close();
      }

      console.log('Creating new peer connection');
      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      // Add local stream tracks to peer connection
      if (!localStream) {
        const stream = await initializeLocalStream();
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream);
        });
      } else {
        localStream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, localStream);
        });
      }

      // Handle incoming stream
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams[0]) {
          console.log('Setting remote stream');
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket?.connected) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', event.candidate);
        }
      };

      // Monitor connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log('ICE connection failed or disconnected');
          stopChat();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          console.log('Connection failed');
          stopChat();
        }
      };

      return pc;
    } catch (err) {
      console.error('Error setting up peer connection:', err);
      setError('Failed to setup video chat connection');
      return null;
    }
  };

  return (
    <div>
      <Head>
        <title>ChatChill - Video Chat</title>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </Head>

      <VideoChat
        localStream={localStream}
        remoteStream={remoteStream}
        isSearching={isSearching}
        isChatting={isChatting}
        error={error}
        onStartChat={startChat}
        onStopChat={stopChat}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
} 