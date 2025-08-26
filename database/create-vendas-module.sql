-- Criar tabela vendas no schema do módulo vendas
CREATE TABLE IF NOT EXISTS vendas.vendas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero_pedido TEXT,
  cliente_nome TEXT,
  cliente_cpf TEXT,
  cliente_email TEXT,
  produto TEXT,
  quantidade TEXT,
  preco TEXT,
  desconto TEXT,
  total TEXT,
  data_venda TEXT,
  hora_venda TEXT,
  vendedor TEXT,
  comissao TEXT,
  status TEXT,
  pago TEXT,
  forma_pagamento TEXT,
  parcelas TEXT,
  observacoes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP::text
);

-- Inserir dados de exemplo
INSERT INTO vendas.vendas (
  numero_pedido, cliente_nome, cliente_cpf, cliente_email,
  produto, quantidade, preco, desconto, total,
  data_venda, hora_venda, vendedor, comissao,
  status, pago, forma_pagamento, parcelas, observacoes
) VALUES 
(
  '2024-001',
  'João Silva',
  '12345678901',
  'joao.silva@email.com',
  'Notebook Dell Inspiron',
  '2',
  '3500.00',
  '10',
  '6300.00',
  '2024-01-15',
  '14:30',
  'Maria Santos',
  '5',
  'entregue',
  'true',
  'cartao_credito',
  '3',
  'Cliente preferencial'
),
(
  '2024-002',
  'Ana Costa',
  '98765432100',
  'ana.costa@email.com',
  'Mouse Logitech MX',
  '5',
  '150.00',
  '0',
  '750.00',
  '2024-01-16',
  '10:15',
  'Pedro Oliveira',
  '3',
  'pendente',
  'false',
  'boleto',
  '1',
  'Entrega agendada para próxima semana'
),
(
  '2024-003',
  'Carlos Mendes',
  '55566677788',
  'carlos.mendes@empresa.com',
  'Teclado Mecânico RGB',
  '1',
  '450.00',
  '15',
  '382.50',
  '2024-01-17',
  '16:45',
  'Maria Santos',
  '5',
  'processando',
  'true',
  'pix',
  '1',
  NULL
);

-- Inserir metadados de type hints
INSERT INTO plataforma_core.column_metadata (
  schema_name, table_name, column_name, type_hint, display_name,
  format_options, validation_rules, description
) VALUES
('vendas', 'vendas', 'cliente_cpf', 'cpf', 'CPF do Cliente', '{}', '{"required": true}', 'CPF do cliente'),
('vendas', 'vendas', 'cliente_email', 'email', 'E-mail', '{}', '{"required": true}', 'E-mail do cliente'),
('vendas', 'vendas', 'preco', 'currency', 'Preço Unit.', '{"currency": "BRL"}', '{}', 'Preço unitário'),
('vendas', 'vendas', 'desconto', 'percentage', 'Desconto', '{}', '{}', 'Percentual de desconto'),
('vendas', 'vendas', 'total', 'currency', 'Total', '{"currency": "BRL"}', '{}', 'Valor total'),
('vendas', 'vendas', 'data_venda', 'date', 'Data Venda', '{}', '{}', 'Data da venda'),
('vendas', 'vendas', 'hora_venda', 'time', 'Hora', '{}', '{}', 'Hora da venda'),
('vendas', 'vendas', 'comissao', 'percentage', 'Comissão', '{}', '{}', 'Comissão do vendedor'),
('vendas', 'vendas', 'pago', 'boolean', 'Pago', '{"trueLabel": "Pago", "falseLabel": "Pendente"}', '{}', 'Status de pagamento'),
('vendas', 'vendas', 'status', 'select', 'Status', '{"options": [{"value": "pendente", "label": "Pendente", "color": "yellow"}, {"value": "processando", "label": "Processando", "color": "blue"}, {"value": "entregue", "label": "Entregue", "color": "green"}, {"value": "cancelado", "label": "Cancelado", "color": "red"}]}', '{}', 'Status do pedido'),
('vendas', 'vendas', 'forma_pagamento', 'select', 'Pagamento', '{"options": [{"value": "dinheiro", "label": "Dinheiro"}, {"value": "cartao_credito", "label": "Cartão Crédito"}, {"value": "cartao_debito", "label": "Cartão Débito"}, {"value": "pix", "label": "PIX"}, {"value": "boleto", "label": "Boleto"}]}', '{}', 'Forma de pagamento'),
('vendas', 'vendas', 'quantidade', 'number', 'Qtd', '{"decimals": 0}', '{}', 'Quantidade'),
('vendas', 'vendas', 'parcelas', 'number', 'Parcelas', '{"decimals": 0}', '{}', 'Número de parcelas')
ON CONFLICT (schema_name, table_name, column_name) 
DO UPDATE SET 
  type_hint = EXCLUDED.type_hint,
  display_name = EXCLUDED.display_name,
  format_options = EXCLUDED.format_options,
  validation_rules = EXCLUDED.validation_rules,
  description = EXCLUDED.description;

SELECT 'Tabela vendas.vendas criada com sucesso!' as resultado;
