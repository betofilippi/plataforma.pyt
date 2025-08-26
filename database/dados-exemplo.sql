-- =====================================================
-- DADOS REALISTAS PARA TESTAR SISTEMA TEXT + TYPE HINTS
-- =====================================================
-- Este script insere dados variados para testar:
-- - Detecção automática de tipos
-- - Renderização de diferentes formatos
-- - Casos especiais e edge cases

-- =====================================================
-- PRIMEIRO: METADADOS DE TYPE HINTS
-- =====================================================

-- Definir type hints para as colunas da tabela vendas
INSERT INTO plataforma_core.column_metadata (
    schema_name, table_name, column_name, type_hint, format_options, validation_rules, editor_type, confidence
) VALUES
-- Campos básicos
('public', 'vendas', 'id', 'text', '{"readonly": true}', '{}', 'text', 1.0),
('public', 'vendas', 'produto', 'text', '{}', '{"required": true}', 'text', 1.0),
('public', 'vendas', 'categoria', 'select', '{"options": [{"value": "eletronicos", "label": "Eletrônicos", "color": "blue"}, {"value": "casa", "label": "Casa e Jardim", "color": "green"}, {"value": "moda", "label": "Moda", "color": "purple"}, {"value": "esportes", "label": "Esportes", "color": "orange"}, {"value": "livros", "label": "Livros", "color": "brown"}]}', '{}', 'select', 1.0),
('public', 'vendas', 'descricao', 'textarea', '{"rows": 3}', '{}', 'textarea', 1.0),
('public', 'vendas', 'sku', 'text', '{"pattern": "[A-Z]{2}-[0-9]{4}"}', '{}', 'text', 1.0),

-- Campos financeiros
('public', 'vendas', 'preco', 'currency', '{"currency": "BRL", "decimals": 2, "prefix": "R$ "}', '{"min": 0, "max": 999999.99}', 'currency-input', 1.0),
('public', 'vendas', 'quantidade', 'number', '{"decimals": 0}', '{"min": 1, "max": 9999}', 'number-input', 1.0),
('public', 'vendas', 'total', 'currency', '{"currency": "BRL", "decimals": 2, "prefix": "R$ "}', '{"min": 0, "max": 9999999.99}', 'currency-input', 1.0),
('public', 'vendas', 'desconto', 'percentage', '{"decimals": 2, "suffix": "%"}', '{"min": 0, "max": 1}', 'percentage-input', 1.0),
('public', 'vendas', 'imposto', 'currency', '{"currency": "BRL", "decimals": 2, "prefix": "R$ "}', '{"min": 0}', 'currency-input', 1.0),
('public', 'vendas', 'comissao', 'percentage', '{"decimals": 2, "suffix": "%"}', '{"min": 0, "max": 0.5}', 'percentage-input', 1.0),

-- Dados do cliente
('public', 'vendas', 'cliente_nome', 'text', '{}', '{"required": true}', 'text', 1.0),
('public', 'vendas', 'cliente_cpf', 'cpf', '{"mask": "999.999.999-99"}', '{"validateCPF": true}', 'masked-input', 1.0),
('public', 'vendas', 'cliente_cnpj', 'cnpj', '{"mask": "99.999.999/9999-99"}', '{"validateCNPJ": true}', 'masked-input', 1.0),
('public', 'vendas', 'cliente_email', 'email', '{}', '{"validateEmail": true}', 'email-input', 1.0),
('public', 'vendas', 'cliente_telefone', 'phone', '{"mask": "(99) 99999-9999"}', '{}', 'masked-input', 1.0),
('public', 'vendas', 'cliente_cep', 'cep', '{"mask": "99999-999"}', '{}', 'masked-input', 1.0),

-- Dados da venda
('public', 'vendas', 'vendedor', 'text', '{}', '{}', 'text', 1.0),
('public', 'vendas', 'data_venda', 'date', '{"format": "DD/MM/YYYY"}', '{}', 'date-picker', 1.0),
('public', 'vendas', 'data_entrega', 'date', '{"format": "DD/MM/YYYY"}', '{}', 'date-picker', 1.0),
('public', 'vendas', 'horario_venda', 'datetime', '{"format": "DD/MM/YYYY HH:mm"}', '{}', 'datetime-picker', 1.0),

