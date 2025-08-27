/**
 * WindowCard Component Tests
 * Tests for the core UI component WindowCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowCard } from './WindowCard';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
  Minus: () => <div data-testid="minimize-icon">-</div>,
  Square: () => <div data-testid="maximize-icon">□</div>,
  MoreHorizontal: () => <div data-testid="menu-icon">⋯</div>,
}));

describe('WindowCard', () => {
  const defaultProps = {
    title: 'Test Window',
    children: <div>Test Content</div>,
  };

  it('should render with title and content', () => {
    render(<WindowCard {...defaultProps} />);
    
    expect(screen.getByText('Test Window')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render without title', () => {
    render(<WindowCard>{defaultProps.children}</WindowCard>);
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.queryByText('Test Window')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WindowCard {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with icon in header', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<WindowCard {...defaultProps} icon={<TestIcon />} />);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  describe('Window Controls', () => {
    it('should show close button when onClose provided', () => {
      const onClose = jest.fn();
      render(<WindowCard {...defaultProps} onClose={onClose} />);
      
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<WindowCard {...defaultProps} onClose={onClose} />);
      
      await user.click(screen.getByTestId('close-icon').parentElement!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should show minimize button when onMinimize provided', () => {
      const onMinimize = jest.fn();
      render(<WindowCard {...defaultProps} onMinimize={onMinimize} />);
      
      expect(screen.getByTestId('minimize-icon')).toBeInTheDocument();
    });

    it('should call onMinimize when minimize button clicked', async () => {
      const user = userEvent.setup();
      const onMinimize = jest.fn();
      render(<WindowCard {...defaultProps} onMinimize={onMinimize} />);
      
      await user.click(screen.getByTestId('minimize-icon').parentElement!);
      expect(onMinimize).toHaveBeenCalledTimes(1);
    });

    it('should show maximize button when onMaximize provided', () => {
      const onMaximize = jest.fn();
      render(<WindowCard {...defaultProps} onMaximize={onMaximize} />);
      
      expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
    });

    it('should call onMaximize when maximize button clicked', async () => {
      const user = userEvent.setup();
      const onMaximize = jest.fn();
      render(<WindowCard {...defaultProps} onMaximize={onMaximize} />);
      
      await user.click(screen.getByTestId('maximize-icon').parentElement!);
      expect(onMaximize).toHaveBeenCalledTimes(1);
    });

    it('should show all controls when all callbacks provided', () => {
      const handlers = {
        onClose: jest.fn(),
        onMinimize: jest.fn(),
        onMaximize: jest.fn(),
      };
      
      render(<WindowCard {...defaultProps} {...handlers} />);
      
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
      expect(screen.getByTestId('minimize-icon')).toBeInTheDocument();
      expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
    });
  });

  describe('Header Behavior', () => {
    it('should call onHeaderClick when header is clicked', async () => {
      const user = userEvent.setup();
      const onHeaderClick = jest.fn();
      render(<WindowCard {...defaultProps} onHeaderClick={onHeaderClick} />);
      
      const header = screen.getByText('Test Window').closest('[role="button"]');
      expect(header).toBeInTheDocument();
      
      await user.click(header!);
      expect(onHeaderClick).toHaveBeenCalledTimes(1);
    });

    it('should not make header clickable when onHeaderClick not provided', () => {
      render(<WindowCard {...defaultProps} />);
      
      const header = screen.getByText('Test Window').parentElement;
      expect(header).not.toHaveAttribute('role', 'button');
    });

    it('should handle double click on header when onHeaderDoubleClick provided', async () => {
      const onHeaderDoubleClick = jest.fn();
      render(<WindowCard {...defaultProps} onHeaderDoubleClick={onHeaderDoubleClick} />);
      
      const header = screen.getByText('Test Window').parentElement;
      
      fireEvent.doubleClick(header!);
      expect(onHeaderDoubleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling Variants', () => {
    it('should apply glassmorphism styling by default', () => {
      const { container } = render(<WindowCard {...defaultProps} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('backdrop-blur-xl');
      expect(card).toHaveClass('bg-white/5');
    });

    it('should apply border styling', () => {
      const { container } = render(<WindowCard {...defaultProps} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-white/10');
    });

    it('should apply rounded corners', () => {
      const { container } = render(<WindowCard {...defaultProps} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
    });

    it('should have proper text styling', () => {
      render(<WindowCard {...defaultProps} />);
      
      const title = screen.getByText('Test Window');
      expect(title).toHaveClass('text-white');
      expect(title).toHaveClass('font-medium');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<WindowCard {...defaultProps} />);
      
      const card = screen.getByRole('dialog');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-labelledby');
    });

    it('should have proper heading structure', () => {
      render(<WindowCard {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Window');
    });

    it('should support keyboard navigation for close button', () => {
      const onClose = jest.fn();
      render(<WindowCard {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTestId('close-icon').parentElement;
      expect(closeButton).toHaveAttribute('tabIndex', '0');
      
      fireEvent.keyDown(closeButton!, { key: 'Enter' });
      expect(onClose).toHaveBeenCalledTimes(1);
      
      fireEvent.keyDown(closeButton!, { key: ' ' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Content Rendering', () => {
    it('should render complex children', () => {
      const ComplexContent = () => (
        <div>
          <h4>Nested Content</h4>
          <p>Some text</p>
          <button>Action Button</button>
        </div>
      );
      
      render(
        <WindowCard title="Complex Window">
          <ComplexContent />
        </WindowCard>
      );
      
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
      expect(screen.getByText('Some text')).toBeInTheDocument();
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      render(<WindowCard title="Empty Window" />);
      
      expect(screen.getByText('Empty Window')).toBeInTheDocument();
    });

    it('should handle null/undefined children', () => {
      render(<WindowCard title="Null Content">{null}</WindowCard>);
      
      expect(screen.getByText('Null Content')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should not propagate clicks from control buttons to header', async () => {
      const user = userEvent.setup();
      const onHeaderClick = jest.fn();
      const onClose = jest.fn();
      
      render(
        <WindowCard 
          {...defaultProps} 
          onHeaderClick={onHeaderClick}
          onClose={onClose}
        />
      );
      
      // Click close button should not trigger header click
      await user.click(screen.getByTestId('close-icon').parentElement!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onHeaderClick).not.toHaveBeenCalled();
    });

    it('should handle rapid clicks without issues', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<WindowCard {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTestId('close-icon').parentElement!;
      
      // Rapid clicks
      await user.click(closeButton);
      await user.click(closeButton);
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many children', () => {
      const manyChildren = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Item {i}</div>
      ));
      
      const { container } = render(
        <WindowCard title="Performance Test">
          {manyChildren}
        </WindowCard>
      );
      
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByText('Item 99')).toBeInTheDocument();
    });

    it('should handle frequent prop changes', () => {
      const { rerender } = render(<WindowCard title="Original" />);
      
      for (let i = 0; i < 50; i++) {
        rerender(<WindowCard title={`Title ${i}`} />);
      }
      
      expect(screen.getByText('Title 49')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'This is a very long title that might overflow the container and should be handled gracefully by the component';
      
      render(<WindowCard title={longTitle}>{defaultProps.children}</WindowCard>);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Title with <>&"\'` special chars 测试 🎉';
      
      render(<WindowCard title={specialTitle}>{defaultProps.children}</WindowCard>);
      
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('should handle undefined props gracefully', () => {
      expect(() => {
        render(<WindowCard title={undefined as any}>{defaultProps.children}</WindowCard>);
      }).not.toThrow();
    });
  });
});