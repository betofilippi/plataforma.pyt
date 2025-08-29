#!/usr/bin/env python3
"""
Criação Completa do Módulo Vendas
Demonstra a arquitetura: cada módulo tem seu próprio schema com tabelas de componentes
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from urllib.parse import quote_plus
from datetime import datetime

load_dotenv()

def create_vendas_module():
    """
    Cria o módulo vendas completo com todas as tabelas de componentes
    Implementa a regra: cada módulo tem seu próprio schema
    """
    print("CRIANDO MODULO VENDAS COMPLETO")
    print("=" * 60)
    
    # Conexão com o banco
    project_id = "kblvviunzleurqlskeab"
    db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
    db_password_encoded = quote_plus(db_password)
    conn_string = f"postgresql://postgres:{db_password_encoded}@db.{project_id}.supabase.co:5432/postgres"
    
    try:
        conn = psycopg2.connect(conn_string)
        conn.autocommit = True
        cursor = conn.cursor()
        print("Conectado ao banco de dados")
        
        # 1. Criar schema vendas (se não existir)
        print("\n1. Criando schema 'vendas'...")
        cursor.execute(
            sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(
                sql.Identifier('vendas')
            )
        )
        cursor.execute(
            sql.SQL("COMMENT ON SCHEMA {} IS %s").format(
                sql.Identifier('vendas')
            ),
            ("Módulo de gestão de vendas - Schema isolado com todas as tabelas do módulo",)
        )
        print("   OK: Schema vendas criado/verificado")
        
        # 2. Criar tabela principal de vendas
        print("\n2. Criando tabelas do módulo vendas...")
        
        # Tabela: vendas.pedidos (tabela principal)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.pedidos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                numero_pedido VARCHAR(20) UNIQUE NOT NULL,
                data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
                cliente_id UUID NOT NULL,
                vendedor_id UUID REFERENCES plataforma.users(id),
                valor_total DECIMAL(12,2) DEFAULT 0,
                desconto_percentual DECIMAL(5,2) DEFAULT 0,
                desconto_valor DECIMAL(12,2) DEFAULT 0,
                valor_final DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'rascunho',
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.pedidos criada")
        
        # Tabela: vendas.clientes (componente clientes)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.clientes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                codigo_cliente VARCHAR(20) UNIQUE,
                nome VARCHAR(200) NOT NULL,
                tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF', 'PJ')),
                cpf_cnpj VARCHAR(20) UNIQUE,
                email VARCHAR(255),
                telefone VARCHAR(20),
                celular VARCHAR(20),
                endereco_cep VARCHAR(10),
                endereco_logradouro VARCHAR(255),
                endereco_numero VARCHAR(20),
                endereco_complemento VARCHAR(100),
                endereco_bairro VARCHAR(100),
                endereco_cidade VARCHAR(100),
                endereco_uf VARCHAR(2),
                limite_credito DECIMAL(12,2) DEFAULT 0,
                observacoes TEXT,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.clientes criada")
        
        # Tabela: vendas.produtos (componente produtos)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.produtos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                codigo VARCHAR(50) UNIQUE NOT NULL,
                nome VARCHAR(200) NOT NULL,
                descricao TEXT,
                categoria_id UUID,
                unidade_medida VARCHAR(10) DEFAULT 'UN',
                preco_custo DECIMAL(12,2) DEFAULT 0,
                preco_venda DECIMAL(12,2) NOT NULL,
                margem_lucro DECIMAL(5,2),
                estoque_minimo INTEGER DEFAULT 0,
                estoque_atual INTEGER DEFAULT 0,
                ncm VARCHAR(20),
                ean VARCHAR(20),
                sku VARCHAR(50),
                peso_bruto DECIMAL(10,3),
                peso_liquido DECIMAL(10,3),
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.produtos criada")
        
        # Tabela: vendas.categorias_produto (componente categorias)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.categorias_produto (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(100) NOT NULL,
                descricao TEXT,
                categoria_pai_id UUID REFERENCES vendas.categorias_produto(id),
                ordem INTEGER DEFAULT 0,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.categorias_produto criada")
        
        # Tabela: vendas.itens_pedido (componente itens)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.itens_pedido (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                pedido_id UUID NOT NULL REFERENCES vendas.pedidos(id) ON DELETE CASCADE,
                produto_id UUID NOT NULL REFERENCES vendas.produtos(id),
                quantidade DECIMAL(10,3) NOT NULL,
                preco_unitario DECIMAL(12,2) NOT NULL,
                desconto_percentual DECIMAL(5,2) DEFAULT 0,
                desconto_valor DECIMAL(12,2) DEFAULT 0,
                valor_total DECIMAL(12,2) NOT NULL,
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.itens_pedido criada")
        
        # Tabela: vendas.formas_pagamento (componente pagamentos)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.formas_pagamento (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nome VARCHAR(50) NOT NULL,
                tipo VARCHAR(20) CHECK (tipo IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'cheque', 'outros')),
                taxa_percentual DECIMAL(5,2) DEFAULT 0,
                prazo_dias INTEGER DEFAULT 0,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.formas_pagamento criada")
        
        # Tabela: vendas.pagamentos_pedido (componente pagamentos do pedido)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.pagamentos_pedido (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                pedido_id UUID NOT NULL REFERENCES vendas.pedidos(id) ON DELETE CASCADE,
                forma_pagamento_id UUID REFERENCES vendas.formas_pagamento(id),
                valor DECIMAL(12,2) NOT NULL,
                data_vencimento DATE,
                data_pagamento DATE,
                status VARCHAR(20) DEFAULT 'pendente',
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.pagamentos_pedido criada")
        
        # Tabela: vendas.comissoes (componente comissões)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.comissoes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                pedido_id UUID NOT NULL REFERENCES vendas.pedidos(id),
                vendedor_id UUID NOT NULL REFERENCES plataforma.users(id),
                percentual_comissao DECIMAL(5,2) NOT NULL,
                valor_base DECIMAL(12,2) NOT NULL,
                valor_comissao DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pendente',
                data_pagamento DATE,
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("   OK: Tabela vendas.comissoes criada")
        
        # Tabela: vendas.metas_vendas (componente metas)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vendas.metas_vendas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vendedor_id UUID REFERENCES plataforma.users(id),
                ano INTEGER NOT NULL,
                mes INTEGER NOT NULL,
                valor_meta DECIMAL(12,2) NOT NULL,
                valor_realizado DECIMAL(12,2) DEFAULT 0,
                percentual_atingido DECIMAL(5,2) DEFAULT 0,
                bonus_percentual DECIMAL(5,2) DEFAULT 0,
                observacoes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(vendedor_id, ano, mes)
            )
        """)
        print("   OK: Tabela vendas.metas_vendas criada")
        
        # 3. Criar índices para performance
        print("\n3. Criando índices...")
        indices = [
            "CREATE INDEX IF NOT EXISTS idx_pedidos_data ON vendas.pedidos(data_pedido)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON vendas.pedidos(cliente_id)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON vendas.pedidos(vendedor_id)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_status ON vendas.pedidos(status)",
            "CREATE INDEX IF NOT EXISTS idx_itens_pedido ON vendas.itens_pedido(pedido_id)",
            "CREATE INDEX IF NOT EXISTS idx_itens_produto ON vendas.itens_pedido(produto_id)",
            "CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON vendas.produtos(categoria_id)",
            "CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido ON vendas.pagamentos_pedido(pedido_id)",
            "CREATE INDEX IF NOT EXISTS idx_comissoes_pedido ON vendas.comissoes(pedido_id)",
            "CREATE INDEX IF NOT EXISTS idx_comissoes_vendedor ON vendas.comissoes(vendedor_id)"
        ]
        
        for idx_sql in indices:
            cursor.execute(idx_sql)
        print("   OK: Índices criados")
        
        # 4. Adicionar comentários às tabelas
        print("\n4. Documentando tabelas...")
        comentarios = [
            ("vendas.pedidos", "Tabela principal de pedidos de venda"),
            ("vendas.clientes", "Cadastro de clientes do módulo de vendas"),
            ("vendas.produtos", "Catálogo de produtos disponíveis para venda"),
            ("vendas.categorias_produto", "Categorias para organização de produtos"),
            ("vendas.itens_pedido", "Itens/produtos de cada pedido"),
            ("vendas.formas_pagamento", "Formas de pagamento aceitas"),
            ("vendas.pagamentos_pedido", "Pagamentos realizados em cada pedido"),
            ("vendas.comissoes", "Comissões de vendedores"),
            ("vendas.metas_vendas", "Metas mensais de vendas por vendedor")
        ]
        
        for tabela, comentario in comentarios:
            schema, table = tabela.split('.')
            cursor.execute(
                sql.SQL("COMMENT ON TABLE {}.{} IS %s").format(
                    sql.Identifier(schema),
                    sql.Identifier(table)
                ),
                (comentario,)
            )
        print("   OK: Documentação adicionada")
        
        # 5. Registrar módulo na tabela de registro
        print("\n5. Registrando módulo...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.module_registry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                schema_name VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(200),
                description TEXT,
                author VARCHAR(200),
                version VARCHAR(20) DEFAULT '1.0.0',
                installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}'
            )
        """)
        
        cursor.execute("""
            INSERT INTO public.module_registry 
            (schema_name, display_name, description, author, metadata)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (schema_name) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                is_active = true,
                updated_at = NOW()
        """, (
            'vendas',
            'Módulo de Vendas',
            'Sistema completo de gestão de vendas com clientes, produtos, pedidos, pagamentos e comissões',
            'plataforma.app',
            '{"componentes": ["pedidos", "clientes", "produtos", "pagamentos", "comissoes", "metas"]}'
        ))
        print("   OK: Módulo registrado")
        
        # 6. Inserir dados de exemplo
        print("\n6. Inserindo dados de exemplo...")
        
        # Categorias
        cursor.execute("""
            INSERT INTO vendas.categorias_produto (nome, descricao) VALUES
            ('Eletrônicos', 'Produtos eletrônicos e tecnologia'),
            ('Informática', 'Computadores e acessórios'),
            ('Móveis', 'Móveis e decoração')
            ON CONFLICT DO NOTHING
        """)
        
        # Formas de pagamento
        cursor.execute("""
            INSERT INTO vendas.formas_pagamento (nome, tipo, taxa_percentual) VALUES
            ('Dinheiro', 'dinheiro', 0),
            ('Cartão de Crédito', 'cartao_credito', 2.5),
            ('Cartão de Débito', 'cartao_debito', 1.5),
            ('PIX', 'pix', 0),
            ('Boleto', 'boleto', 1.0)
            ON CONFLICT DO NOTHING
        """)
        
        # Cliente exemplo
        cursor.execute("""
            INSERT INTO vendas.clientes (
                codigo_cliente, nome, tipo_pessoa, cpf_cnpj, email, telefone,
                endereco_cidade, endereco_uf, limite_credito
            ) VALUES (
                'CLI001', 'João Silva', 'PF', '12345678901', 
                'joao.silva@email.com', '11-3333-4444',
                'São Paulo', 'SP', 5000.00
            )
            ON CONFLICT DO NOTHING
        """)
        
        # Produtos exemplo
        cursor.execute("""
            INSERT INTO vendas.produtos (codigo, nome, preco_venda, estoque_atual) VALUES
            ('PROD001', 'Notebook Dell Inspiron', 3500.00, 10),
            ('PROD002', 'Mouse Logitech MX', 150.00, 50),
            ('PROD003', 'Teclado Mecânico RGB', 450.00, 25)
            ON CONFLICT DO NOTHING
        """)
        
        print("   OK: Dados de exemplo inseridos")
        
        # 7. Verificar estrutura criada
        print("\n7. Verificando estrutura criada...")
        cursor.execute("""
            SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_schema = 'vendas' AND table_name = t.table_name) as columns
            FROM information_schema.tables t
            WHERE table_schema = 'vendas'
            ORDER BY table_name
        """)
        
        tabelas = cursor.fetchall()
        print(f"\n   Tabelas no schema 'vendas': {len(tabelas)}")
        for tabela, colunas in tabelas:
            print(f"     - vendas.{tabela} ({colunas} colunas)")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("MODULO VENDAS CRIADO COM SUCESSO!")
        print("=" * 60)
        print("\nComponentes do módulo vendas:")
        print("  - Pedidos (tabela principal)")
        print("  - Clientes")
        print("  - Produtos e Categorias")
        print("  - Formas de Pagamento")
        print("  - Itens do Pedido")
        print("  - Pagamentos")
        print("  - Comissões")
        print("  - Metas de Vendas")
        print("\nTodas as tabelas estão no schema 'vendas', isoladas dos outros módulos!")
        
        return True
        
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    success = create_vendas_module()
    sys.exit(0 if success else 1)