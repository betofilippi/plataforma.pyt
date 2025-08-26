import { Request, Response } from 'express';
import axios from 'axios';

// Z-API Configuration
export interface ZAPIConfig {
  instanceId: string;
  token: string;
  clientToken?: string;
  baseUrl: string;
  webhookUrl?: string;
}

// Message Types
export interface ZAPIMessage {
  phone: string;
  message: string;
  isGroup?: boolean;
  messageId?: string;
  delayMessage?: number;
}

export interface ZAPIMediaMessage extends ZAPIMessage {
  image?: string;
  audio?: string;
  video?: string;
  document?: string;
  fileName?: string;
  caption?: string;
}

export interface ZAPIWebhookPayload {
  instanceId: string;
  event: string;
  phone?: string;
  message?: any;
  messageId?: string;
  status?: string;
  timestamp?: number;
}

// Captain AI Configuration
export interface CaptainConfig {
  enabled: boolean;
  autoReply: boolean;
  autoResolve: boolean;
  customInstructions?: string;
  knowledgeBase?: string[];
  handoffKeywords?: string[];
  businessHours?: {
    start: string;
    end: string;
    timezone: string;
    workDays: number[];
  };
}

class ZAPIService {
  private config: ZAPIConfig;
  private captainConfig: CaptainConfig;
  private activeInstances: Map<string, any> = new Map();

