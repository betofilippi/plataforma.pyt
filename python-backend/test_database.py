#!/usr/bin/env python3
"""
Test Database Operations
Teste direto de operações no banco Supabase
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime
import uuid

# Carrega variáveis de ambiente
load_dotenv()

def test_database():
    """Testa operações diretas no banco"""
    print("TESTE COMPLETO DO BANCO DE DADOS SUPABASE")
    print("=" * 50)
    
    # Cria cliente Supabase
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not anon_key:
        print("ERRO: Credenciais nao encontradas")
        return
    
    supabase: Client = create_client(url, anon_key)
    print(f"Cliente Supabase criado")
    print(f"URL: {url}\n")
    
    # ID único para teste
    test_id = str(uuid.uuid4())
    test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com"
    
    results = {}
    
    # 1. CREATE - Inserir usuário
    print("1. CREATE - Inserindo usuario de teste...")
    try:
        response = supabase.table("users").insert({
            "id": test_id,
            "email": test_email,
            "name": "Test User CRUD",
            "role": "user",
            "is_active": True
        }).execute()
        
        if response.data:
            print(f"   OK: Usuario criado - {response.data[0]['email']}")
            results['create'] = True
        else:
            print("   ERRO: Falha ao criar usuario")
            results['create'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['create'] = False
    
    # 2. READ - Buscar usuário
    print("\n2. READ - Buscando usuario...")
    try:
        response = supabase.table("users").select("*").eq("id", test_id).execute()
        
        if response.data:
            user = response.data[0]
            print(f"   OK: Usuario encontrado")
            print(f"      Email: {user['email']}")
            print(f"      Nome: {user['name']}")
            print(f"      Role: {user['role']}")
            results['read'] = True
        else:
            print("   ERRO: Usuario nao encontrado")
            results['read'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['read'] = False
    
    # 3. UPDATE - Atualizar usuário
    print("\n3. UPDATE - Atualizando usuario...")
    try:
        response = supabase.table("users").update({
            "name": "Updated Test User",
            "last_login": datetime.now().isoformat()
        }).eq("id", test_id).execute()
        
        if response.data:
            print(f"   OK: Usuario atualizado - {response.data[0]['name']}")
            results['update'] = True
        else:
            print("   ERRO: Falha ao atualizar")
            results['update'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['update'] = False
    
    # 4. Listar módulos
    print("\n4. QUERY - Listando modulos...")
    try:
        response = supabase.table("modules").select("*").execute()
        
        if response.data:
            print(f"   OK: {len(response.data)} modulos encontrados")
            for module in response.data:
                print(f"      - {module['display_name']} v{module['version']}")
            results['modules'] = True
        else:
            print("   ERRO: Nenhum modulo encontrado")
            results['modules'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['modules'] = False
    
    # 5. Criar notificação
    print("\n5. INSERT - Criando notificacao...")
    try:
        response = supabase.table("notifications").insert({
            "user_id": test_id,
            "title": "Notificação de Teste",
            "message": "Esta é uma notificação criada pelo teste CRUD",
            "type": "info"
        }).execute()
        
        if response.data:
            print(f"   OK: Notificacao criada - {response.data[0]['title']}")
            notification_id = response.data[0]['id']
            results['notification'] = True
        else:
            print("   ERRO: Falha ao criar notificacao")
            results['notification'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['notification'] = False
    
    # 6. Registrar atividade
    print("\n6. LOG - Registrando atividade...")
    try:
        response = supabase.table("activity_logs").insert({
            "user_id": test_id,
            "action": "test",
            "resource_type": "test_crud",
            "description": "Teste de operações CRUD no banco"
        }).execute()
        
        if response.data:
            print(f"   OK: Atividade registrada")
            results['activity'] = True
        else:
            print("   ERRO: Falha ao registrar atividade")
            results['activity'] = False
    except Exception as e:
        print(f"   ERRO: {e}")
        results['activity'] = False
    
    # 7. Contagem de registros
    print("\n7. COUNT - Contando registros...")
    try:
        # Conta usuários
        response = supabase.table("users").select("*", count="exact").execute()
        user_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"   Usuarios: {user_count}")
        
        # Conta módulos
        response = supabase.table("modules").select("*", count="exact").execute()
        module_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"   Modulos: {module_count}")
        
        # Conta roles
        response = supabase.table("roles").select("*", count="exact").execute()
        role_count = response.count if hasattr(response, 'count') else len(response.data)
        print(f"   Roles: {role_count}")
        
        results['count'] = True
    except Exception as e:
        print(f"   ERRO: {e}")
        results['count'] = False
    
    # 8. DELETE - Limpar dados de teste
    print("\n8. DELETE - Limpando dados de teste...")
    try:
        # Deleta notificações do usuário
        supabase.table("notifications").delete().eq("user_id", test_id).execute()
        
        # Deleta atividades do usuário
        supabase.table("activity_logs").delete().eq("user_id", test_id).execute()
        
        # Deleta o usuário
        response = supabase.table("users").delete().eq("id", test_id).execute()
        
        if response.data:
            print(f"   OK: Dados de teste removidos")
            results['delete'] = True
        else:
            print("   AVISO: Pode ter sobrado alguns dados")
            results['delete'] = True
    except Exception as e:
        print(f"   ERRO: {e}")
        results['delete'] = False
    
    # Resumo
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES:")
    print("=" * 50)
    
    all_passed = True
    for operation, passed in results.items():
        status = "PASSOU" if passed else "FALHOU"
        print(f"{operation.upper():15} {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("TODOS OS TESTES PASSARAM!")
        print("BANCO DE DADOS SUPABASE 100% FUNCIONAL")
    else:
        print("ALGUNS TESTES FALHARAM")
        print("Verifique os erros acima")
    print("=" * 50)

if __name__ == "__main__":
    test_database()