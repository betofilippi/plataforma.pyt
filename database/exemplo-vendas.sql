-- =====================================================
-- TABELA EXEMPLO PARA SISTEMA TEXT + TYPE HINTS
-- =====================================================
-- Esta tabela demonstra o novo sistema onde:
-- - TODOS os campos são TEXT (compatibilidade máxima)
-- - Type hints definem como mostrar/editar
-- - Validação e formatação ficam no frontend

-- Garantir que estamos no schema public
SET search_path TO public;

-- =====================================================
-- TABELA DE VENDAS - EXEMPLO COMPLETO
-- =====================================================

CREATE TABLE IF NOT EXISTS vendas (
    -- Chave primária (sempre TEXT)
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Campos básicos do produto
    produto TEXT,                    -- Nome do produto
    categoria TEXT,                  -- Categoria (eletrônicos, casa, etc)
    descricao TEXT,                  -- Descrição detalhada
    sku TEXT,                        -- Código SKU
    
    -- Campos financeiros (armazenados como TEXT)
    preco TEXT,                      -- Ex: "1234.56" (type_hint: currency)
    quantidade TEXT,                 -- Ex: "10" (type_hint: number)
    total TEXT,                      -- Ex: "12345.60" (type_hint: currency)
    desconto TEXT,                   -- Ex: "0.15" (type_hint: percentage)
    imposto TEXT,                    -- Ex: "123.45" (type_hint: currency)
    
    -- Dados do cliente (TEXT com formatação específica)
    cliente_nome TEXT,               -- Nome completo
    cliente_cpf TEXT,                -- Ex: "12345678900" (type_hint: cpf)
    cliente_cnpj TEXT,               -- Ex: "12345678000195" (type_hint: cnpj)
    cliente_email TEXT,              -- Ex: "cliente@email.com" (type_hint: email)
    cliente_telefone TEXT,           -- Ex: "11987654321" (type_hint: phone)
    cliente_endereco TEXT,           -- Endereço completo
    cliente_cidade TEXT,             -- Cidade
    cliente_estado TEXT,             -- Estado/UF
    cliente_cep TEXT,                -- Ex: "01234567" (type_hint: cep)
    
    -- Dados da venda
    vendedor TEXT,                   -- Nome do vendedor
    comissao TEXT,                   -- Ex: "0.05" (type_hint: percentage)
    data_venda TEXT,                 -- Ex: "2024-01-15" (type_hint: date)
    data_entrega TEXT,               -- Ex: "2024-01-20" (type_hint: date)
    horario_venda TEXT,              -- Ex: "2024-01-15T10:30:00" (type_hint: datetime)
    
    -- Status e controle
    status TEXT,                     -- Ex: "pendente" (type_hint: select)
    prioridade TEXT,                 -- Ex: "alta" (type_hint: select)
    pago TEXT,                       -- Ex: "true" (type_hint: boolean)
    entregue TEXT,                   -- Ex: "false" (type_hint: boolean)
    avaliacao TEXT,                  -- Ex: "5" (type_hint: rating)
    
    -- Campos especiais
    cor_destaque TEXT,               -- Ex: "#FF5733" (type_hint: color)
    tags TEXT,                       -- Ex: ["vip","urgente"] (type_hint: tags)
    anexos TEXT,                     -- URLs ou JSON (type_hint: media)
    localizacao TEXT,                -- Ex: {"lat":-23.55,"lng":-46.63} (type_hint: location)
    configuracao TEXT,               -- JSON customizado (type_hint: json)
    
    -- Observações e notas
    observacoes TEXT,                -- Texto livre
    notas_internas TEXT,             -- Notas da equipe
    historico TEXT,                  -- JSON com histórico de mudanças
    
    -- Campos de auditoria (TEXT para simplicidade)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
    created_by TEXT,
    updated_by TEXT
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_vendas_produto ON vendas(produto);
CREATE INDEX IF NOT EXISTS idx_vendas_categoria ON vendas(categoria);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_cpf ON vendas(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas(vendedor);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);

-- Índices compostos úteis
CREATE INDEX IF NOT EXISTS idx_vendas_status_data ON vendas(status, data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_data ON vendas(vendedor, data_venda);

-- =====================================================
-- COMENTÁRIOS EXPLICATIVOS
-- =====================================================

COMMENT ON TABLE vendas IS 'Tabela exemplo para sistema TEXT + Type Hints - todos os campos são TEXT no banco mas formatados no frontend';

-- Comentários em campos específicos
COMMENT ON COLUMN vendas.preco IS 'Preço como TEXT. Ex: "1234.56". Type hint: currency';
COMMENT ON COLUMN vendas.cliente_cpf IS 'CPF como TEXT sem formatação. Ex: "12345678900". Type hint: cpf';
COMMENT ON COLUMN vendas.data_venda IS 'Data como TEXT ISO. Ex: "2024-01-15". Type hint: date';
COMMENT ON COLUMN vendas.status IS 'Status como TEXT. Ex: "pendente". Type hint: select com opções predefinidas';
COMMENT ON COLUMN vendas.pago IS 'Boolean como TEXT. Ex: "true"/"false". Type hint: boolean';
COMMENT ON COLUMN vendas.cor_destaque IS 'Cor como HEX TEXT. Ex: "#FF5733". Type hint: color';
COMMENT ON COLUMN vendas.localizacao IS 'Coordenadas como JSON TEXT. Ex: {"lat":-23.55,"lng":-46.63}. Type hint: location';
COMMENT ON COLUMN vendas.tags IS 'Array como JSON TEXT. Ex: ["vip","urgente"]. Type hint: tags';

-- =====================================================
-- TRIGGER PARA UPDATED_AT (OPCIONAL)
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela vendas
DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
CREATE TRIGGER update_vendas_updated_at
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

SELECT 'Tabela de vendas criada com sucesso!' as status;
SELECT 'Todos os campos são TEXT - compatibilidade máxima com Supabase' as info;
SELECT 'Use type hints no frontend para formatação rica' as dica;