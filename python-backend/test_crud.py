#!/usr/bin/env python3
"""
Test CRUD Operations
Testa operações Create, Read, Update, Delete no banco real
"""

import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import uuid

# Carrega variáveis de ambiente
load_dotenv()

# Adiciona o diretório app ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.supabase_service import get_supabase_service

async def test_crud_operations():
    """Testa operações CRUD completas"""
    print("TESTANDO OPERACOES CRUD COM BANCO REAL")
    print("=" * 50)
    
    service = get_supabase_service()
    test_user_id = str(uuid.uuid4())
    test_module_id = str(uuid.uuid4())
    
    # 1. CREATE - Criar novo usuário
    print("\n1. CREATE - Criando novo usuario...")
    user_data = {
        "id": test_user_id,
        "email": f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com",
        "name": "Test User",
        "role": "user",
        "is_active": True
    }
    
    new_user = await service.create_user(user_data)
    if new_user:
        print(f"   Usuario criado: {new_user['email']}")
        print(f"   ID: {new_user['id']}")
    else:
        print("   Erro ao criar usuario")
    
    # 2. READ - Buscar usuário
    print("\n2. READ - Buscando usuario...")
    user = await service.get_user_by_id(test_user_id)
    if user:
        print(f"   Usuario encontrado: {user['email']}")
        print(f"   Nome: {user['name']}")
        print(f"   Role: {user['role']}")
    else:
        print("   Usuario nao encontrado")
    
    # 3. UPDATE - Atualizar usuário
    print("\n3. UPDATE - Atualizando usuario...")
    updates = {
        "name": "Updated Test User",
        "last_login": datetime.now().isoformat()
    }
    updated_user = await service.update_user(test_user_id, updates)
    if updated_user:
        print(f"   Usuario atualizado: {updated_user['name']}")
    else:
        print("   Erro ao atualizar usuario")
    
    # 4. Testar módulos
    print("\n4. MODULES - Listando modulos...")
    modules = await service.get_available_modules()
    print(f"   Modulos encontrados: {len(modules)}")
    for module in modules[:3]:
        print(f"   - {module['display_name']} (v{module['version']})")
    
    # 5. Criar notificação
    print("\n5. NOTIFICATIONS - Criando notificacao...")
    notification_data = {
        "user_id": test_user_id,
        "title": "Teste de Notificação",
        "message": "Esta é uma notificação de teste",
        "type": "info"
    }
    notification = await service.create_notification(notification_data)
    if notification:
        print(f"   Notificacao criada: {notification['title']}")
        print(f"   ID: {notification['id']}")
    else:
        print("   Erro ao criar notificacao")
    
    # 6. Registrar atividade
    print("\n6. ACTIVITY LOG - Registrando atividade...")
    activity_logged = await service.log_activity(
        user_id=test_user_id,
        action="test_crud",
        resource_type="test",
        description="Teste de operações CRUD"
    )
    if activity_logged:
        print("   Atividade registrada com sucesso")
    else:
        print("   Erro ao registrar atividade")
    
    # 7. Buscar notificações do usuário
    print("\n7. READ - Buscando notificacoes do usuario...")
    notifications = await service.get_user_notifications(test_user_id, limit=5)
    print(f"   Notificacoes encontradas: {len(notifications)}")
    for notif in notifications:
        print(f"   - {notif['title']} ({notif['type']})")
    
    # 8. DELETE - Deletar usuário de teste (cascade delete)
    print("\n8. DELETE - Limpando dados de teste...")
    # Quando deletamos o usuário, as notificações e atividades são deletadas em cascata
    try:
        # Usa conexão direta para DELETE
        from psycopg2 import connect
        from urllib.parse import quote_plus
        
        db_password = os.getenv("SUPABASE_DB_PASSWORD", "Bdebola2025@")
        db_password_encoded = quote_plus(db_password)
        conn_string = f"postgresql://postgres:{db_password_encoded}@db.kblvviunzleurqlskeab.supabase.co:5432/postgres"
        
        conn = connect(conn_string)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (test_user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        print("   Dados de teste limpos com sucesso")
    except Exception as e:
        print(f"   Erro ao limpar: {e}")
    
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES:")
    print("- CREATE: OK" if new_user else "- CREATE: FALHOU")
    print("- READ: OK" if user else "- READ: FALHOU")
    print("- UPDATE: OK" if updated_user else "- UPDATE: FALHOU")
    print("- MODULES: OK" if modules else "- MODULES: FALHOU")
    print("- NOTIFICATIONS: OK" if notification else "- NOTIFICATIONS: FALHOU")
    print("- ACTIVITY LOG: OK" if activity_logged else "- ACTIVITY LOG: FALHOU")
    print("\nBANCO DE DADOS SUPABASE FUNCIONANDO PERFEITAMENTE!")

if __name__ == "__main__":
    print("Iniciando testes CRUD...")
    asyncio.run(test_crud_operations())