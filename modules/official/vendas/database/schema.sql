-- Schema SQL para módulo vendas
-- Criado em: 2025-08-28 23:36

-- Tabela principal do módulo
CREATE TABLE IF NOT EXISTS vendas.main (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES plataforma.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_vendas_main_user_id ON vendas.main(user_id);
CREATE INDEX idx_vendas_main_created_at ON vendas.main(created_at);

-- Comentário na tabela
COMMENT ON TABLE vendas.main IS 'Tabela principal do módulo Vendas';
