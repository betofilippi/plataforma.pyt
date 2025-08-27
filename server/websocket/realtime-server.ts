import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';

interface UserPresence {
  userId: string;
  username: string;
  email: string;
  room: string;
  cursor?: { x: number; y: number; cell?: string };
  lastSeen: Date;
  status: 'online' | 'away' | 'busy';
}

interface CellUpdate {
  sheetId: string;
  cellId: string;
  value: any;
  formula?: string;
  userId: string;
  timestamp: Date;
  version: number;
}

interface AIStreamEvent {
  type: 'ai_start' | 'ai_progress' | 'ai_complete' | 'ai_error';
  requestId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

interface NotificationEvent {
  type: 'notification_created' | 'notification_read' | 'notification_archived' | 'notification_deleted';
  notification: any;
  user_id: string;
  timestamp: Date;
}

interface NotificationSubscription {
  userId: string;
  categories?: string[];
  modules?: string[];
  priorities?: string[];
}

interface RoomData {
  users: Map<string, UserPresence>;
  activeSheets: Set<string>;
  lastActivity: Date;
}

export class RealtimeServer {
  private io: SocketIOServer;
  private redis: Redis;
  private rooms: Map<string, RoomData> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private notificationSubscriptions: Map<string, NotificationSubscription> = new Map(); // socketId -> subscription
  
  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:3005", "http://localhost:5173", "https://plataforma.app"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize Redis for scalability
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailure: 100,
      maxRetriesPerRequest: 3
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
        socket.data.user = decoded;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.username} connected via WebSocket`);

      // Store socket mappings
      this.userSockets.set(user.id, socket.id);
      this.socketUsers.set(socket.id, user.id);

      // Join room event
      socket.on('join_room', (roomId: string) => {
        this.handleJoinRoom(socket, roomId);
      });

      // Leave room event
      socket.on('leave_room', (roomId: string) => {
        this.handleLeaveRoom(socket, roomId);
      });

      // Cell update event
      socket.on('cell_update', (data: Omit<CellUpdate, 'userId' | 'timestamp'>) => {
        this.handleCellUpdate(socket, data);
      });

      // Cursor movement event
      socket.on('cursor_move', (data: { x: number; y: number; cell?: string; room: string }) => {
        this.handleCursorMove(socket, data);
      });

      // AI streaming events
      socket.on('ai_request', (data: { requestId: string; query: string; sheetId?: string }) => {
        this.handleAIRequest(socket, data);
      });

      // Status update event
      socket.on('status_update', (status: 'online' | 'away' | 'busy') => {
        this.handleStatusUpdate(socket, status);
      });

      // Typing indicators
      socket.on('typing_start', (data: { cellId: string; room: string }) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data: { cellId: string; room: string }) => {
        this.handleTypingStop(socket, data);
      });

      // Disconnect event
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Notification subscription events
      socket.on('subscribe_notifications', (data: { categories?: string[]; modules?: string[]; priorities?: string[] }) => {
        this.handleNotificationSubscription(socket, data);
      });

      socket.on('unsubscribe_notifications', () => {
        this.handleNotificationUnsubscription(socket);
      });

      // Mark notification as read
      socket.on('notification_read', (data: { notificationId: string }) => {
        this.handleNotificationRead(socket, data);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handleJoinRoom(socket: any, roomId: string) {
    const user = socket.data.user;
    
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        activeSheets: new Set(),
        lastActivity: new Date()
      });
    }

    const room = this.rooms.get(roomId)!;
    const userPresence: UserPresence = {
      userId: user.id,
      username: user.username,
      email: user.email,
      room: roomId,
      lastSeen: new Date(),
      status: 'online'
    };

    room.users.set(user.id, userPresence);
    room.lastActivity = new Date();

    // Notify other users in the room
    socket.to(roomId).emit('user_joined', {
      user: userPresence,
      totalUsers: room.users.size
    });

    // Send current room state to the joining user
    socket.emit('room_state', {
      users: Array.from(room.users.values()),
      activeSheets: Array.from(room.activeSheets)
    });

    console.log(`User ${user.username} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: any, roomId: string) {
    const user = socket.data.user;
    
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(user.id);
      
      // If room is empty, clean it up
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      } else {
        // Notify remaining users
        socket.to(roomId).emit('user_left', {
          userId: user.id,
          totalUsers: room.users.size
        });
      }
    }

    console.log(`User ${user.username} left room ${roomId}`);
  }

  private handleCellUpdate(socket: any, data: Omit<CellUpdate, 'userId' | 'timestamp'>) {
    const user = socket.data.user;
    
    const cellUpdate: CellUpdate = {
      ...data,
      userId: user.id,
      timestamp: new Date(),
      version: Date.now() // Simple versioning
    };

    // Find the room this user is in
    const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    
    userRooms.forEach(roomId => {
      const room = this.rooms.get(roomId);
      if (room) {
        room.activeSheets.add(data.sheetId);
        room.lastActivity = new Date();
        
        // Broadcast to other users in the room
        socket.to(roomId).emit('cell_updated', cellUpdate);
      }
    });

    // Store in Redis for persistence and conflict resolution
    this.redis.setex(
      `cell:${data.sheetId}:${data.cellId}`,
      3600, // 1 hour TTL
      JSON.stringify(cellUpdate)
    );

    console.log(`Cell update from ${user.username}: ${data.sheetId}:${data.cellId}`);
  }

  private handleCursorMove(socket: any, data: { x: number; y: number; cell?: string; room: string }) {
    const user = socket.data.user;
    
    const room = this.rooms.get(data.room);
    if (room && room.users.has(user.id)) {
      const userPresence = room.users.get(user.id)!;
      userPresence.cursor = { x: data.x, y: data.y, cell: data.cell };
      userPresence.lastSeen = new Date();
      
      // Broadcast cursor position to other users
      socket.to(data.room).emit('cursor_moved', {
        userId: user.id,
        username: user.username,
        cursor: userPresence.cursor
      });
    }
  }

  private handleAIRequest(socket: any, data: { requestId: string; query: string; sheetId?: string }) {
    const user = socket.data.user;
    
    // Emit AI start event
    const startEvent: AIStreamEvent = {
      type: 'ai_start',
      requestId: data.requestId,
      userId: user.id,
      data: { query: data.query, sheetId: data.sheetId },
      timestamp: new Date()
    };

    // Find user's rooms and broadcast AI activity
    const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    userRooms.forEach(roomId => {
      socket.to(roomId).emit('ai_event', startEvent);
    });

    // Emit to the requesting user
    socket.emit('ai_event', startEvent);

    console.log(`AI request from ${user.username}: ${data.query}`);
  }

  private handleStatusUpdate(socket: any, status: 'online' | 'away' | 'busy') {
    const user = socket.data.user;
    
    // Update status in all rooms the user is in
    this.rooms.forEach((room, roomId) => {
      if (room.users.has(user.id)) {
        const userPresence = room.users.get(user.id)!;
        userPresence.status = status;
        userPresence.lastSeen = new Date();
        
        // Notify other users in the room
        socket.to(roomId).emit('user_status_changed', {
          userId: user.id,
          status: status
        });
      }
    });
  }

  private handleTypingStart(socket: any, data: { cellId: string; room: string }) {
    const user = socket.data.user;
    
    socket.to(data.room).emit('user_typing_start', {
      userId: user.id,
      username: user.username,
      cellId: data.cellId
    });
  }

  private handleTypingStop(socket: any, data: { cellId: string; room: string }) {
    const user = socket.data.user;
    
    socket.to(data.room).emit('user_typing_stop', {
      userId: user.id,
      cellId: data.cellId
    });
  }

  private handleDisconnect(socket: any) {
    const user = socket.data.user;
    
    // Remove from all rooms
    this.rooms.forEach((room, roomId) => {
      if (room.users.has(user.id)) {
        room.users.delete(user.id);
        
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        } else {
          // Notify remaining users
          socket.to(roomId).emit('user_left', {
            userId: user.id,
            totalUsers: room.users.size
          });
        }
      }
    });

    // Clean up socket mappings
    this.userSockets.delete(user.id);
    this.socketUsers.delete(socket.id);

    // Clean up notification subscription
    this.notificationSubscriptions.delete(socket.id);

    console.log(`User ${user.username} disconnected from WebSocket`);
  }

  // ===== NOTIFICATION HANDLERS =====

  private handleNotificationSubscription(socket: any, data: { categories?: string[]; modules?: string[]; priorities?: string[] }) {
    const user = socket.data.user;
    
    const subscription: NotificationSubscription = {
      userId: user.id,
      categories: data.categories,
      modules: data.modules,
      priorities: data.priorities
    };

    this.notificationSubscriptions.set(socket.id, subscription);
    
    socket.emit('notification_subscription_confirmed', {
      status: 'subscribed',
      subscription: subscription
    });

    console.log(`User ${user.username} subscribed to notifications:`, subscription);
  }

  private handleNotificationUnsubscription(socket: any) {
    const user = socket.data.user;
    
    this.notificationSubscriptions.delete(socket.id);
    
    socket.emit('notification_subscription_confirmed', {
      status: 'unsubscribed'
    });

    console.log(`User ${user.username} unsubscribed from notifications`);
  }

  private handleNotificationRead(socket: any, data: { notificationId: string }) {
    const user = socket.data.user;
    
    // Broadcast to other user sessions that notification was read
    const userSocketId = this.userSockets.get(user.id);
    if (userSocketId && userSocketId !== socket.id) {
      const otherSocket = this.io.sockets.sockets.get(userSocketId);
      if (otherSocket) {
        otherSocket.emit('notification_read_sync', {
          notificationId: data.notificationId,
          userId: user.id
        });
      }
    }

    console.log(`User ${user.username} marked notification as read: ${data.notificationId}`);
  }

  // Public methods for external use
  public broadcastAIProgress(requestId: string, userId: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        const progressEvent: AIStreamEvent = {
          type: 'ai_progress',
          requestId,
          userId,
          data,
          timestamp: new Date()
        };

        // Broadcast to user's rooms
        const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        userRooms.forEach(roomId => {
          this.io.to(roomId).emit('ai_event', progressEvent);
        });
      }
    }
  }

  public broadcastAIComplete(requestId: string, userId: string, result: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        const completeEvent: AIStreamEvent = {
          type: 'ai_complete',
          requestId,
          userId,
          data: result,
          timestamp: new Date()
        };

        // Broadcast to user's rooms
        const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        userRooms.forEach(roomId => {
          this.io.to(roomId).emit('ai_event', completeEvent);
        });
      }
    }
  }

  public broadcastAIError(requestId: string, userId: string, error: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        const errorEvent: AIStreamEvent = {
          type: 'ai_error',
          requestId,
          userId,
          data: { error: error.message || 'Unknown error' },
          timestamp: new Date()
        };

        // Broadcast to user's rooms
        const userRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        userRooms.forEach(roomId => {
          this.io.to(roomId).emit('ai_event', errorEvent);
        });
      }
    }
  }

  public getRoomUsers(roomId: string): UserPresence[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  public getUserRooms(userId: string): string[] {
    const rooms: string[] = [];
    this.rooms.forEach((room, roomId) => {
      if (room.users.has(userId)) {
        rooms.push(roomId);
      }
    });
    return rooms;
  }

  private startCleanupInterval() {
    // Clean up inactive rooms and stale data every 5 minutes
    setInterval(() => {
      const now = new Date();
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

      this.rooms.forEach((room, roomId) => {
        if (now.getTime() - room.lastActivity.getTime() > maxInactiveTime) {
          console.log(`Cleaning up inactive room: ${roomId}`);
          this.rooms.delete(roomId);
        }
      });
    }, 5 * 60 * 1000);
  }

  // ===== NOTIFICATION BROADCAST METHODS =====

  public broadcastNotification(notification: any, eventType: NotificationEvent['type']): void {
    const event: NotificationEvent = {
      type: eventType,
      notification,
      user_id: notification.user_id,
      timestamp: new Date()
    };

    // Find user's socket
    const userSocketId = this.userSockets.get(notification.user_id);
    if (!userSocketId) return;

    const socket = this.io.sockets.sockets.get(userSocketId);
    if (!socket) return;

    // Check if user has notification subscription
    const subscription = this.notificationSubscriptions.get(userSocketId);
    if (!subscription) {
      // If no specific subscription, send all notifications
      socket.emit('notification_event', event);
      return;
    }

    // Check if notification matches subscription filters
    const matchesCategory = !subscription.categories || 
      subscription.categories.includes(notification.category);
    
    const matchesModule = !subscription.modules || 
      !notification.module_name || 
      subscription.modules.includes(notification.module_name);
    
    const matchesPriority = !subscription.priorities || 
      subscription.priorities.includes(notification.priority);

    if (matchesCategory && matchesModule && matchesPriority) {
      socket.emit('notification_event', event);
      
      // For critical notifications, also emit a special alert
      if (notification.priority === 'critical') {
        socket.emit('critical_notification', event);
      }
    }
  }

  public getNotificationSubscriptions(userId: string): NotificationSubscription | null {
    const socketId = this.userSockets.get(userId);
    if (!socketId) return null;
    
    return this.notificationSubscriptions.get(socketId) || null;
  }

  public getUserSocket(userId: string): any | null {
    const socketId = this.userSockets.get(userId);
    if (!socketId) return null;
    
    return this.io.sockets.sockets.get(socketId) || null;
  }

  public getStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: this.io.sockets.sockets.size,
      notificationSubscriptions: this.notificationSubscriptions.size,
      roomDetails: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
        roomId,
        userCount: room.users.size,
        activeSheets: room.activeSheets.size,
        lastActivity: room.lastActivity
      }))
    };
  }
}