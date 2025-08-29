# Como Aplicar o Schema no Supabase

## Método Rápido (Copiar e Colar)

1. **Acesse o SQL Editor do Supabase**
   - Link direto: https://supabase.com/dashboard/project/kblvviunzleurqlskeab/sql/new

2. **Copie TODO o conteúdo do arquivo**
   - Arquivo: `python-backend/schema_completo.sql`

3. **Cole no SQL Editor e clique em RUN**

4. **Verifique se funcionou**
   ```bash
   cd python-backend
   python simple_test.py
   ```

## O que será criado

### Tabelas Principais:
- **users** - Dados adicionais dos usuários
- **roles** - Perfis de acesso (admin, user, guest)
- **user_sessions** - Sessões persistentes
- **modules** - Módulos do sistema
- **user_modules** - Módulos por usuário
- **notifications** - Sistema de notificações
- **files** - Arquivos enviados
- **activity_logs** - Logs de atividade

### Dados Iniciais:
- 3 roles padrão (admin, user, guest)
- 1 usuário demo (demo@demo.com)
- 3 módulos sistema (dashboard, user-management, settings)

## Verificação

Após aplicar o schema, teste com:

```bash
cd python-backend
python simple_test.py
```

Deve mostrar:
```
Cliente Supabase criado com sucesso
Query executada com sucesso!
Contagem de usuarios: 1
SUPABASE CONECTADO COM SUCESSO!
```

## Troubleshooting

Se der erro "table not found":
- Verifique se clicou em RUN no SQL Editor
- Aguarde alguns segundos para o cache atualizar
- Tente novamente

Se der erro de permissão:
- Verifique se está usando o projeto correto
- Confirme que as credenciais no .env estão corretas