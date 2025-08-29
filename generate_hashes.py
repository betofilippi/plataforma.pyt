import bcrypt

passwords = {
    "admin123": "for admin@plataforma.app",
    "user123": "for user@plataforma.app",
    "manager123": "for manager@plataforma.app",
    "demo": "for demo@example.com"
}

print("Generated password hashes:")
print("-" * 50)

for password, description in passwords.items():
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"{password} ({description}):")
    print(f"  {hashed}")
    print()