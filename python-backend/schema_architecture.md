# 📋 Arquitetura de Schemas Isolados - plataforma.app

## 🎯 Regra Fundamental

**CADA MÓDULO TEM SEU PRÓPRIO SCHEMA PostgreSQL**

Esta é a regra central da arquitetura:
- Um módulo = Um schema isolado
- Tabelas do módulo ficam APENAS no seu schema
- Isolamento total entre módulos
- Sem conflitos de nomes ou versões

## 📁 Estrutura de Schemas

```
PostgreSQL Database (Supabase)
│
├── 🌐 public (Schema compartilhado - mínimo uso)
│   ├── module_registry     # Registro de módulos instalados
│   └── migrations          # Controle de migrations globais
│
├── 🏢 plataforma (Schema do sistema core)
│   ├── users              # Usuários do sistema
│   ├── roles              # Perfis de acesso
│   ├── user_sessions      # Sessões
│   ├── notifications      # Notificações
│   ├── activity_logs      # Logs de atividade
│   ├── files              # Arquivos
│   └── user_preferences   # Preferências
│
├── 💰 vendas (Exemplo: Módulo de Vendas)
│   ├── vendas             # Tabela principal de vendas
│   ├── produtos           # Produtos vendidos
│   ├── clientes           # Clientes do módulo
│   └── comissoes          # Comissões de vendedores
│
├── 📊 financeiro (Exemplo: Módulo Financeiro)
│   ├── contas_pagar       # Contas a pagar
│   ├── contas_receber     # Contas a receber
│   ├── fluxo_caixa        # Fluxo de caixa
│   └── categorias         # Categorias financeiras
│
└── 🔧 [novo_modulo] (Padrão para novos módulos)
    └── [tabelas_especificas_do_modulo]
```

## 📐 Convenções e Padrões

### Nomenclatura de Schemas

1. **Nome do Schema = Nome do Módulo**
   - Usar snake_case: `vendas`, `recursos_humanos`, `gestao_projetos`
   - Sem prefixos ou sufixos
   - Máximo 63 caracteres (limite PostgreSQL)

2. **Schemas Reservados**
   - `public` - Apenas para tabelas compartilhadas globalmente
   - `plataforma` - Sistema core
   - `pg_*` - Schemas do PostgreSQL (não tocar)

### Nomenclatura de Tabelas

1. **Dentro do Schema do Módulo**
   ```sql
   -- CORRETO: Tabela no schema vendas
   CREATE TABLE vendas.pedidos (...);
   
   -- ERRADO: Prefixo redundante
   CREATE TABLE vendas.vendas_pedidos (...);
   ```

2. **Tabelas Compartilhadas**
   - Ficam SEMPRE no schema `plataforma`
   - Exemplo: `plataforma.users`, `plataforma.notifications`

### Relacionamentos Entre Schemas

1. **Referências Permitidas**
   ```sql
   -- Módulo pode referenciar plataforma
   CREATE TABLE vendas.pedidos (
       user_id UUID REFERENCES plataforma.users(id)
   );
   ```

2. **Referências Proibidas**
   ```sql
   -- ERRADO: Módulos não devem referenciar uns aos outros
   CREATE TABLE financeiro.pagamentos (
       venda_id UUID REFERENCES vendas.vendas(id) -- EVITAR!
   );
   ```

3. **Comunicação Entre Módulos**
   - Usar eventos/mensagens via `plataforma.module_events`
   - APIs REST entre módulos
   - Nunca foreign keys diretas

## 🛠️ Comandos Principais

### Criar Novo Módulo
```bash
# Cria schema para novo módulo
python schema_manager.py create nome_modulo "Descrição do módulo"

# Exemplo
python schema_manager.py create financeiro "Módulo de gestão financeira"
```

### Criar Tabela em Módulo
```bash
# Formato: schema.tabela
python schema_manager.py create-table vendas.produtos "
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    preco DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
"
```

