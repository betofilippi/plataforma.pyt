# Arquitetura Modular Implementada - plataforma.app

## Regra Fundamental Implementada

**"Cada módulo tem o seu próprio schema, e os seus componentes têm tabelas dentro dele"**

Esta regra foi totalmente implementada e está funcionando no Supabase PostgreSQL.

## Estrutura Atual do Banco de Dados

### 1. Schema `plataforma` (Sistema Core)
Schema principal com 10 tabelas do sistema:
- `users` - Usuários do sistema
- `roles` - Perfis de acesso
- `user_sessions` - Sessões de usuário
- `modules` - Registro de módulos
- `user_modules` - Módulos por usuário
- `notifications` - Notificações
- `files` - Arquivos
- `activity_logs` - Logs de atividade
- `user_preferences` - Preferências
- `migrations` - Controle de migrations

### 2. Schema `vendas` (Módulo de Exemplo)
Schema isolado com 10 tabelas do módulo:
- `pedidos` - Pedidos de venda (tabela principal)
- `clientes` - Cadastro de clientes
- `produtos` - Catálogo de produtos
- `categorias_produto` - Categorias de produtos
- `itens_pedido` - Itens de cada pedido
- `formas_pagamento` - Formas de pagamento
- `pagamentos_pedido` - Pagamentos realizados
- `comissoes` - Comissões de vendedores
- `metas_vendas` - Metas mensais
- `main` - Tabela padrão do módulo

## Ferramentas Criadas

### 1. `schema_manager.py`
Gerencia schemas isolados:
```bash
# Criar novo schema
python schema_manager.py create nome_modulo "Descrição"

# Listar todos os schemas
python schema_manager.py list

# Info detalhada de um schema
python schema_manager.py info vendas

# Criar tabela em schema específico
python schema_manager.py create-table vendas.nova_tabela "definição SQL"
```

### 2. `module_installer.py`
Instala módulos completos:
```bash
# Criar novo módulo
python module_installer.py create nome_modulo "Nome Display" "Descrição"

# Instalar módulo existente
python module_installer.py install nome_modulo

# Desinstalar módulo
python module_installer.py uninstall nome_modulo [--remove-data]

# Listar módulos instalados
python module_installer.py list
```

### 3. `create_vendas_complete.py`
Script de exemplo que cria módulo completo com todas as tabelas relacionadas.

## Vantagens da Arquitetura

### 1. Isolamento Total
- Cada módulo tem seu próprio namespace (schema)
- Sem conflitos de nomes entre módulos
- Segurança por isolamento

### 2. Manutenibilidade
- Backup/restore por módulo
- Migrations isoladas por schema
- Fácil remoção de módulos

### 3. Escalabilidade
- Adicionar novos módulos sem impactar existentes
- Possibilidade futura de sharding por schema
- Performance otimizada com índices por módulo

### 4. Organização
- Estrutura clara e previsível
- Fácil navegação no banco
- Documentação automática

## Como Criar um Novo Módulo

### Método 1: Usando module_installer
```bash
cd python-backend
python module_installer.py create financeiro "Financeiro" "Módulo de gestão financeira"
```

### Método 2: Script customizado
```python
# Criar arquivo create_financeiro_module.py
# Seguir o padrão de create_vendas_complete.py
# Definir todas as tabelas do módulo no schema isolado
```

## Regras de Desenvolvimento

1. **SEMPRE** criar módulos em schemas isolados
2. **NUNCA** criar tabelas de módulos no schema `public`
3. **SEMPRE** prefixar tabelas com `schema.tabela`
4. **EVITAR** foreign keys entre módulos diferentes
5. **USAR** schema `plataforma` apenas para tabelas compartilhadas

## Status Atual

### Implementado ✅
- Arquitetura de schemas isolados
- Ferramentas de gerenciamento
- Módulo vendas completo como exemplo
- Registro de módulos
- Sistema de migrations

### Próximos Passos
1. Criar API REST para acessar dados dos módulos
2. Implementar sistema de permissões por schema
3. Criar interface visual para gerenciar módulos
4. Adicionar mais módulos de exemplo

## Conexão com o Banco

```python
import psycopg2
from urllib.parse import quote_plus

project_id = "kblvviunzleurqlskeab"
db_password = "Bdebola2025@"
db_password_encoded = quote_plus(db_password)
conn_string = f"postgresql://postgres:{db_password_encoded}@db.{project_id}.supabase.co:5432/postgres"

conn = psycopg2.connect(conn_string)
```

## Verificação Rápida

Para verificar a estrutura atual:
```bash
cd python-backend
python schema_manager.py list
python schema_manager.py info vendas
python module_installer.py list
```

---

**Arquitetura totalmente funcional e pronta para desenvolvimento de novos módulos!**