-- Status e controle
('public', 'vendas', 'status', 'select', '{"options": [{"value": "pendente", "label": "Pendente", "color": "yellow"}, {"value": "aprovado", "label": "Aprovado", "color": "green"}, {"value": "cancelado", "label": "Cancelado", "color": "red"}, {"value": "entregue", "label": "Entregue", "color": "blue"}]}', '{}', 'select', 1.0),
('public', 'vendas', 'prioridade', 'select', '{"options": [{"value": "baixa", "label": "Baixa", "color": "gray"}, {"value": "media", "label": "Média", "color": "yellow"}, {"value": "alta", "label": "Alta", "color": "orange"}, {"value": "urgente", "label": "Urgente", "color": "red"}]}', '{}', 'select', 1.0),
('public', 'vendas', 'pago', 'boolean', '{"trueLabel": "Sim", "falseLabel": "Não"}', '{}', 'switch', 1.0),
('public', 'vendas', 'entregue', 'boolean', '{"trueLabel": "Sim", "falseLabel": "Não"}', '{}', 'switch', 1.0),
('public', 'vendas', 'avaliacao', 'rating', '{"max": 5, "showText": true}', '{}', 'rating', 1.0),

-- Campos especiais  
('public', 'vendas', 'cor_destaque', 'color', '{"palette": ["#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33"]}', '{}', 'color-picker', 1.0),
('public', 'vendas', 'tags', 'tags', '{"suggestions": ["vip", "urgente", "desconto", "primeira-compra", "cliente-fiel"]}', '{}', 'tags-input', 1.0),
('public', 'vendas', 'anexos', 'media', '{"accept": "image/*,application/pdf", "multiple": true}', '{}', 'file-upload', 1.0),
('public', 'vendas', 'localizacao', 'location', '{"showMap": true}', '{}', 'location-picker', 1.0),
('public', 'vendas', 'configuracao', 'json', '{"prettify": true}', '{}', 'json-editor', 1.0),

-- Observações
('public', 'vendas', 'observacoes', 'textarea', '{"rows": 4}', '{}', 'textarea', 1.0),
('public', 'vendas', 'notas_internas', 'textarea', '{"rows": 3}', '{}', 'textarea', 1.0),
('public', 'vendas', 'historico', 'json', '{"readonly": true, "prettify": true}', '{}', 'json-viewer', 1.0);

-- =====================================================
-- DADOS DE VENDAS REALISTAS
-- =====================================================

INSERT INTO vendas (
    produto, categoria, descricao, sku, 
    preco, quantidade, total, desconto, imposto, comissao,
    cliente_nome, cliente_cpf, cliente_cnpj, cliente_email, cliente_telefone,
    cliente_endereco, cliente_cidade, cliente_estado, cliente_cep,
    vendedor, data_venda, data_entrega, horario_venda,
    status, prioridade, pago, entregue, avaliacao,
    cor_destaque, tags, anexos, localizacao, configuracao,
    observacoes, notas_internas, historico,
    created_by, updated_by
) VALUES

-- Venda 1: Notebook gamer completo
(
    'Notebook Gamer Asus ROG 16GB RTX 4060', 'eletronicos',
    'Notebook gamer com processador Intel i7, 16GB RAM, SSD 512GB, placa RTX 4060 8GB, tela 144Hz',
    'NB-4501',
    '4299.90', '1', '4299.90', '0.10', '644.99', '0.03',
    'João Silva Santos', '12345678901', '', 'joao.santos@email.com', '11987654321',
    'Rua das Flores, 123, Ap 45', 'São Paulo', 'SP', '01234567',
    'Maria Fernandes', '2024-01-15', '2024-01-22', '2024-01-15T10:30:00',
    'aprovado', 'alta', 'true', 'false', '5',
    '#1E40AF', '["vip", "primeira-compra"]', 'https://example.com/notebook.jpg',
    '{"lat": -23.550520, "lng": -46.633309}', '{"garantia_extendida": true, "instalacao_gratis": true}',
    'Cliente VIP, dar desconto extra de 10%. Entregar com nota fiscal.',
    'Cliente pediu entrega expressa, cobrar taxa adicional',
    '{"created": "2024-01-15T10:30:00", "status_changes": [{"from": "pendente", "to": "aprovado", "at": "2024-01-15T11:00:00", "by": "maria"}]}',
    'maria.fernandes', 'maria.fernandes'
),

