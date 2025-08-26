import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationItem {
  title: string;
  component: ReactNode;
}

interface SheetNavigationContextType {
  stack: NavigationItem[];
  push: (item: NavigationItem) => void;
  pop: () => void;
  popTo: (index: number) => void;
  reset: () => void;
}

const SheetNavigationContext = createContext<SheetNavigationContextType | undefined>(undefined);

export function SheetNavigationProvider({
  children,
  onStackEmpty,
  initialStack = []
}: {
  children: ReactNode;
  onStackEmpty?: () => void;
  initialStack?: NavigationItem[];
}) {
  const [stack, setStack] = useState<NavigationItem[]>(initialStack);

  const push = (item: NavigationItem) => {
    setStack(prev => [...prev, item]);
  };

  const pop = () => {
    setStack(prev => {
      if (prev.length <= 1) {
        onStackEmpty?.();
        return prev;
      }
      return prev.slice(0, -1);
    });
  };

  const popTo = (index: number) => {
    setStack(prev => prev.slice(0, index + 1));
  };

  const reset = () => {
    setStack(initialStack);
  };

  return (
    <SheetNavigationContext.Provider value={{ stack, push, pop, popTo, reset }}>
      {children}
    </SheetNavigationContext.Provider>
  );
}

export function useSheetNavigation() {
  const context = useContext(SheetNavigationContext);
  if (!context) {
    throw new Error('useSheetNavigation must be used within SheetNavigationProvider');
  }
  return context;
}