const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const geoip = require('geoip-lite');

const app = express();

// Always allow localhost:3000 in development
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  connectTimeout: 30000,
  maxHttpBufferSize: 1e6
});

// Connection tracking with timeouts
const waitingUsers = new Set();
const connectedUsers = new Map();
const connectionTimeouts = new Map();

// Cleanup function for inactive users
const cleanupInactiveUser = (socketId) => {
  const timeout = setTimeout(() => {
    const userInfo = connectedUsers.get(socketId);
    if (userInfo) {
      console.log(`Cleaning up inactive user: ${socketId}`);
      if (userInfo.partner) {
        const partnerInfo = connectedUsers.get(userInfo.partner);
        if (partnerInfo) {
          io.to(userInfo.partner).emit('peer-disconnected');
          partnerInfo.partner = null;
        }
      }
      waitingUsers.delete(socketId);
      connectedUsers.delete(socketId);
      connectionTimeouts.delete(socketId);
    }
  }, 300000); // 5 minutes timeout

  connectionTimeouts.set(socketId, timeout);
};

// Reset timeout for active user
const resetTimeout = (socketId) => {
  const existingTimeout = connectionTimeouts.get(socketId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  cleanupInactiveUser(socketId);
};

io.on('connection', (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const geo = geoip.lookup(clientIp.replace('::ffff:', ''));
  const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown Location';
  
  console.log(`User connected: ${socket.id} from ${location} (${clientIp})`);
  connectedUsers.set(socket.id, { 
    socket, 
    partner: null,
    ip: clientIp,
    location: location,
    lastActive: Date.now()
  });

  // Set initial cleanup timeout
  cleanupInactiveUser(socket.id);

  // Emit connection info to the client
  socket.emit('connection-info', {
    id: socket.id,
    ip: clientIp,
    location: location
  });

  // Heartbeat to keep connection alive
  socket.on('heartbeat', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.lastActive = Date.now();
      resetTimeout(socket.id);
    }
  });

  socket.on('set-username', (username) => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.username = username;
      userInfo.lastActive = Date.now();
      resetTimeout(socket.id);
      console.log(`Username set for ${socket.id}: ${username}`);
    }
  });

  socket.on('find-partner', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    userInfo.lastActive = Date.now();
    resetTimeout(socket.id);
    
    console.log(`User searching for partner: ${socket.id} (${userInfo.username || 'Anonymous'})`);
    
    if (waitingUsers.size > 0) {
      // Find a partner that is still connected
      const availablePartner = Array.from(waitingUsers).find(partnerId => {
        const partnerInfo = connectedUsers.get(partnerId);
        return partnerInfo && !partnerInfo.partner && partnerId !== socket.id;
      });

      if (availablePartner) {
        waitingUsers.delete(availablePartner);
        const partnerInfo = connectedUsers.get(availablePartner);
        
        // Update partner information
        userInfo.partner = availablePartner;
        partnerInfo.partner = socket.id;
        
        // Notify both users
        socket.emit('matched', { 
          initiator: true,
          partnerInfo: {
            id: availablePartner,
            username: partnerInfo.username || 'Anonymous',
            location: partnerInfo.location
          }
        });
        
        partnerInfo.socket.emit('matched', { 
          initiator: false,
          partnerInfo: {
            id: socket.id,
            username: userInfo.username || 'Anonymous',
            location: userInfo.location
          }
        });
      } else {
        waitingUsers.add(socket.id);
      }
    } else {
      waitingUsers.add(socket.id);
    }
  });

  socket.on('offer', (offer) => {
    const partnerInfo = connectedUsers.get(socket.id);
    if (partnerInfo?.partner) {
      console.log('Sending offer from', socket.id, 'to', partnerInfo.partner);
      io.to(partnerInfo.partner).emit('offer', offer);
    }
  });

  socket.on('answer', (answer) => {
    const partnerInfo = connectedUsers.get(socket.id);
    if (partnerInfo?.partner) {
      console.log('Sending answer from', socket.id, 'to', partnerInfo.partner);
      io.to(partnerInfo.partner).emit('answer', answer);
    }
  });

  socket.on('ice-candidate', (candidate) => {
    const partnerInfo = connectedUsers.get(socket.id);
    if (partnerInfo?.partner) {
      console.log('Sending ICE candidate from', socket.id, 'to', partnerInfo.partner);
      io.to(partnerInfo.partner).emit('ice-candidate', candidate);
    }
  });

  socket.on('leave-chat', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo?.partner) {
      console.log('User leaving chat:', socket.id);
      const partnerInfo = connectedUsers.get(userInfo.partner);
      if (partnerInfo) {
        io.to(userInfo.partner).emit('peer-disconnected');
        partnerInfo.partner = null;
      }
      userInfo.partner = null;
    }
    waitingUsers.delete(socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo?.partner) {
      const partnerInfo = connectedUsers.get(userInfo.partner);
      if (partnerInfo) {
        io.to(userInfo.partner).emit('peer-disconnected');
        partnerInfo.partner = null;
      }
    }
    
    // Clear any existing timeout
    const timeout = connectionTimeouts.get(socket.id);
    if (timeout) {
      clearTimeout(timeout);
    }
    
    waitingUsers.delete(socket.id);
    connectedUsers.delete(socket.id);
    connectionTimeouts.delete(socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    connections: connectedUsers.size,
    waiting: waitingUsers.size,
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown); 