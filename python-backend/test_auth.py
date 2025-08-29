#!/usr/bin/env python3
"""
Test Supabase Auth
Testa autenticacao usando Supabase Auth
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

def test_auth():
    """Testa Supabase Auth"""
    print("TESTANDO SUPABASE AUTH")
    print("=" * 50)
    
    try:
        # Pega credenciais do .env
        url = os.getenv("SUPABASE_URL")
        anon_key = os.getenv("SUPABASE_ANON_KEY")
        
        print(f"URL: {url}")
        print(f"Anon Key: {'***' + anon_key[-10:] if anon_key else 'Not found'}")
        
        if not url or not anon_key:
            print("ERRO: SUPABASE_URL ou SUPABASE_ANON_KEY nao encontrados no .env")
            return
        
        # Cria cliente
        supabase: Client = create_client(url, anon_key)
        print("Cliente Supabase criado com sucesso\n")
        
        # Testa criar usuario demo
        print("Testando criar/logar usuario demo...")
        email = "test@example.com"
        password = "Test123456!"
        
        try:
            # Tenta fazer login primeiro
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            print(f"Login bem sucedido! Usuario: {response.user.email}")
            print(f"User ID: {response.user.id}")
            
        except Exception as login_error:
            print(f"Login falhou, tentando criar usuario...")
            
            try:
                # Tenta criar usuario
                response = supabase.auth.sign_up({
                    "email": email,
                    "password": password
                })
                
                if response.user:
                    print(f"Usuario criado com sucesso! Email: {response.user.email}")
                    print(f"User ID: {response.user.id}")
                else:
                    print("Erro ao criar usuario")
                    
            except Exception as signup_error:
                print(f"Erro ao criar usuario: {signup_error}")
        
        # Testa logout
        print("\nTestando logout...")
        supabase.auth.sign_out()
        print("Logout realizado com sucesso")
        
        print("\nSUPABASE AUTH FUNCIONANDO!")
        print("Usuario demo disponivel:")
        print(f"  Email: {email}")
        print(f"  Senha: {password}")
        
    except Exception as e:
        print(f"ERRO: {e}")
        print("Possiveis causas:")
        print("   - Credenciais incorretas")
        print("   - Problemas de rede")
        print("   - Auth nao configurado no Supabase")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    test_auth()