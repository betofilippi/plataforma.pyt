#!/usr/bin/env python3
"""
Test Auth Service
Testa o serviço de autenticação com Supabase Auth
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Adiciona o diretório app ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.auth_service import get_auth_service

async def test_auth_service():
    """Testa o serviço de autenticação"""
    print("TESTANDO SERVICO DE AUTENTICACAO")
    print("=" * 50)
    
    auth_service = get_auth_service()
    print("Servico inicializado com sucesso")
    
    # Cria usuário demo
    print("\n1. Criando usuario demo...")
    result = await auth_service.create_demo_user()
    
    if result["success"]:
        print(f"   Usuario criado/logado: {result['user']['email']}")
        print(f"   ID: {result['user']['id']}")
        if result.get('session'):
            print(f"   Token de sessao gerado")
    else:
        print(f"   Erro: {result.get('error', 'Unknown error')}")
    
    # Testa login
    print("\n2. Testando login...")
    login_result = await auth_service.sign_in("demo@example.com", "Demo123456!")
    
    if login_result["success"]:
        print(f"   Login bem sucedido!")
        print(f"   Usuario: {login_result['user']['email']}")
        access_token = login_result['session']['access_token']
        print(f"   Access token obtido")
        
        # Testa obter usuário pelo token
        print("\n3. Obtendo usuario pelo token...")
        user = await auth_service.get_user(access_token)
        if user:
            print(f"   Usuario obtido: {user['email']}")
        else:
            print("   Erro ao obter usuario")
        
        # Testa logout
        print("\n4. Fazendo logout...")
        logout_result = await auth_service.sign_out()
        if logout_result["success"]:
            print("   Logout realizado com sucesso")
        else:
            print(f"   Erro no logout: {logout_result.get('error')}")
    else:
        print(f"   Erro no login: {login_result.get('error')}")
    
    print("\n" + "=" * 50)
    print("TESTE CONCLUIDO")
    
    if result["success"] or login_result["success"]:
        print("\nSUPABASE AUTH FUNCIONANDO!")
        print("Usuario demo disponivel:")
        print("  Email: demo@example.com")
        print("  Senha: Demo123456!")
    else:
        print("\nATENCÃO: Problemas com autenticacao")
        print("Verifique as configuracoes do Supabase")

if __name__ == "__main__":
    print("Iniciando teste do servico de autenticacao...")
    asyncio.run(test_auth_service())