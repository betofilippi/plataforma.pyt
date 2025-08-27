/**
 * AuthContext Tests
 * Comprehensive test suite for authentication context and functionality
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import type { User } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
  },
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test component to access auth context
const TestAuthComponent = () => {
  const { 
    user, 
    loading, 
    signIn, 
    signOut, 
    isAuthenticated 
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        {loading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `User: ${user.email}` : 'No User'}
      </div>
      <button 
        onClick={() => signIn('test@example.com', 'password')}
        data-testid="sign-in"
      >
        Sign In
      </button>
      <button onClick={signOut} data-testid="sign-out">
        Sign Out
      </button>
    </div>
  );
};

const TestApp = ({ children }: { children?: React.ReactNode }) => (
  <AuthProvider>
    {children || <TestAuthComponent />}
  </AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Provider Initialization', () => {
    it('should initialize with loading state', () => {
      render(<TestApp />);
      
      expect(screen.getByTestId('auth-state')).toHaveTextContent('Loading');
      expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
    });

    it('should throw error when used outside provider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestAuthComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should check initial session on mount', async () => {
      render(<TestApp />);
      
      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
      });
    });

    it('should setup auth state change listener', async () => {
      render(<TestApp />);
      
      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });
  });

  describe('Authentication Flow', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
      },
    };

    it('should sign in successfully', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      render(<TestApp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      });

      await user.click(screen.getByTestId('sign-in'));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });
    });

    it('should handle sign in error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      render(<TestApp />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      });

      await user.click(screen.getByTestId('sign-in'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Sign in error:',
          { message: 'Invalid credentials' }
        );
      });

      consoleSpy.mockRestore();
    });

    it('should sign out successfully', async () => {
      const user = userEvent.setup();
      
      // Setup initial authenticated state
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      render(<TestApp />);
      
      // Simulate user being signed in
      act(() => {
        authStateListener('SIGNED_IN', { user: mockUser, access_token: 'token' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Authenticated');
      });

      await user.click(screen.getByTestId('sign-out'));

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      });

      // Simulate sign out event
      act(() => {
        authStateListener('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should handle sign out error', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      render(<TestApp />);

      await user.click(screen.getByTestId('sign-out'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Sign out error:',
          { message: 'Sign out failed' }
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    const mockUser: Partial<User> = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    it('should restore session on initialization', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'token',
          },
        },
        error: null,
      });

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: test@example.com');
      });
    });

    it('should handle session restoration error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error getting session:',
          { message: 'Session error' }
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle expired session', async () => {
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      render(<TestApp />);

      // Simulate session expiry
      act(() => {
        authStateListener('TOKEN_REFRESHED', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      });
    });
  });

  describe('Auth State Changes', () => {
    let authStateListener: jest.Mock;

    beforeEach(() => {
      authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });
    });

    it('should handle SIGNED_IN event', async () => {
      render(<TestApp />);

      const mockSession = {
        user: { id: '1', email: 'user@example.com' },
        access_token: 'token',
      };

      act(() => {
        authStateListener('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('User: user@example.com');
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      render(<TestApp />);

      act(() => {
        authStateListener('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
      });
    });

    it('should handle TOKEN_REFRESHED event', async () => {
      render(<TestApp />);

      const mockSession = {
        user: { id: '1', email: 'user@example.com' },
        access_token: 'new-token',
      };

      act(() => {
        authStateListener('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Authenticated');
      });
    });
  });

  describe('Authentication State', () => {
    it('should correctly report authentication state', async () => {
      const TestAuthState = () => {
        const { isAuthenticated, user } = useAuth();
        
        return (
          <div>
            <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
            <div data-testid="has-user">{user ? 'true' : 'false'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestAuthState />
        </AuthProvider>
      );

      // Initially not authenticated
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('has-user')).toHaveTextContent('false');
      });

      // Simulate authentication
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      act(() => {
        authStateListener('SIGNED_IN', {
          user: { id: '1', email: 'test@example.com' },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('has-user')).toHaveTextContent('true');
      });
    });
  });

  describe('Demo Mode', () => {
    beforeEach(() => {
      process.env.DEMO_MODE = 'true';
    });

    afterEach(() => {
      delete process.env.DEMO_MODE;
    });

    it('should handle demo authentication', async () => {
      const user = userEvent.setup();
      
      const TestDemoAuth = () => {
        const { signIn, user: authUser, isAuthenticated } = useAuth();
        
        return (
          <div>
            <button 
              onClick={() => signIn('adm@nxt.eco.br', 'anypassword')}
              data-testid="demo-sign-in"
            >
              Demo Sign In
            </button>
            <div data-testid="demo-state">
              {isAuthenticated ? 'Demo Authenticated' : 'Not Authenticated'}
            </div>
            <div data-testid="demo-user">
              {authUser ? authUser.email : 'No User'}
            </div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestDemoAuth />
        </AuthProvider>
      );

      await user.click(screen.getByTestId('demo-sign-in'));

      await waitFor(() => {
        expect(screen.getByTestId('demo-state')).toHaveTextContent('Demo Authenticated');
        expect(screen.getByTestId('demo-user')).toHaveTextContent('adm@nxt.eco.br');
      });
    });
  });

  describe('Error Boundary', () => {
    it('should handle provider initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      render(<TestApp />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error initializing auth:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should cleanup auth listener on unmount', () => {
      const unsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = render(<TestApp />);
      
      unmount();
      
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('should show loading during initialization', () => {
      // Make getSession never resolve to test loading state
      mockSupabase.auth.getSession.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TestApp />);

      expect(screen.getByTestId('auth-state')).toHaveTextContent('Loading');
    });

    it('should show loading during sign in', async () => {
      const user = userEvent.setup();
      
      // Make signIn take time to resolve
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            data: { user: null, session: null },
            error: null
          }), 100)
        )
      );

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-state')).toHaveTextContent('Not Authenticated');
      });

      await user.click(screen.getByTestId('sign-in'));

      // Should briefly show loading
      expect(screen.getByTestId('auth-state')).toHaveTextContent('Loading');
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate to login on authentication failure', async () => {
      const user = userEvent.setup();
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      render(<TestApp />);

      await user.click(screen.getByTestId('sign-in'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should navigate to dashboard on successful authentication', async () => {
      const authStateListener = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateListener.mockImplementation(callback);
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      render(<TestApp />);

      act(() => {
        authStateListener('SIGNED_IN', {
          user: { id: '1', email: 'test@example.com' },
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });
});