### Listar Módulos
```bash
# Lista todos os schemas/módulos
python schema_manager.py list

# Info específica de um módulo
python schema_manager.py info vendas
```

## 🔒 Segurança e Permissões

### Por Schema
```sql
-- Conceder acesso a um schema específico
GRANT USAGE ON SCHEMA vendas TO role_vendedor;
GRANT ALL ON ALL TABLES IN SCHEMA vendas TO role_vendedor;
```

### Isolamento
- Cada módulo pode ter suas próprias roles
- Usuário pode ter acesso a múltiplos schemas
- Auditoria por schema

## 📦 Estrutura de um Módulo

```
modulo_vendas/
├── schema.sql          # Definição do schema e tabelas
├── migrations/         # Migrations específicas do módulo
├── seeds.sql          # Dados iniciais
├── permissions.sql    # Permissões e roles
├── functions.sql      # Functions e procedures
└── README.md          # Documentação do módulo
```

## 🚀 Instalação de Módulo

```python
# module_installer.py automatiza:
1. Criar schema
2. Executar schema.sql
3. Aplicar migrations
4. Inserir seeds
5. Configurar permissões
6. Registrar em module_registry
```

## 📊 Vantagens da Arquitetura

1. **Isolamento Total**
   - Sem conflitos de nomes
   - Versões independentes
   - Deploy isolado

2. **Manutenção Simplificada**
   - Backup por módulo
   - Restore seletivo
   - Migrations isoladas

3. **Escalabilidade**
   - Adicionar módulos sem impacto
   - Remover módulos cleanly
   - Sharding por schema (futuro)

4. **Segurança**
   - Permissões granulares
   - Auditoria por módulo
   - Isolamento de dados

## ⚠️ Regras Importantes

1. **NUNCA** criar tabelas de módulos no schema `public`
2. **NUNCA** usar prefixos de módulo em nomes de tabelas
3. **SEMPRE** usar o schema do módulo
4. **SEMPRE** documentar relacionamentos entre schemas
5. **EVITAR** foreign keys entre módulos diferentes

## 🔄 Migrations

### Por Módulo
```bash
# Aplicar migration em schema específico
python migrations_v2.py migrate --schema vendas

# Rollback de módulo
python migrations_v2.py rollback --schema vendas --steps 1
```

### Global (Plataforma)
```bash
# Migrations do sistema core
python migrations_v2.py migrate --schema plataforma
```

## 📝 Exemplo Completo

### Criar Módulo de Estoque
```bash
# 1. Criar schema
python schema_manager.py create estoque "Controle de estoque"

# 2. Criar tabelas principais
python schema_manager.py create-table estoque.produtos "
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE,
    nome VARCHAR(200) NOT NULL,
    quantidade INTEGER DEFAULT 0,
    minimo INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
"

python schema_manager.py create-table estoque.movimentacoes "
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES estoque.produtos(id),
    tipo VARCHAR(20) CHECK (tipo IN ('entrada', 'saida')),
    quantidade INTEGER NOT NULL,
    user_id UUID REFERENCES plataforma.users(id),
    created_at TIMESTAMP DEFAULT NOW()
"

# 3. Verificar
python schema_manager.py info estoque
```

## 🔍 Queries Cross-Schema

```sql
-- Buscar vendas com nome do usuário
SELECT 
    v.*,
    u.name as usuario_nome
FROM vendas.vendas v
JOIN plataforma.users u ON v.user_id = u.id;

-- Estatísticas por módulo
SELECT 
    schema_name,
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema NOT IN ('public', 'pg_catalog', 'information_schema')
GROUP BY schema_name;
```

## 📈 Monitoramento

```sql
-- Tamanho por schema
SELECT 
    schema_name,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as size
FROM pg_tables
GROUP BY schema_name
ORDER BY sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint DESC;
```

---

**ESTA ARQUITETURA É LEI**: Todos os módulos DEVEM seguir estas regras para manter a consistência e organização do sistema.