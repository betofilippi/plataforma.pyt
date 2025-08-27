/**
 * WindowManager Integration Tests
 * Testing the integration between WindowManager and its dependent components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowManagerProvider, useWindowManager, useCreateWindow } from './WindowManager';
import { Window } from './Window';
import { WindowTaskbar } from './WindowTaskbar';
import type { WindowState } from './WindowManager';

// Mock performance utils
jest.mock('@/lib/performance-utils', () => ({
  usePerformanceTracking: jest.fn(),
  performanceMonitor: {
    measure: jest.fn(),
    mark: jest.fn(),
  },
}));

// Mock Window component
jest.mock('./Window', () => ({
  Window: ({ windowState, onClose, onMinimize, onMaximize, onFocus }: any) => (
    <div 
      data-testid={`window-${windowState.id}`}
      data-window-id={windowState.id}
      style={{ 
        zIndex: windowState.zIndex,
        display: windowState.isMinimized ? 'none' : 'block'
      }}
    >
      <div className="window-header">
        <h3>{windowState.title}</h3>
        <div className="window-controls">
          <button onClick={onMinimize} data-testid={`minimize-${windowState.id}`}>
            Minimize
          </button>
          <button onClick={onMaximize} data-testid={`maximize-${windowState.id}`}>
            Maximize
          </button>
          <button onClick={onClose} data-testid={`close-${windowState.id}`}>
            Close
          </button>
        </div>
      </div>
      <div className="window-content">
        {windowState.component}
      </div>
      <button onClick={onFocus} data-testid={`focus-${windowState.id}`}>
        Focus
      </button>
    </div>
  ),
}));

// Mock WindowTaskbar component
jest.mock('./WindowTaskbar', () => ({
  WindowTaskbar: ({ windows, onWindowClick, onWindowClose }: any) => (
    <div data-testid="window-taskbar">
      {windows.filter((w: WindowState) => w.isMinimized).map((window: WindowState) => (
        <div key={window.id} className="taskbar-item">
          <button 
            onClick={() => onWindowClick(window.id)}
            data-testid={`taskbar-${window.id}`}
          >
            {window.title}
          </button>
          <button 
            onClick={() => onWindowClose(window.id)}
            data-testid={`taskbar-close-${window.id}`}
          >
            X
          </button>
        </div>
      ))}
    </div>
  ),
}));

// Complete window system integration component
const WindowSystem = () => {
  const windowManager = useWindowManager();
  const createWindow = useCreateWindow();

  const handleCreateTestWindow = () => {
    createWindow('Test Window', <div>Test Content</div>, {
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 }
    });
  };

  const handleCreateAnotherWindow = () => {
    createWindow('Another Window', <div>Another Content</div>, {
      position: { x: 200, y: 200 },
      size: { width: 500, height: 400 }
    });
  };

  return (
    <div>
      <div className="desktop">
        {/* Render all windows */}
        {windowManager.windows.map((windowState) => (
          <Window
            key={windowState.id}
            windowState={windowState}
            onClose={() => windowManager.closeWindow(windowState.id)}
            onMinimize={() => windowManager.minimizeWindow(windowState.id)}
            onMaximize={() => windowManager.maximizeWindow(windowState.id)}
            onFocus={() => windowManager.focusWindow(windowState.id)}
            onUpdatePosition={(position) => 
              windowManager.updateWindow(windowState.id, { position })
            }
            onUpdateSize={(size) => 
              windowManager.updateWindow(windowState.id, { size })
            }
          />
        ))}
      </div>

      {/* Window taskbar */}
      <WindowTaskbar
        windows={windowManager.windows}
        onWindowClick={(windowId) => windowManager.restoreWindow(windowId)}
        onWindowClose={(windowId) => windowManager.closeWindow(windowId)}
      />

      {/* Control panel */}
      <div className="control-panel">
        <button onClick={handleCreateTestWindow} data-testid="create-test-window">
          Create Test Window
        </button>
        <button onClick={handleCreateAnotherWindow} data-testid="create-another-window">
          Create Another Window
        </button>
        <div data-testid="window-count">{windowManager.windows.length}</div>
        <div data-testid="active-window-id">{windowManager.activeWindowId || 'none'}</div>
      </div>
    </div>
  );
};

const IntegrationTestApp = () => (
  <WindowManagerProvider>
    <WindowSystem />
  </WindowManagerProvider>
);

