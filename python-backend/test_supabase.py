#!/usr/bin/env python3
"""
Test Supabase Connection
Script para testar conectividade com Supabase
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Adiciona o diretório app ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.supabase_service import get_supabase_service

async def test_supabase_connection():
    """Testa conectividade com Supabase"""
    print("🧪 TESTANDO CONECTIVIDADE SUPABASE")
    print("=" * 50)
    
    try:
        # Inicializa serviço
        supabase_service = get_supabase_service()
        print(f"✅ Serviço inicializado")
        print(f"📍 URL: {supabase_service.url}")
        
        # Testa health check
        print("\n🔍 Testando health check...")
        health = await supabase_service.health_check()
        print(f"Status: {health['status']}")
        print(f"Conectado: {health['connected']}")
        
        if health['connected']:
            print("✅ SUPABASE CONECTADO COM SUCESSO!")
            
            # Testa operações básicas se conectado
            print("\n📊 Testando operações básicas...")
            
            # Lista módulos disponíveis
            modules = await supabase_service.get_available_modules()
            print(f"📦 Módulos encontrados: {len(modules)}")
            
            for module in modules[:3]:  # Mostra primeiros 3
                print(f"  - {module.get('display_name', 'N/A')} v{module.get('version', '?')}")
            
            print("\n🎉 TODOS OS TESTES PASSARAM!")
            
        else:
            print("❌ FALHA NA CONECTIVIDADE")
            if 'error' in health:
                print(f"Erro: {health['error']}")
        
    except Exception as e:
        print(f"❌ ERRO NO TESTE: {e}")
        import traceback
        traceback.print_exc()
        
    print("\n" + "=" * 50)

if __name__ == "__main__":
    print("🚀 Iniciando teste de conectividade Supabase...")
    asyncio.run(test_supabase_connection())