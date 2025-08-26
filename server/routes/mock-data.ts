import { Request, Response } from 'express';

// Mock data generators
const generateMockUsers = (page: number, pageSize: number) => {
  const users = [];
  const startIndex = (page - 1) * pageSize;
  
  for (let i = 0; i < pageSize; i++) {
    const id = startIndex + i + 1;
    users.push({
      id: `user-${id}`,
      name: `Usuário ${id}`,
      email: `usuario${id}@plataforma.app`,
      role: ['admin', 'user', 'viewer'][id % 3],
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=User${id}&backgroundColor=6366f1&textColor=ffffff`
    });
  }
  
  return users;
};

const generateMockTables = (page: number, pageSize: number) => {
  const tables = [];
  const startIndex = (page - 1) * pageSize;
  const schemas = ['public', 'plataforma_core', 'products_app', 'estoques_app'];
  
  for (let i = 0; i < pageSize; i++) {
    const id = startIndex + i + 1;
    const schema = schemas[id % schemas.length];
    tables.push({
      id: `table-${id}`,
      name: `tabela_${id.toString().padStart(3, '0')}`,
      schema: schema,
      row_count: Math.floor(Math.random() * 10000),
      size: `${Math.floor(Math.random() * 500)}MB`,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_updated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return tables;
};

const generateMockFiles = (page: number, pageSize: number) => {
  const files = [];
  const startIndex = (page - 1) * pageSize;
  const types = ['image/png', 'image/jpeg', 'application/pdf', 'text/csv', 'application/xlsx'];
  const extensions = ['png', 'jpg', 'pdf', 'csv', 'xlsx'];
  
  for (let i = 0; i < pageSize; i++) {
    const id = startIndex + i + 1;
    const typeIndex = id % types.length;
    const size = Math.floor(Math.random() * 10000000); // bytes
    
    files.push({
      id: `file-${id}`,
      name: `arquivo_${id.toString().padStart(3, '0')}.${extensions[typeIndex]}`,
      content_type: types[typeIndex],
      size: size,
      size_formatted: formatFileSize(size),
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      owner: `Usuário ${Math.floor(Math.random() * 100) + 1}`
    });
  }
  
  return files;
};

const generateMockNotifications = (page: number, pageSize: number) => {
  const notifications = [];
  const startIndex = (page - 1) * pageSize;
  const types = ['info', 'success', 'warning', 'error'];
  const titles = [
    'Nova versão disponível',
    'Backup realizado com sucesso',
    'Falha na sincronização',
    'Sistema será reiniciado',
    'Novo usuário cadastrado',
    'Limite de armazenamento atingido',
    'Atualização de segurança',
    'Tarefa concluída'
  ];
  
  for (let i = 0; i < pageSize; i++) {
    const id = startIndex + i + 1;
    const title = titles[id % titles.length];
    
    notifications.push({
      id: `notification-${id}`,
      title: title,
      message: `Esta é uma notificação de exemplo número ${id}. Contém informações importantes sobre o sistema.`,
      type: types[id % types.length],
      read: Math.random() > 0.3, // 70% chance of being read
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: `user-${Math.floor(Math.random() * 50) + 1}`
    });
  }
  
  return notifications;
};

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

// Route handlers
export const getMockUsers = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const total = 1000; // Total mock users
  
  // Simulate network delay
  setTimeout(() => {
    const data = generateMockUsers(page, limit);
    const hasNextPage = (page * limit) < total;
    
    res.json({
      data,
      total,
      page,
      pageSize: limit,
      hasNextPage
    });
  }, Math.random() * 500 + 200); // 200-700ms delay
};

export const getMockTables = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const total = 150; // Total mock tables
  
  setTimeout(() => {
    const data = generateMockTables(page, limit);
    const hasNextPage = (page * limit) < total;
    
    res.json({
      data,
      total,
      page,
      pageSize: limit,
      hasNextPage
    });
  }, Math.random() * 800 + 300);
};

export const getMockFiles = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const total = 2500; // Total mock files
  
  setTimeout(() => {
    const data = generateMockFiles(page, limit);
    const hasNextPage = (page * limit) < total;
    
    res.json({
      data,
      total,
      page,
      pageSize: limit,
      hasNextPage
    });
  }, Math.random() * 600 + 250);
};

export const getMockNotifications = (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const total = 500; // Total mock notifications
  
  setTimeout(() => {
    const data = generateMockNotifications(page, limit);
    const hasNextPage = (page * limit) < total;
    
    res.json({
      data,
      total,
      page,
      pageSize: limit,
      hasNextPage
    });
  }, Math.random() * 400 + 150);
};