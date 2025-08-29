#!/usr/bin/env python3
"""
Simple Auth Test
Teste simples e direto de autenticação Supabase
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

def test_auth():
    """Testa autenticação básica com Supabase"""
    print("TESTE SIMPLES DE AUTENTICACAO SUPABASE")
    print("=" * 50)
    
    # Pega credenciais
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not anon_key:
        print("ERRO: Credenciais nao encontradas")
        return
    
    print(f"URL: {url}")
    print(f"Key: ***{anon_key[-10:]}")
    
    # Cria cliente
    supabase: Client = create_client(url, anon_key)
    print("\nCliente criado com sucesso")
    
    # Dados do usuário demo
    email = "demo@example.com"
    password = "Demo123456!"
    
    print(f"\nTestando com usuario: {email}")
    
    # Tenta criar usuário
    print("\n1. Tentando criar usuario...")
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "name": "Demo User",
                    "role": "admin"
                }
            }
        })
        
        if response.user:
            print(f"   Usuario criado: {response.user.email}")
            print(f"   ID: {response.user.id}")
        else:
            print("   Usuario ja existe ou erro na criacao")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # Tenta fazer login
    print("\n2. Tentando fazer login...")
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user:
            print(f"   Login bem sucedido!")
            print(f"   Usuario: {response.user.email}")
            print(f"   ID: {response.user.id}")
            
            if response.session:
                print(f"   Access Token: ...{response.session.access_token[-20:]}")
                
                # Testa obter usuário
                print("\n3. Obtendo dados do usuario...")
                user_response = supabase.auth.get_user(response.session.access_token)
                if user_response.user:
                    print(f"   Usuario obtido: {user_response.user.email}")
                    print(f"   Metadata: {user_response.user.user_metadata}")
        else:
            print("   Login falhou")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # Faz logout
    print("\n4. Fazendo logout...")
    try:
        supabase.auth.sign_out()
        print("   Logout realizado")
    except Exception as e:
        print(f"   Erro: {e}")
    
    print("\n" + "=" * 50)
    print("RESUMO DO TESTE:")
    print(f"- Supabase conectado: SIM")
    print(f"- Usuario demo: {email}")
    print(f"- Senha: {password}")
    print("\nPROXIMOS PASSOS:")
    print("1. Aplicar schema SQL via Dashboard (se ainda nao fez)")
    print("2. Integrar auth service no backend")
    print("3. Atualizar frontend para usar Supabase Auth")

if __name__ == "__main__":
    test_auth()