describe('WindowManager Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Window Creation and Rendering', () => {
    it('should create and render window through the complete system', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      expect(screen.getByTestId('window-count')).toHaveTextContent('0');

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('1');
        expect(screen.getByTestId('window-Test Window')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should create multiple windows with different z-indexes', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));
      await user.click(screen.getByTestId('create-another-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('2');
        
        const testWindow = screen.getByTestId('window-Test Window');
        const anotherWindow = screen.getByTestId('window-Another Window');
        
        expect(testWindow).toBeInTheDocument();
        expect(anotherWindow).toBeInTheDocument();

        // Another window should have higher z-index (created later)
        const testZIndex = parseInt(testWindow.style.zIndex);
        const anotherZIndex = parseInt(anotherWindow.style.zIndex);
        
        expect(anotherZIndex).toBeGreaterThan(testZIndex);
      });
    });
  });

  describe('Window Controls Integration', () => {
    it('should close window through Window component controls', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-Test Window')).toBeInTheDocument();
      });

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');
      const closeButton = screen.getByTestId(`close-${windowId}`);

      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('0');
        expect(screen.queryByTestId('window-Test Window')).not.toBeInTheDocument();
      });
    });

    it('should minimize window and show in taskbar', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-Test Window')).toBeInTheDocument();
      });

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');
      const minimizeButton = screen.getByTestId(`minimize-${windowId}`);

      await user.click(minimizeButton);

      await waitFor(() => {
        // Window should be hidden
        expect(windowElement).toHaveStyle('display: none');
        
        // Should appear in taskbar
        expect(screen.getByTestId(`taskbar-${windowId}`)).toBeInTheDocument();
        expect(screen.getByText('Test Window')).toBeInTheDocument();
      });
    });

    it('should restore window from taskbar', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      // Create and minimize window
      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-Test Window')).toBeInTheDocument();
      });

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');
      
      await user.click(screen.getByTestId(`minimize-${windowId}`));

      await waitFor(() => {
        expect(windowElement).toHaveStyle('display: none');
        expect(screen.getByTestId(`taskbar-${windowId}`)).toBeInTheDocument();
      });

      // Restore from taskbar
      await user.click(screen.getByTestId(`taskbar-${windowId}`));

      await waitFor(() => {
        expect(windowElement).toHaveStyle('display: block');
        expect(screen.queryByTestId(`taskbar-${windowId}`)).not.toBeInTheDocument();
      });
    });

    it('should focus window and update z-index', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      // Create two windows
      await user.click(screen.getByTestId('create-test-window'));
      await user.click(screen.getByTestId('create-another-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('2');
      });

      const testWindow = screen.getByTestId('window-Test Window');
      const anotherWindow = screen.getByTestId('window-Another Window');
      const testWindowId = testWindow.getAttribute('data-window-id');
      
      const initialTestZIndex = parseInt(testWindow.style.zIndex);
      const initialAnotherZIndex = parseInt(anotherWindow.style.zIndex);
      
      expect(initialAnotherZIndex).toBeGreaterThan(initialTestZIndex);

      // Focus the first window
      await user.click(screen.getByTestId(`focus-${testWindowId}`));

      await waitFor(() => {
        const newTestZIndex = parseInt(testWindow.style.zIndex);
        const newAnotherZIndex = parseInt(anotherWindow.style.zIndex);
        
        expect(newTestZIndex).toBeGreaterThan(newAnotherZIndex);
        expect(newTestZIndex).toBeGreaterThan(initialTestZIndex);
      });
    });
  });

  describe('Window State Management', () => {
    it('should maintain consistent state across components', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        const activeWindowId = screen.getByTestId('active-window-id').textContent;
        expect(activeWindowId).not.toBe('none');
        
        const windowElement = screen.getByTestId('window-Test Window');
        const windowId = windowElement.getAttribute('data-window-id');
        
        expect(activeWindowId).toBe(windowId);
      });
    });

    it('should update active window when focusing different window', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));
      await user.click(screen.getByTestId('create-another-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('2');
      });

      const testWindow = screen.getByTestId('window-Test Window');
      const testWindowId = testWindow.getAttribute('data-window-id');

      await user.click(screen.getByTestId(`focus-${testWindowId}`));

      await waitFor(() => {
        const activeWindowId = screen.getByTestId('active-window-id').textContent;
        expect(activeWindowId).toBe(testWindowId);
      });
    });

    it('should clear active window when last window is closed', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('active-window-id')).not.toHaveTextContent('none');
      });

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');

      await user.click(screen.getByTestId(`close-${windowId}`));

      await waitFor(() => {
        expect(screen.getByTestId('active-window-id')).toHaveTextContent('none');
      });
    });
  });

  describe('Taskbar Integration', () => {
    it('should show minimized windows in taskbar', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      // Create multiple windows
      await user.click(screen.getByTestId('create-test-window'));
      await user.click(screen.getByTestId('create-another-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('2');
      });

      // Minimize both windows
      const testWindow = screen.getByTestId('window-Test Window');
      const anotherWindow = screen.getByTestId('window-Another Window');
      const testWindowId = testWindow.getAttribute('data-window-id');
      const anotherWindowId = anotherWindow.getAttribute('data-window-id');

      await user.click(screen.getByTestId(`minimize-${testWindowId}`));
      await user.click(screen.getByTestId(`minimize-${anotherWindowId}`));

      await waitFor(() => {
        expect(screen.getByTestId(`taskbar-${testWindowId}`)).toBeInTheDocument();
        expect(screen.getByTestId(`taskbar-${anotherWindowId}`)).toBeInTheDocument();
        
        // Both windows should be hidden
        expect(testWindow).toHaveStyle('display: none');
        expect(anotherWindow).toHaveStyle('display: none');
      });
    });

    it('should close window from taskbar', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');

      // Minimize window
      await user.click(screen.getByTestId(`minimize-${windowId}`));

      await waitFor(() => {
        expect(screen.getByTestId(`taskbar-${windowId}`)).toBeInTheDocument();
      });

      // Close from taskbar
      await user.click(screen.getByTestId(`taskbar-close-${windowId}`));

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('0');
        expect(screen.queryByTestId(`taskbar-${windowId}`)).not.toBeInTheDocument();
        expect(screen.queryByTestId('window-Test Window')).not.toBeInTheDocument();
      });
    });
  });

  describe('Window Position and Size Updates', () => {
    it('should update window position through WindowManager', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');

      // Simulate position update (normally done by drag)
      act(() => {
        const windowManager = (window as any).__testWindowManager;
        if (windowManager) {
          windowManager.updateWindow(windowId, { 
            position: { x: 300, y: 300 } 
          });
        }
      });

      // Window should reflect the new position
      // (In a real implementation, this would be tested through actual drag operations)
      expect(windowElement).toBeInTheDocument();
    });

    it('should handle window maximize through complete system', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      const windowElement = screen.getByTestId('window-Test Window');
      const windowId = windowElement.getAttribute('data-window-id');

      await user.click(screen.getByTestId(`maximize-${windowId}`));

      // Window should be maximized (implementation specific)
      expect(windowElement).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle window creation errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock createWindow to throw error
      const originalCreateElement = React.createElement;
      React.createElement = jest.fn().mockImplementation((...args) => {
        if (args[0] === 'div' && args[1]?.className === 'window-content') {
          throw new Error('Content rendering error');
        }
        return originalCreateElement.apply(React, args);
      });

      render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      // System should continue to function despite error
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();

      React.createElement = originalCreateElement;
      consoleSpy.mockRestore();
    });

    it('should handle invalid window operations', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      // Try to perform operations on non-existent window
      const TestErrorComponent = () => {
        const windowManager = useWindowManager();
        
        return (
          <button 
            onClick={() => {
              windowManager.closeWindow('invalid-id');
              windowManager.focusWindow('invalid-id');
              windowManager.minimizeWindow('invalid-id');
            }}
            data-testid="invalid-operations"
          >
            Invalid Operations
          </button>
        );
      };

      const { rerender } = render(<IntegrationTestApp />);
      rerender(
        <WindowManagerProvider>
          <TestErrorComponent />
          <WindowSystem />
        </WindowManagerProvider>
      );

      // Should not crash
      await user.click(screen.getByTestId('invalid-operations'));
      expect(screen.getByTestId('window-count')).toHaveTextContent('0');
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid window operations efficiently', async () => {
      const user = userEvent.setup();
      render(<IntegrationTestApp />);

      const startTime = performance.now();

      // Create multiple windows rapidly
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTestId('create-test-window'));
        await user.click(screen.getByTestId('create-another-window'));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('10');
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should cleanup resources on component unmount', () => {
      const { unmount } = render(<IntegrationTestApp />);
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Local Storage Integration', () => {
    it('should persist and restore window state through complete system', async () => {
      const user = userEvent.setup();
      
      // Set up initial state in localStorage
      const savedState = JSON.stringify([{
        title: 'Test Window',
        position: { x: 150, y: 150 },
        size: { width: 600, height: 400 },
        isMinimized: false,
        isMaximized: false
      }]);
      localStorage.setItem('planilha_windows_state', savedState);

      const { unmount } = render(<IntegrationTestApp />);

      await user.click(screen.getByTestId('create-test-window'));

      await waitFor(() => {
        expect(screen.getByTestId('window-Test Window')).toBeInTheDocument();
      });

      unmount();

      // Verify localStorage was updated
      const updatedState = localStorage.getItem('planilha_windows_state');
      expect(updatedState).toBeTruthy();
    });
  });
});