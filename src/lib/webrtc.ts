import { supabase } from './supabaseClient';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
  from: string;
  to: string;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private userId: string;
  private roomId: string | null = null;
  private isInitiator: boolean = false;
  private signalSubscription: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    try {
      // Create and configure peer connection with both STUN and TURN servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h',
          },
          {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h',
          },
          {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'f5b254187b1b6b4e9c6cd4e8',
            credential: 'L6po+dEQYFDvMC4h',
          },
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });

      // Handle incoming remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.streams[0]);
        this.remoteStream = event.streams[0];
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.roomId) {
          console.log('Sending ICE candidate');
          this.sendSignalingMessage({
            type: 'ice-candidate',
            data: event.candidate,
            from: this.userId,
            to: this.roomId.replace(this.userId, '').replace('-', '')
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection?.connectionState);
        
        if (this.peerConnection?.connectionState === 'failed') {
          this.handleConnectionFailure();
        } else if (this.peerConnection?.connectionState === 'connected') {
          this.reconnectAttempts = 0;
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
        
        if (this.peerConnection?.iceConnectionState === 'disconnected') {
          this.handleIceDisconnection();
        }
      };

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.peerConnection?.connectionState !== 'connected') {
          this.handleConnectionFailure();
        }
      }, 30000); // 30 seconds timeout

      return this.localStream;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }

  private async handleConnectionFailure() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Connection failed. Attempt ${this.reconnectAttempts + 1} of ${this.maxReconnectAttempts}`);
      this.reconnectAttempts++;
      
      // Close existing connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }
      
      // Reinitialize connection
      await this.initialize();
      
      if (this.isInitiator && this.roomId) {
        const targetUserId = this.roomId.replace(this.userId, '').replace('-', '');
        await this.startCall(targetUserId);
      }
    } else {
      console.error('Max reconnection attempts reached');
      await this.cleanup();
    }
  }

  private async handleIceDisconnection() {
    if (this.peerConnection?.iceConnectionState === 'disconnected') {
      console.log('ICE disconnected. Attempting to restart ICE');
      try {
        if (this.isInitiator && this.peerConnection.localDescription) {
          const offer = await this.peerConnection.createOffer({ iceRestart: true });
          await this.peerConnection.setLocalDescription(offer);
          
          if (this.roomId) {
            await this.sendSignalingMessage({
              type: 'offer',
              data: offer,
              from: this.userId,
              to: this.roomId.replace(this.userId, '').replace('-', '')
            });
          }
        }
      } catch (error) {
        console.error('Error during ICE restart:', error);
      }
    }
  }

  async setLocalStream(stream: MediaStream) {
    try {
      this.localStream = stream;
      if (this.peerConnection) {
        // Remove any existing tracks
        const senders = this.peerConnection.getSenders();
        senders.forEach(sender => this.peerConnection!.removeTrack(sender));

        // Add new tracks
        stream.getTracks().forEach(track => {
          if (this.peerConnection && this.localStream) {
            console.log('Adding track to peer connection:', track.kind);
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }
    } catch (error) {
      console.error('Error setting local stream:', error);
      throw error;
    }
  }

  async startCall(targetUserId: string) {
    try {
      console.log('Starting call with:', targetUserId);
      this.isInitiator = true;
      this.roomId = [this.userId, targetUserId].sort().join('-');

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Created offer:', offer);
      await this.peerConnection!.setLocalDescription(offer);

      await this.sendSignalingMessage({
        type: 'offer',
        data: offer,
        from: this.userId,
        to: targetUserId
      });
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async handleIncomingCall(message: SignalingMessage) {
    try {
      console.log('Handling incoming call message:', message.type);
      this.roomId = [this.userId, message.from].sort().join('-');

      if (message.type === 'offer') {
        this.isInitiator = false;
        console.log('Setting remote description (offer)');
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(message.data));
        
        console.log('Creating answer');
        const answer = await this.peerConnection!.createAnswer();
        console.log('Setting local description (answer)');
        await this.peerConnection!.setLocalDescription(answer);

        await this.sendSignalingMessage({
          type: 'answer',
          data: answer,
          from: this.userId,
          to: message.from
        });
      } else if (message.type === 'answer') {
        console.log('Setting remote description (answer)');
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(message.data));
      } else if (message.type === 'ice-candidate') {
        console.log('Adding ICE candidate');
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(message.data));
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
      throw error;
    }
  }

  private async sendSignalingMessage(message: SignalingMessage) {
    try {
      console.log('Sending signaling message:', message.type);
      const { error } = await supabase.from('signaling').insert([{
        message: message,
        room_id: this.roomId,
        created_at: new Date().toISOString()
      }]);

      if (error) {
        console.error('Error sending signaling message:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
    }
  }

  async subscribeToSignaling(onMessage: (message: SignalingMessage) => void) {
    const setupSubscription = () => {
      console.log('Setting up signaling subscription');
      this.signalSubscription = supabase
        .channel('signaling')
        .on('INSERT', (payload: any, context: any, channel: any) => {
          const message = payload.new.message;
          if (message.to === this.userId) {
            console.log('Received signaling message:', message.type);
            onMessage(message);
          }
        })
        .subscribe((status) => {
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to signaling channel');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('Subscription closed or error. Attempting to resubscribe...');
            setTimeout(setupSubscription, 2000); // Retry after 2 seconds
          }
        });
    };

    // Unsubscribe from any existing subscription
    if (this.signalSubscription) {
      this.signalSubscription.unsubscribe();
    }

    setupSubscription();
    return this.signalSubscription;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  async cleanup() {
    console.log('Cleaning up WebRTC service');
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.signalSubscription) {
      this.signalSubscription.unsubscribe();
      this.signalSubscription = null;
    }

    if (this.peerConnection) {
      // Close all tracks
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    this.roomId = null;
    this.isInitiator = false;
    this.reconnectAttempts = 0;
  }
}

export default WebRTCService; 