-- Venda 2: Kit para casa 
(
    'Kit Panelas Antiaderente 5 Peças', 'casa',
    'Conjunto de panelas antiaderente com revestimento cerâmico, cabos de silicone',
    'CP-2301',
    '189.90', '2', '379.80', '0.05', '37.98', '0.08',
    'Ana Paula Oliveira', '98765432100', '', 'ana.oliveira@gmail.com', '11976543210',
    'Av. Paulista, 1000', 'São Paulo', 'SP', '01310100',
    'Carlos Mendes', '2024-01-16', '2024-01-20', '2024-01-16T14:15:30',
    'pendente', 'media', 'false', 'false', '',
    '#10B981', '["desconto"]', '',
    '{"lat": -23.561684, "lng": -46.655981}', '{}',
    'Cliente solicitou embalagem para presente',
    '',
    '{"created": "2024-01-16T14:15:30"}',
    'carlos.mendes', 'carlos.mendes'
),

-- Venda 3: Tênis esportivo
(
    'Tênis Nike Air Max 270 Masculino', 'esportes',
    'Tênis de corrida com tecnologia Air Max, solado em borracha, cabedal em mesh respirável',
    'TN-8801',
    '499.99', '1', '499.99', '0.15', '50.00', '0.12',
    'Pedro Henrique Costa', '45678901234', '', 'pedro.costa@hotmail.com', '11965432109',
    'Rua Augusta, 2500, casa 12', 'São Paulo', 'SP', '01412000',
    'Fernanda Lima', '2024-01-17', '2024-01-25', '2024-01-17T09:45:22',
    'cancelado', 'baixa', 'false', 'false', '2',
    '#EF4444', '["desconto"]', '',
    '{"lat": -23.554820, "lng": -46.662820}', '{"tamanho": "42", "cor": "preto"}',
    'Cliente cancelou por não ter o tamanho',
    'Verificar estoque de tamanhos antes de confirmar vendas',
    '{"created": "2024-01-17T09:45:22", "status_changes": [{"from": "pendente", "to": "cancelado", "at": "2024-01-17T16:30:00", "by": "fernanda", "reason": "tamanho indisponível"}]}',
    'fernanda.lima', 'fernanda.lima'
),

-- Venda 4: Empresa (CNPJ)
(
    'Kit Escritório Completo - 10 Cadeiras + Mesa', 'casa',
    'Kit para escritório com 10 cadeiras ergonômicas e mesa de reunião 3x1,5m em MDF',
    'KE-5501',
    '3200.00', '1', '3200.00', '0.20', '320.00', '0.05',
    'Tech Solutions Ltda', '', '12345678000195', 'compras@techsolutions.com.br', '1133445566',
    'Av. Faria Lima, 3500, cj 1203', 'São Paulo', 'SP', '04538133',
    'Roberto Silva', '2024-01-18', '2024-01-30', '2024-01-18T11:20:45',
    'aprovado', 'alta', 'true', 'false', '4',
    '#8B5CF6', '["empresarial", "urgente"]', 'https://example.com/orcamento.pdf',
    '{"lat": -23.578499, "lng": -46.680416}', '{"montagem_incluida": true, "prazo_entrega": 30}',
    'Empresa grande, sempre compra em volume. Dar desconto especial.',
    'Coordenar entrega com portaria do prédio',
    '{"created": "2024-01-18T11:20:45", "approved": "2024-01-18T11:45:00"}',
    'roberto.silva', 'roberto.silva'
),

-- Venda 5: Livro (baixo valor)
(
    'Clean Code - Código Limpo', 'livros',
    'Livro sobre boas práticas de programação e desenvolvimento de software',
    'LV-1001',
    '65.90', '3', '197.70', '0.00', '19.77', '0.15',
    'Marcos Antônio Pereira', '78945612300', '', 'marcos.dev@empresa.com', '11954321098',
    'Rua Vergueiro, 800', 'São Paulo', 'SP', '01504000',
    'Julia Santos', '2024-01-19', '2024-01-24', '2024-01-19T16:30:15',
    'entregue', 'media', 'true', 'true', '5',
    '#059669', '["cliente-fiel"]', '',
    '{"lat": -23.569000, "lng": -46.623000}', '{"edicao": "português", "ano": 2020}',
    'Cliente é desenvolvedor, sempre compra livros técnicos',
    'Cliente fiel, dar prioridade nas entregas',
    '{"created": "2024-01-19T16:30:15", "delivered": "2024-01-24T10:15:00", "rating_received": "2024-01-25T09:00:00"}',
    'julia.santos', 'julia.santos'
),

