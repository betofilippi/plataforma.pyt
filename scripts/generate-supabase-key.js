// Generate valid Supabase anon key
const jwt = require('jsonwebtoken');

// JWT Secret for Supabase (this is a placeholder - in production use env var)
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

// Generate anon key with correct payload
const payload = {
  iss: 'supabase',
  ref: 'yhvtsbkotszxqndkhhhx',
  role: 'anon',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 10) // 10 years
};

const anonKey = jwt.sign(payload, JWT_SECRET);

console.log('Generated Anon Key:');
console.log(anonKey);
console.log('\nPayload:');
console.log(payload);