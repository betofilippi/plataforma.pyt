# Supabase Setup Guide

## Status Atual
- ✅ Supabase CLI instalado
- ✅ Projeto local configurado
- ✅ Credenciais configuradas no .env
- ✅ Cliente Python integrado
- ✅ Cliente JavaScript integrado
- ⏳ Schema do banco aguardando aplicação
- ⏳ Link com projeto remoto (precisa senha DB)

## Credenciais do Projeto
- **Project ID**: kblvviunzleurqlskeab
- **URL**: https://kblvviunzleurqlskeab.supabase.co
- **Anon Key**: Configurado no .env
- **Service Key**: Configurado no .env

## Como Aplicar o Schema do Banco

### Opção 1: Via Dashboard Supabase (RECOMENDADO)
1. Acesse: https://supabase.com/dashboard/project/kblvviunzleurqlskeab/sql/new
2. Execute o SQL do arquivo `python-backend/apply_schema.py`
3. Clique em "RUN"

### Opção 2: Via Supabase CLI
```bash
# Necessita senha do banco PostgreSQL
supabase link --project-ref kblvviunzleurqlskeab
supabase db push
```

## Testar Conectividade
```bash
cd python-backend
python simple_test.py
```

## Estrutura das Tabelas

### Tabelas Principais:
- **users**: Usuários do sistema
- **roles**: Roles/perfis de acesso
- **user_sessions**: Sessões de usuário
- **modules**: Módulos disponíveis
- **user_modules**: Módulos por usuário
- **notifications**: Notificações
- **files**: Arquivos enviados
- **activity_logs**: Log de atividades

## Próximos Passos

1. **Aplicar Schema**: Execute o SQL no dashboard Supabase
2. **Testar Conexão**: Execute `python simple_test.py`
3. **Migrar Endpoints**: Substituir mock data por queries Supabase
4. **Implementar Auth**: Usar Supabase Auth ao invés de auth customizado
5. **Storage**: Configurar Supabase Storage para arquivos

## Arquivos Importantes
- `.env`: Credenciais principais
- `python-backend/.env`: Credenciais do backend
- `client/lib/supabase.ts`: Cliente JavaScript
- `python-backend/app/services/supabase_service.py`: Serviço Python
- `supabase/migrations/`: Migrations SQL

## Comandos Úteis
```bash
# Testar conectividade
cd python-backend
python simple_test.py

# Ver status do Supabase
supabase status

# Iniciar backend Python
npm run backend

# Iniciar frontend
npm run dev
```