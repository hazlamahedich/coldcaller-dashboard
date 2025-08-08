const WebSocket = require('ws');
const EventEmitter = require('events');
const SIPManager = require('./sipManager');

class WebSocketManager extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.heartbeatInterval = null;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('Terminating dead WebSocket connection');
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.setupSIPEventListeners();
    console.log('WebSocket server initialized');
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date().toISOString(),
      isAlive: true,
      subscriptions: new Set()
    };

    this.clients.set(clientId, clientInfo);
    ws.isAlive = true;
    ws.clientId = clientId;

    console.log(`WebSocket client connected: ${clientId}`);

    this.sendToClient(clientId, {
      type: 'connection',
      clientId,
      message: 'Connected successfully',
      timestamp: new Date().toISOString()
    });

    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });
  }

  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      if (!client) {
        console.warn(`Message from unknown client: ${clientId}`);
        return;
      }

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.channel);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
    }
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    }
  }

  handleSubscription(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(channel);
      this.sendToClient(clientId, {
        type: 'subscribed',
        channel,
        message: `Subscribed to ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleUnsubscription(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(channel);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        channel,
        message: `Unsubscribed from ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      }
    }
  }

  broadcast(channel, message) {
    const broadcastMessage = {
      ...message,
      channel,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, broadcastMessage);
      }
    });

    console.log(`Broadcasted to ${channel}: ${message.type}`);
  }

  setupSIPEventListeners() {
    SIPManager.on('callInitiated', (callData) => {
      this.broadcast('calls', {
        type: 'callInitiated',
        data: callData
      });
    });

    SIPManager.on('callConnected', (callData) => {
      this.broadcast('calls', {
        type: 'callConnected',
        data: callData
      });
    });

    SIPManager.on('callEnded', (callData) => {
      this.broadcast('calls', {
        type: 'callEnded',
        data: callData
      });
    });

    SIPManager.on('registered', (statusData) => {
      this.broadcast('sip', {
        type: 'sipRegistered',
        data: statusData
      });
    });
  }

  sendMetricsUpdate(metrics) {
    this.broadcast('metrics', {
      type: 'metricsUpdate',
      data: metrics
    });
  }

  sendCallQualityUpdate(callId, quality) {
    this.broadcast('calls', {
      type: 'callQualityUpdate',
      data: { callId, quality }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      uptime: process.uptime(),
      clientsBySubscription: this.getSubscriptionStats()
    };
  }

  getSubscriptionStats() {
    const stats = {};
    this.clients.forEach(client => {
      client.subscriptions.forEach(subscription => {
        stats[subscription] = (stats[subscription] || 0) + 1;
      });
    });
    return stats;
  }

  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.clients.forEach(ws => {
        ws.terminate();
      });
      this.wss.close();
    }

    console.log('WebSocket server closed');
  }
}

module.exports = new WebSocketManager();