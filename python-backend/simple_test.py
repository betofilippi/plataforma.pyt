#!/usr/bin/env python3
"""
Simple Supabase Connection Test
Teste simples de conectividade com Supabase
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

def test_supabase():
    """Testa conectividade básica com Supabase"""
    print("TESTE SIMPLES DE CONECTIVIDADE SUPABASE")
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
        print("Cliente Supabase criado com sucesso")
        
        # Testa uma query simples (count em uma tabela que deve existir)
        print("Testando query basica...")
        
        # Tenta fazer uma query simples na tabela users (se existir)
        response = supabase.table("users").select("*", count="exact").limit(0).execute()
        
        print(f"Query executada com sucesso!")
        print(f"Contagem de usuarios: {response.count}")
        
        print("\nSUPABASE CONECTADO COM SUCESSO!")
        
    except Exception as e:
        print(f"ERRO: {e}")
        print("Possiveis causas:")
        print("   - Credenciais incorretas")
        print("   - Tabela 'users' nao existe ainda")
        print("   - Problemas de rede")
        print("   - RLS (Row Level Security) bloqueando acesso")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    test_supabase()