-- Venda 6: Valores especiais/nulos para testar edge cases
(
    'Produto em Promoção', 'moda',
    '', 'PR-0001',
    '0.01', '999', '9.99', '0.99', '', '0.50',
    'Cliente Teste', '', '', 'teste@test.com', '',
    '', '', '', '',
    'Sistema Automático', '2024-01-20', '', '2024-01-20T00:00:00',
    'pendente', 'urgente', '', '', '',
    '#FF0000', '[]', '', '', '{}',
    '', '',
    '{"created": "2024-01-20T00:00:00", "is_test": true}',
    'sistema', 'sistema'
),

-- Mais vendas para volume de dados...
(
    'Smartphone Samsung Galaxy A54', 'eletronicos',
    'Smartphone com tela 6.4", câmera tripla 50MP, 128GB, Android 13',
    'SM-7701',
    '1299.00', '1', '1299.00', '0.08', '129.90', '0.04',
    'Carla Regina Souza', '11122233344', '', 'carla.souza@outlook.com', '11988776655',
    'Rua Dr. Arnaldo, 456', 'São Paulo', 'SP', '01246001',
    'Anderson Lopes', '2024-01-21', '2024-01-28', '2024-01-21T13:45:30',
    'aprovado', 'media', 'true', 'false', '',
    '#3B82F6', '["desconto", "vip"]', 'https://example.com/smartphone.jpg',
    '{"lat": -23.548943, "lng": -46.655844}', '{"cor": "azul", "memoria": "128GB", "operadora": "vivo"}',
    'Cliente trocou de iPhone para Samsung',
    'Verificar se precisa de película protetora',
    '{"created": "2024-01-21T13:45:30"}',
    'anderson.lopes', 'anderson.lopes'
),

(
    'Perfume Chanel No 5 - 100ml', 'moda', 
    'Perfume feminino clássico, fragrância floral, frasco de 100ml',
    'PF-9901',
    '890.00', '1', '890.00', '0.00', '89.00', '0.10',
    'Isabella Martins', '55566677788', '', 'isabella.martins@gmail.com', '11977788899',
    'Rua Oscar Freire, 1200', 'São Paulo', 'SP', '01426001',
    'Patricia Oliveira', '2024-01-22', '2024-01-29', '2024-01-22T15:20:10',
    'aprovado', 'alta', 'true', 'false', '5',
    '#EC4899', '["luxo", "presente"]', '',
    '{"lat": -23.561400, "lng": -46.669847}', '{"embalagem_presente": true, "cartao_personalizado": "Para minha mãe querida"}',
    'Presente de aniversário para a mãe',
    'Caprichar na embalagem, é presente',
    '{"created": "2024-01-22T15:20:10", "gift": true}',
    'patricia.oliveira', 'patricia.oliveira'
);

-- =====================================================
-- DADOS ADICIONAIS PARA TESTE
-- =====================================================

-- Inserir mais algumas vendas com dados variados
INSERT INTO vendas (
    produto, categoria, preco, quantidade, total, 
    cliente_nome, cliente_cpf, cliente_telefone,
    vendedor, data_venda, status, pago, avaliacao,
    tags, created_by
) VALUES 
('Mouse Gamer RGB', 'eletronicos', '129.90', '2', '259.80', 'Rafael Santos', '99988877766', '11966554433', 'Maria Fernandes', '2024-01-23', 'entregue', 'true', '4', '["gamer"]', 'maria.fernandes'),
('Cafeteira Elétrica', 'casa', '259.90', '1', '259.90', 'Lucia Ferreira', '44433322211', '11955443322', 'Carlos Mendes', '2024-01-23', 'pendente', 'false', '', '[]', 'carlos.mendes'),
('Camiseta Básica Branca', 'moda', '39.90', '5', '199.50', 'Bruno Almeida', '33322211100', '11944332211', 'Fernanda Lima', '2024-01-24', 'aprovado', 'true', '3', '["basico"]', 'fernanda.lima');

-- =====================================================
-- VERIFICAÇÃO DOS DADOS
-- =====================================================

-- Contar registros inseridos
SELECT 
    'Dados inseridos com sucesso!' as status,
    COUNT(*) as total_vendas,
    COUNT(DISTINCT vendedor) as total_vendedores,
    COUNT(DISTINCT categoria) as total_categorias
FROM vendas;

-- Mostrar amostra dos dados
SELECT 
    produto,
    preco,
    cliente_nome,
    status,
    data_venda
FROM vendas 
LIMIT 5;