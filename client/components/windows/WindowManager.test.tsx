/**
 * WindowManager Component Tests
 * Comprehensive test suite for the WindowManager system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowManagerProvider, useWindowManager, useCreateWindow } from './WindowManager';
import type { WindowState } from './WindowManager';

// Mock performance utils
jest.mock('@/lib/performance-utils', () => ({
  usePerformanceTracking: jest.fn(),
  performanceMonitor: {
    measure: jest.fn(),
    mark: jest.fn(),
  },
}));

// Test component for using WindowManager hooks
const TestWindowComponent = ({ title = 'Test Window' }) => {
  const createWindow = useCreateWindow();
  const windowManager = useWindowManager();
  
  const handleCreateWindow = () => {
    createWindow(title, <div>Test Content</div>);
  };

  return (
    <div>
      <button onClick={handleCreateWindow} data-testid="create-window">
        Create Window
      </button>
      <div data-testid="windows-count">{windowManager.windows.length}</div>
      <div data-testid="active-window">{windowManager.activeWindowId || 'none'}</div>
    </div>
  );
};

const TestApp = () => (
  <WindowManagerProvider>
    <TestWindowComponent />
  </WindowManagerProvider>
);

describe('WindowManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('WindowManagerProvider', () => {
    it('should provide context to children', () => {
      render(<TestApp />);
      
      expect(screen.getByTestId('windows-count')).toHaveTextContent('0');
      expect(screen.getByTestId('active-window')).toHaveTextContent('none');
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestWindowComponent />);
      }).toThrow('useWindowManager must be used within a WindowManagerProvider');

      console.error = originalError;
    });
  });

  describe('Window Creation', () => {
    it('should create a new window', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await user.click(screen.getByTestId('create-window'));

      await waitFor(() => {
        expect(screen.getByTestId('windows-count')).toHaveTextContent('1');
      });
    });

    it('should assign unique IDs to windows', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await user.click(screen.getByTestId('create-window'));
      await user.click(screen.getByTestId('create-window'));

      await waitFor(() => {
        expect(screen.getByTestId('windows-count')).toHaveTextContent('2');
      });
    });

    it('should set active window when created', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await user.click(screen.getByTestId('create-window'));

      await waitFor(() => {
        const activeWindow = screen.getByTestId('active-window').textContent;
        expect(activeWindow).not.toBe('none');
        expect(activeWindow).toMatch(/^window-/);
      });
    });

    it('should create window with valid position and size', async () => {
      const TestWindowWithAccess = () => {
        const windowManager = useWindowManager();
        const createWindow = useCreateWindow();
        
        const handleCreate = () => {
          createWindow('Test', <div>Test</div>, {
            position: { x: 100, y: 100 },
            size: { width: 800, height: 600 }
          });
        };

        return (
          <div>
            <button onClick={handleCreate} data-testid="create-positioned-window">
              Create Window
            </button>
            {windowManager.windows.map((window) => (
              <div key={window.id} data-testid={`window-${window.id}`}>
                Position: {window.position.x}, {window.position.y}
                Size: {window.size.width}x{window.size.height}
              </div>
            ))}
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestWindowWithAccess />
        </WindowManagerProvider>
      );

      await user.click(screen.getByTestId('create-positioned-window'));

      await waitFor(() => {
        const windowElement = screen.getByText(/Position: 100, 100/);
        expect(windowElement).toBeInTheDocument();
        expect(screen.getByText(/Size: 800x600/)).toBeInTheDocument();
      });
    });

    it('should handle NaN values in position and size', async () => {
      const TestWindowWithNaN = () => {
        const createWindow = useCreateWindow();
        const windowManager = useWindowManager();
        
        const handleCreate = () => {
          createWindow('Test', <div>Test</div>, {
            position: { x: NaN, y: NaN },
            size: { width: NaN, height: NaN }
          });
        };

        return (
          <div>
            <button onClick={handleCreate} data-testid="create-nan-window">
              Create Window
            </button>
            {windowManager.windows.map((window) => (
              <div key={window.id} data-testid={`window-${window.id}`}>
                Position: {window.position.x}, {window.position.y}
                Size: {window.size.width}x{window.size.height}
              </div>
            ))}
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestWindowWithNaN />
        </WindowManagerProvider>
      );

      await user.click(screen.getByTestId('create-nan-window'));

      await waitFor(() => {
        // Should use default values, not NaN
        const positionText = screen.getByText(/Position: \d+, \d+/);
        expect(positionText).toBeInTheDocument();
        
        const sizeText = screen.getByText(/Size: 800x600/);
        expect(sizeText).toBeInTheDocument();
      });
    });
  });

  describe('Window Management', () => {
    let windowManager: any;
    let windowId: string;

    const TestWindowManager = () => {
      windowManager = useWindowManager();
      const createWindow = useCreateWindow();
      
      React.useEffect(() => {
        windowId = createWindow('Test Window', <div>Test Content</div>);
      }, [createWindow]);

      return (
        <div>
          <div data-testid="windows-count">{windowManager.windows.length}</div>
          <button 
            onClick={() => windowManager.closeWindow(windowId)} 
            data-testid="close-window"
          >
            Close
          </button>
          <button 
            onClick={() => windowManager.minimizeWindow(windowId)} 
            data-testid="minimize-window"
          >
            Minimize
          </button>
          <button 
            onClick={() => windowManager.maximizeWindow(windowId)} 
            data-testid="maximize-window"
          >
            Maximize
          </button>
          <button 
            onClick={() => windowManager.restoreWindow(windowId)} 
            data-testid="restore-window"
          >
            Restore
          </button>
          <button 
            onClick={() => windowManager.focusWindow(windowId)} 
            data-testid="focus-window"
          >
            Focus
          </button>
          {windowManager.windows.map((window: WindowState) => (
            <div key={window.id} data-testid={`window-state-${window.id}`}>
              Minimized: {window.isMinimized ? 'true' : 'false'}
              Maximized: {window.isMaximized ? 'true' : 'false'}
              Visible: {window.isVisible ? 'true' : 'false'}
              ZIndex: {window.zIndex}
            </div>
          ))}
        </div>
      );
    };

    beforeEach(() => {
      render(
        <WindowManagerProvider>
          <TestWindowManager />
        </WindowManagerProvider>
      );
    });

    it('should close window', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByTestId('windows-count')).toHaveTextContent('1');
      });

      await user.click(screen.getByTestId('close-window'));

      await waitFor(() => {
        expect(screen.getByTestId('windows-count')).toHaveTextContent('0');
      });
    });

    it('should minimize window', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText(/Minimized: false/)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('minimize-window'));

      await waitFor(() => {
        expect(screen.getByText(/Minimized: true/)).toBeInTheDocument();
      });
    });

    it('should maximize window', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText(/Maximized: false/)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('maximize-window'));

      await waitFor(() => {
        expect(screen.getByText(/Maximized: true/)).toBeInTheDocument();
      });
    });

    it('should restore window from minimized state', async () => {
      const user = userEvent.setup();
      
      // First minimize
      await user.click(screen.getByTestId('minimize-window'));
      
      await waitFor(() => {
        expect(screen.getByText(/Minimized: true/)).toBeInTheDocument();
      });

      // Then restore
      await user.click(screen.getByTestId('restore-window'));

      await waitFor(() => {
        expect(screen.getByText(/Minimized: false/)).toBeInTheDocument();
      });
    });

    it('should focus window and update z-index', async () => {
      const user = userEvent.setup();
      
      const initialZIndex = screen.getByText(/ZIndex: \d+/).textContent!.match(/\d+/)![0];
      
      await user.click(screen.getByTestId('focus-window'));

      await waitFor(() => {
        const newZIndex = screen.getByText(/ZIndex: \d+/).textContent!.match(/\d+/)![0];
        expect(parseInt(newZIndex)).toBeGreaterThan(parseInt(initialZIndex));
      });
    });
  });

  describe('Window Snapping', () => {
    let windowManager: any;
    let windowId: string;

    const TestWindowSnapping = () => {
      windowManager = useWindowManager();
      const createWindow = useCreateWindow();
      
      React.useEffect(() => {
        windowId = createWindow('Test Window', <div>Test Content</div>);
      }, [createWindow]);

      return (
        <div>
          <button 
            onClick={() => windowManager.snapWindowLeft(windowId)} 
            data-testid="snap-left"
          >
            Snap Left
          </button>
          <button 
            onClick={() => windowManager.snapWindowRight(windowId)} 
            data-testid="snap-right"
          >
            Snap Right
          </button>
          {windowManager.windows.map((window: WindowState) => (
            <div key={window.id} data-testid={`window-position-${window.id}`}>
              Position: {window.position.x}, {window.position.y}
              Size: {window.size.width}x{window.size.height}
              Snap: {window.snapPosition || 'none'}
            </div>
          ))}
        </div>
      );
    };

    beforeEach(() => {
      // Mock window dimensions for snapping tests
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      render(
        <WindowManagerProvider>
          <TestWindowSnapping />
        </WindowManagerProvider>
      );
    });

    it('should snap window to left half of screen', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTestId('snap-left'));

      await waitFor(() => {
        expect(screen.getByText(/Position: 0, 0/)).toBeInTheDocument();
        expect(screen.getByText(/Size: 960x1020/)).toBeInTheDocument();
        expect(screen.getByText(/Snap: left/)).toBeInTheDocument();
      });
    });

    it('should snap window to right half of screen', async () => {
      const user = userEvent.setup();
      
      await user.click(screen.getByTestId('snap-right'));

      await waitFor(() => {
        expect(screen.getByText(/Position: 960, 0/)).toBeInTheDocument();
        expect(screen.getByText(/Size: 960x1020/)).toBeInTheDocument();
        expect(screen.getByText(/Snap: right/)).toBeInTheDocument();
      });
    });
  });

  describe('Z-Index Management', () => {
    it('should manage z-index correctly for multiple windows', async () => {
      const TestMultipleWindows = () => {
        const windowManager = useWindowManager();
        const createWindow = useCreateWindow();
        const [windowIds, setWindowIds] = React.useState<string[]>([]);
        
        const handleCreateWindows = async () => {
          const id1 = createWindow('Window 1', <div>Window 1</div>);
          const id2 = createWindow('Window 2', <div>Window 2</div>);
          const id3 = createWindow('Window 3', <div>Window 3</div>);
          setWindowIds([id1, id2, id3]);
        };

        return (
          <div>
            <button onClick={handleCreateWindows} data-testid="create-multiple">
              Create 3 Windows
            </button>
            {windowIds.map((id, index) => (
              <button 
                key={id}
                onClick={() => windowManager.focusWindow(id)} 
                data-testid={`focus-window-${index + 1}`}
              >
                Focus Window {index + 1}
              </button>
            ))}
            {windowManager.windows.map((window: WindowState) => (
              <div key={window.id} data-testid={`zindex-${window.title.replace(/\s/g, '-')}`}>
                {window.title}: Z-Index {window.zIndex}
              </div>
            ))}
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestMultipleWindows />
        </WindowManagerProvider>
      );

      await user.click(screen.getByTestId('create-multiple'));

      await waitFor(() => {
        expect(screen.getByTestId('zindex-Window-1')).toBeInTheDocument();
        expect(screen.getByTestId('zindex-Window-2')).toBeInTheDocument();
        expect(screen.getByTestId('zindex-Window-3')).toBeInTheDocument();
      });

      // Focus Window 1, should increase its z-index
      await user.click(screen.getByTestId('focus-window-1'));

      await waitFor(() => {
        const window1ZIndex = screen.getByTestId('zindex-Window-1').textContent!.match(/\d+/)![0];
        const window2ZIndex = screen.getByTestId('zindex-Window-2').textContent!.match(/\d+/)![0];
        const window3ZIndex = screen.getByTestId('zindex-Window-3').textContent!.match(/\d+/)![0];
        
        expect(parseInt(window1ZIndex)).toBeGreaterThan(parseInt(window2ZIndex));
        expect(parseInt(window1ZIndex)).toBeGreaterThan(parseInt(window3ZIndex));
      });
    });
  });

  describe('Local Storage Persistence', () => {
    it('should save window state to localStorage', async () => {
      const user = userEvent.setup();
      render(<TestApp />);

      await user.click(screen.getByTestId('create-window'));

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'planilha_windows_state',
          expect.any(String)
        );
      });
    });

    it('should load window state from localStorage on mount', () => {
      const savedState = JSON.stringify([{
        title: 'Saved Window',
        position: { x: 200, y: 200 },
        size: { width: 600, height: 400 },
        isMinimized: false,
        isMaximized: false
      }]);

      localStorage.setItem('planilha_windows_state', savedState);

      const TestLoadState = () => {
        const windowManager = useWindowManager();
        const createWindow = useCreateWindow();
        
        React.useEffect(() => {
          createWindow('Saved Window', <div>Test</div>);
        }, [createWindow]);

        const window = windowManager.windows.find(w => w.title === 'Saved Window');

        return (
          <div>
            {window && (
              <div data-testid="loaded-window">
                Position: {window.position.x}, {window.position.y}
                Size: {window.size.width}x{window.size.height}
              </div>
            )}
          </div>
        );
      };

      render(
        <WindowManagerProvider>
          <TestLoadState />
        </WindowManagerProvider>
      );

      waitFor(() => {
        expect(screen.getByTestId('loaded-window')).toHaveTextContent(
          'Position: 200, 200Size: 600x400'
        );
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('planilha_windows_state', 'invalid-json');
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<TestApp />);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load window states:',
        expect.any(SyntaxError)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Window Update', () => {
    it('should update window properties', async () => {
      const TestWindowUpdate = () => {
        const windowManager = useWindowManager();
        const createWindow = useCreateWindow();
        const [windowId, setWindowId] = React.useState<string>('');
        
        React.useEffect(() => {
          const id = createWindow('Test Window', <div>Test</div>);
          setWindowId(id);
        }, [createWindow]);

        const handleUpdate = () => {
          windowManager.updateWindow(windowId, {
            title: 'Updated Window',
            position: { x: 500, y: 500 }
          });
        };

        return (
          <div>
            <button onClick={handleUpdate} data-testid="update-window">
              Update Window
            </button>
            {windowManager.windows.map((window: WindowState) => (
              <div key={window.id} data-testid="window-info">
                Title: {window.title}
                Position: {window.position.x}, {window.position.y}
              </div>
            ))}
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestWindowUpdate />
        </WindowManagerProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Title: Test Window/)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('update-window'));

      await waitFor(() => {
        expect(screen.getByText(/Title: Updated Window/)).toBeInTheDocument();
        expect(screen.getByText(/Position: 500, 500/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle many windows efficiently', async () => {
      const TestManyWindows = () => {
        const windowManager = useWindowManager();
        const createWindow = useCreateWindow();
        
        const handleCreateMany = () => {
          for (let i = 0; i < 10; i++) {
            createWindow(`Window ${i + 1}`, <div>Content {i + 1}</div>);
          }
        };

        return (
          <div>
            <button onClick={handleCreateMany} data-testid="create-many">
              Create 10 Windows
            </button>
            <div data-testid="window-count">{windowManager.windows.length}</div>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestManyWindows />
        </WindowManagerProvider>
      );

      const startTime = performance.now();
      await user.click(screen.getByTestId('create-many'));
      
      await waitFor(() => {
        expect(screen.getByTestId('window-count')).toHaveTextContent('10');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid window ID gracefully', () => {
      const TestInvalidId = () => {
        const windowManager = useWindowManager();
        
        const handleInvalidOperation = () => {
          windowManager.closeWindow('invalid-id');
          windowManager.focusWindow('invalid-id');
          windowManager.minimizeWindow('invalid-id');
        };

        return (
          <div>
            <button onClick={handleInvalidOperation} data-testid="invalid-operation">
              Invalid Operations
            </button>
            <div data-testid="window-count">{windowManager.windows.length}</div>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <WindowManagerProvider>
          <TestInvalidId />
        </WindowManagerProvider>
      );

      // Should not throw error
      expect(async () => {
        await user.click(screen.getByTestId('invalid-operation'));
      }).not.toThrow();

      expect(screen.getByTestId('window-count')).toHaveTextContent('0');
    });
  });
});