  constructor() {
    this.config = {
      instanceId: process.env.ZAPI_INSTANCE_ID || '',
      token: process.env.ZAPI_TOKEN || '',
      clientToken: process.env.ZAPI_CLIENT_TOKEN,
      baseUrl: process.env.ZAPI_BASE_URL || 'https://api.z-api.io',
      webhookUrl: process.env.ZAPI_WEBHOOK_URL
    };

    this.captainConfig = {
      enabled: true,
      autoReply: true,
      autoResolve: false,
      customInstructions: 'Seja educado e profissional. Responda em português brasileiro.',
      knowledgeBase: [],
      handoffKeywords: ['falar com humano', 'atendente', 'ajuda', 'urgente'],
      businessHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo',
        workDays: [1, 2, 3, 4, 5] // Monday to Friday
      }
    };
  }

  // Initialize instance
  async initializeInstance(instanceId: string, token: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/instances/${instanceId}/token/${token}/status`
      );
      
      if (response.data.connected) {
        this.activeInstances.set(instanceId, {
          ...response.data,
          token,
          connectedAt: new Date()
        });
        return response.data;
      }
      
      // If not connected, get QR Code
      return await this.getQRCode(instanceId, token);
    } catch (error) {
      console.error('Error initializing Z-API instance:', error);
      throw error;
    }
  }

  // Get QR Code for authentication
  async getQRCode(instanceId: string, token: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/instances/${instanceId}/token/${token}/qr-code/image`
      );
      return {
        qrCode: response.data.value,
        status: 'waiting_qr_scan'
      };
    } catch (error) {
      console.error('Error getting QR Code:', error);
      throw error;
    }
  }

  // Send text message
  async sendTextMessage(phone: string, message: string, instanceId?: string): Promise<any> {
    const instance = instanceId || this.config.instanceId;
    const token = this.activeInstances.get(instance)?.token || this.config.token;
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/instances/${instance}/token/${token}/send-text`,
        {
          phone: this.formatPhoneNumber(phone),
          message: message
        }
      );
      
      // Save to database
      await this.saveMessage({
        instanceId: instance,
        phone,
        message,
        type: 'sent',
        status: 'sent',
        messageId: response.data.messageId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send media message
  async sendMediaMessage(data: ZAPIMediaMessage, instanceId?: string): Promise<any> {
    const instance = instanceId || this.config.instanceId;
    const token = this.activeInstances.get(instance)?.token || this.config.token;
    
    let endpoint = 'send-text';
    let payload: any = {
      phone: this.formatPhoneNumber(data.phone)
    };
    
    if (data.image) {
      endpoint = 'send-image';
      payload.image = data.image;
      payload.caption = data.caption || '';
    } else if (data.audio) {
      endpoint = 'send-audio';
      payload.audio = data.audio;
    } else if (data.video) {
      endpoint = 'send-video';
      payload.video = data.video;
      payload.caption = data.caption || '';
    } else if (data.document) {
      endpoint = 'send-document';
      payload.document = data.document;
      payload.fileName = data.fileName || 'document.pdf';
    }
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/instances/${instance}/token/${token}/${endpoint}`,
        payload
      );
      
      await this.saveMessage({
        instanceId: instance,
        phone: data.phone,
        message: data.caption || 'Media',
        type: 'sent',
        status: 'sent',
        messageId: response.data.messageId,
        mediaUrl: data.image || data.audio || data.video || data.document
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  }

  // Webhook handler for incoming messages
  async handleWebhook(payload: ZAPIWebhookPayload): Promise<any> {
    console.log('Webhook received:', payload);
    
    try {
      switch (payload.event) {
        case 'message-received':
          await this.handleIncomingMessage(payload);
          break;
        
        case 'message-status':
          await this.updateMessageStatus(payload);
          break;
        
        case 'connection-update':
          await this.handleConnectionUpdate(payload);
          break;
        
        case 'presence-update':
          await this.handlePresenceUpdate(payload);
          break;
        
        default:
          console.log('Unknown webhook event:', payload.event);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Webhook handler error:', error);
      throw error;
    }
  }

  // Handle incoming messages
  private async handleIncomingMessage(payload: ZAPIWebhookPayload) {
    const { phone, message, messageId, instanceId } = payload;
    
    // Save incoming message
    await this.saveMessage({
      instanceId,
      phone: phone!,
      message: message.text || message.caption || 'Media',
      type: 'received',
      status: 'received',
      messageId,
      mediaUrl: message.image || message.audio || message.video || message.document
    });
    
    // Captain AI processing
    if (this.captainConfig.enabled && this.captainConfig.autoReply) {
      const reply = await this.processCaptainAI(message.text, phone!);
      if (reply) {
        await this.sendTextMessage(phone!, reply, instanceId);
      }
    }
  }

  // Captain AI processor
  private async processCaptainAI(message: string, phone: string): Promise<string | null> {
    // Check for handoff keywords
    const needsHuman = this.captainConfig.handoffKeywords?.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (needsHuman) {
      await this.createSupportTicket(phone, message);
      return 'Um atendente humano entrará em contato em breve. Obrigado pela paciência!';
    }
    
    // Check business hours
    if (!this.isBusinessHours()) {
      return 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Retornaremos seu contato no próximo dia útil.';
    }
    
    // Simple FAQ responses (expand this with actual AI integration)
    const faqs = [
      { keywords: ['preço', 'valor', 'custo'], response: 'Para informações sobre preços, visite nosso catálogo em www.exemplo.com/precos' },
      { keywords: ['horário', 'funcionamento', 'aberto'], response: 'Funcionamos de segunda a sexta, das 8h às 18h.' },
      { keywords: ['localização', 'endereço', 'onde'], response: 'Estamos localizados na Rua Exemplo, 123 - Centro' },
      { keywords: ['pedido', 'status', 'entrega'], response: 'Para verificar o status do seu pedido, informe o número do pedido.' }
    ];
    
    for (const faq of faqs) {
      if (faq.keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return faq.response;
      }
    }
    
    // Default response
    return null;
  }

  // Update message status
  private async updateMessageStatus(payload: ZAPIWebhookPayload) {
    // Update message status in database
    // Implementation depends on your database schema
    console.log('Message status update:', payload.messageId, payload.status);
  }

  // Handle connection updates
  private async handleConnectionUpdate(payload: ZAPIWebhookPayload) {
    const { instanceId, status } = payload;
    
    if (status === 'connected') {
      console.log(`Instance ${instanceId} connected`);
      // Update instance status in database
    } else if (status === 'disconnected') {
      console.log(`Instance ${instanceId} disconnected`);
      // Handle reconnection logic
    }
  }

  // Handle presence updates
  private async handlePresenceUpdate(payload: ZAPIWebhookPayload) {
    // Update contact presence status
    console.log('Presence update:', payload.phone, payload.status);
  }

  // Utility functions
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    const startHour = parseInt(this.captainConfig.businessHours!.start.split(':')[0]);
    const endHour = parseInt(this.captainConfig.businessHours!.end.split(':')[0]);
    
    return (
      this.captainConfig.businessHours!.workDays.includes(day) &&
      hour >= startHour &&
      hour < endHour
    );
  }

  private async saveMessage(data: any) {
    // Save to database
    // This should be implemented with your actual database logic
    console.log('Saving message:', data);
  }

  private async createSupportTicket(phone: string, message: string) {
    // Create support ticket for human handoff
    console.log('Creating support ticket for:', phone, message);
  }

  // Get conversation history
  async getConversationHistory(phone: string, limit: number = 50): Promise<any[]> {
    // Fetch from database
    // This is a placeholder - implement with your actual database
    return [];
  }

  // Get all conversations
  async getAllConversations(instanceId?: string): Promise<any[]> {
    // Fetch from database
    // This is a placeholder - implement with your actual database
    return [];
  }

  // Disconnect instance
  async disconnectInstance(instanceId: string): Promise<any> {
    const token = this.activeInstances.get(instanceId)?.token;
    if (!token) {
      throw new Error('Instance not found');
    }
    
    try {
      const response = await axios.delete(
        `${this.config.baseUrl}/instances/${instanceId}/token/${token}/disconnect`
      );
      
      this.activeInstances.delete(instanceId);
      return response.data;
    } catch (error) {
      console.error('Error disconnecting instance:', error);
      throw error;
    }
  }

  // Restart instance
  async restartInstance(instanceId: string): Promise<any> {
    const token = this.activeInstances.get(instanceId)?.token;
    if (!token) {
      throw new Error('Instance not found');
    }
    
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/instances/${instanceId}/token/${token}/restart`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error restarting instance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const zapiService = new ZAPIService();

// Express route handlers
export const zapiRoutes = {
  // Initialize instance
  async initialize(req: Request, res: Response) {
    try {
      const { instanceId, token } = req.body;
      const result = await zapiService.initializeInstance(instanceId, token);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize instance' });
    }
  },

  // Get QR Code
  async getQRCode(req: Request, res: Response) {
    try {
      const { instanceId, token } = req.params;
      const result = await zapiService.getQRCode(instanceId, token);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get QR Code' });
    }
  },

  // Send message
  async sendMessage(req: Request, res: Response) {
    try {
      const { phone, message, instanceId } = req.body;
      const result = await zapiService.sendTextMessage(phone, message, instanceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  },

  // Send media
  async sendMedia(req: Request, res: Response) {
    try {
      const result = await zapiService.sendMediaMessage(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to send media' });
    }
  },

  // Webhook handler
  async webhook(req: Request, res: Response) {
    try {
      const result = await zapiService.handleWebhook(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },

  // Get conversations
  async getConversations(req: Request, res: Response) {
    try {
      const { instanceId } = req.params;
      const result = await zapiService.getAllConversations(instanceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  },

  // Get conversation history
  async getHistory(req: Request, res: Response) {
    try {
      const { phone } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await zapiService.getConversationHistory(phone, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get history' });
    }
  },

  // Disconnect
  async disconnect(req: Request, res: Response) {
    try {
      const { instanceId } = req.params;
      const result = await zapiService.disconnectInstance(instanceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect' });
    }
  }
};