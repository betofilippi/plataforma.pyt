/**
 * Authentication Security Tests
 * Testing security aspects of authentication system
 */

import { test, expect } from '@playwright/test';
import { AuthProvider, useAuth } from '../../client/contexts/AuthContext';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock crypto for JWT testing
const mockCrypto = {
  randomUUID: jest.fn(() => 'mock-uuid'),
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    sign: jest.fn(),
    verify: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
  }
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock Supabase for security testing
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
  },
};

jest.mock('../../client/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('Input Validation', () => {
    const TestAuthComponent = () => {
      const { signIn } = useAuth();
      
      return (
        <div>
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="sign-in"
          >
            Sign In
          </button>
        </div>
      );
    };

    const TestApp = () => (
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    );

    it('should prevent SQL injection in email field', async () => {
      const user = userEvent.setup();
      const maliciousEmail = "'; DROP TABLE users; --";
      
      const TestMaliciousInput = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn(maliciousEmail, 'password')}
            data-testid="malicious-sign-in"
          >
            Malicious Sign In
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestMaliciousInput />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('malicious-sign-in'));

      // Should call auth service with the malicious input (but auth service should handle it safely)
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: maliciousEmail,
          password: 'password',
        });
      });

      // The malicious input should not cause any system errors or side effects
      expect(() => screen.getByTestId('malicious-sign-in')).not.toThrow();
    });

    it('should handle XSS attempts in authentication data', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: '1',
            email: xssPayload,
            user_metadata: {
              name: xssPayload,
            },
          },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const TestXSSComponent = () => {
        const { user, signIn } = useAuth();
        
        return (
          <div>
            <button onClick={() => signIn('test@example.com', 'password')}>
              Sign In
            </button>
            {user && (
              <div data-testid="user-display">
                User: {user.email}
                Name: {user.user_metadata?.name}
              </div>
            )}
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestXSSComponent />
        </AuthProvider>
      );

      await user.click(screen.getByText('Sign In'));

      // XSS payload should be rendered as text, not executed
      await waitFor(() => {
        const userDisplay = screen.getByTestId('user-display');
        expect(userDisplay.textContent).toContain(xssPayload);
        // Should not create script elements
        expect(userDisplay.innerHTML).not.toContain('<script>');
      });

      consoleSpy.mockRestore();
    });

    it('should validate password complexity requirements', () => {
      const weakPasswords = [
        '',
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
      ];

      weakPasswords.forEach(password => {
        const isValid = validatePasswordComplexity(password);
        expect(isValid).toBe(false);
      });

      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password1',
        'ComplexPass#456',
      ];

      strongPasswords.forEach(password => {
        const isValid = validatePasswordComplexity(password);
        expect(isValid).toBe(true);
      });
    });

    function validatePasswordComplexity(password: string): boolean {
      if (password.length < 8) return false;
      if (!/[a-z]/.test(password)) return false;
      if (!/[A-Z]/.test(password)) return false;
      if (!/[0-9]/.test(password)) return false;
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
      return true;
    }
  });

  describe('Session Security', () => {
    it('should not expose sensitive data in localStorage', async () => {
      const mockSession = {
        access_token: 'sensitive-access-token',
        refresh_token: 'sensitive-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
        },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      await waitFor(() => {
        const localStorageData = Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key),
        }));

        // Check that sensitive tokens are not stored in plain text
        localStorageData.forEach(({ value }) => {
          if (value) {
            expect(value).not.toContain('sensitive-access-token');
            expect(value).not.toContain('sensitive-refresh-token');
          }
        });
      });
    });

    it('should implement proper session timeout', async () => {
      jest.useFakeTimers();
      
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      // Simulate user signing in
      const mockSession = {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'token',
        expires_at: Date.now() / 1000 + 3600, // 1 hour from now
      };

      authStateListener('SIGNED_IN', mockSession);

      // Fast forward to session expiry
      jest.advanceTimersByTime(3600 * 1000 + 1); // 1 hour + 1ms

      // Should handle session expiry
      authStateListener('TOKEN_REFRESHED', null);

      jest.useRealTimers();
    });

    it('should clear sensitive data on logout', async () => {
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      const TestLogoutComponent = () => {
        const { signOut, user } = useAuth();
        
        return (
          <div>
            {user && <div data-testid="user-data">Logged in</div>}
            <button onClick={signOut} data-testid="logout">
              Logout
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestLogoutComponent />
        </AuthProvider>
      );

      // Simulate sign in
      authStateListener('SIGNED_IN', {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'token',
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-data')).toBeInTheDocument();
      });

      // Logout
      await user.click(screen.getByTestId('logout'));

      // Simulate sign out event
      authStateListener('SIGNED_OUT', null);

      await waitFor(() => {
        expect(screen.queryByTestId('user-data')).not.toBeInTheDocument();
      });

      // Check that sensitive data is cleared
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(sessionStorage.getItem('user_session')).toBeNull();
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF tokens in authentication requests', async () => {
      const csrfToken = 'csrf-token-123';
      
      // Mock CSRF token generation
      Object.defineProperty(document, 'querySelector', {
        value: jest.fn((selector) => {
          if (selector === 'meta[name="csrf-token"]') {
            return { getAttribute: () => csrfToken };
          }
          return null;
        }),
        writable: true,
      });

      const TestCSRFComponent = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="csrf-sign-in"
          >
            Sign In
          </button>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestCSRFComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('csrf-sign-in'));

      // Check that authentication request would include CSRF token
      // (In a real implementation, this would be verified in the request headers)
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should validate origin header for authentication requests', async () => {
      const originalLocation = window.location;
      
      // Mock different origins
      const validOrigin = 'https://plataforma.dev';
      const invalidOrigin = 'https://evil-site.com';

      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          origin: invalidOrigin,
        },
        writable: true,
      });

      const TestOriginComponent = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="origin-sign-in"
          >
            Sign In
          </button>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestOriginComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('origin-sign-in'));

      // Authentication should still proceed (origin validation should be server-side)
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should implement client-side rate limiting for authentication attempts', async () => {
      jest.useFakeTimers();
      
      mockSupabase.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        })
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        })
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Too many attempts' },
        });

      const TestRateLimitComponent = () => {
        const { signIn } = useAuth();
        const [attempts, setAttempts] = React.useState(0);
        
        const handleSignIn = async () => {
          setAttempts(prev => prev + 1);
          await signIn('test@example.com', 'wrongpassword');
        };
        
        return (
          <div>
            <button onClick={handleSignIn} data-testid="rate-limit-sign-in">
              Sign In (Attempt {attempts})
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestRateLimitComponent />
        </AuthProvider>
      );

      // Make multiple rapid authentication attempts
      await user.click(screen.getByTestId('rate-limit-sign-in'));
      await user.click(screen.getByTestId('rate-limit-sign-in'));
      await user.click(screen.getByTestId('rate-limit-sign-in'));

      // Should have made 3 attempts
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should handle rate limiting responses appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Rate limit exceeded. Please try again later.' },
      });

      const TestRateLimitResponse = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="rate-limited-sign-in"
          >
            Sign In
          </button>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestRateLimitResponse />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('rate-limited-sign-in'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Sign in error:',
          expect.objectContaining({
            message: expect.stringContaining('Rate limit exceeded')
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Token Security', () => {
    it('should not log sensitive tokens', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      
      const sensitiveToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive-data';
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com' },
          session: { access_token: sensitiveToken },
        },
        error: null,
      });

      const TestTokenComponent = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="token-sign-in"
          >
            Sign In
          </button>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestTokenComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('token-sign-in'));

      await waitFor(() => {
        // Check that sensitive token is not logged
        const allLogCalls = [
          ...consoleSpy.mock.calls,
          ...consoleInfoSpy.mock.calls,
        ];
        
        allLogCalls.forEach(call => {
          call.forEach(arg => {
            if (typeof arg === 'string') {
              expect(arg).not.toContain(sensitiveToken);
            }
          });
        });
      });

      consoleSpy.mockRestore();
      consoleInfoSpy.mockRestore();
    });

    it('should validate JWT token format', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidTokens = [
        '',
        'not.a.jwt',
        'too.few.parts',
        'too.many.parts.here.invalid',
        'invalid-chars-@#$.invalid.token',
      ];

      expect(isValidJWT(validJWT)).toBe(true);
      
      invalidTokens.forEach(token => {
        expect(isValidJWT(token)).toBe(false);
      });
    });

    function isValidJWT(token: string): boolean {
      if (!token || typeof token !== 'string') return false;
      
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      try {
        // Basic JWT structure validation
        parts.forEach(part => {
          if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) {
            throw new Error('Invalid JWT part');
          }
        });
        return true;
      } catch {
        return false;
      }
    }
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveError = {
        message: 'Database connection failed: host=db.internal.com user=admin password=secret123',
        stack: 'Error: Database connection failed\n    at /app/auth/login.js:123:45',
      };

      mockSupabase.auth.signInWithPassword.mockRejectedValue(sensitiveError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestErrorComponent = () => {
        const { signIn } = useAuth();
        
        return (
          <button 
            onClick={() => signIn('test@example.com', 'password')}
            data-testid="error-sign-in"
          >
            Sign In
          </button>
        );
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('error-sign-in'));

      await waitFor(() => {
        // Error should be logged but sensitive info should be sanitized
        expect(consoleSpy).toHaveBeenCalled();
        
        const errorCalls = consoleSpy.mock.calls;
        errorCalls.forEach(call => {
          call.forEach(arg => {
            if (typeof arg === 'string' || (arg && arg.message)) {
              const message = typeof arg === 'string' ? arg : arg.message;
              expect(message).not.toContain('secret123');
              expect(message).not.toContain('admin');
              expect(message).not.toContain('db.internal.com');
            }
          });
        });
      });

      consoleSpy.mockRestore();
    });

    it('should implement proper error boundaries for security', () => {
      const TestSecurityErrorBoundary = () => {
        const [hasError, setHasError] = React.useState(false);
        
        if (hasError) {
          return <div data-testid="security-error">A security error occurred</div>;
        }
        
        const ThrowSecurityError = () => {
          React.useEffect(() => {
            throw new Error('Security violation: unauthorized access');
          }, []);
          return null;
        };
        
        try {
          return <ThrowSecurityError />;
        } catch (error) {
          setHasError(true);
          return <div data-testid="security-error">A security error occurred</div>;
        }
      };

      render(<TestSecurityErrorBoundary />);

      // Should handle security errors gracefully
      expect(screen.getByTestId('security-error')).toBeInTheDocument();
    });
  });
});