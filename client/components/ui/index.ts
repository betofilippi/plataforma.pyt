// Design System Components
export { WindowCard } from './WindowCard';
export { WindowButton } from './WindowButton';
export { WindowInput, WindowTextarea, WindowSelect } from './WindowInput';
export { WindowToggle } from './WindowToggle';
export { CurrentUserAvatar } from './CurrentUserAvatar';
export { NotificationBadge } from './NotificationBadge';
export { ContextMenu, useContextMenu, getStandardModuleContextOptions } from './ContextMenu';

// Re-export design system utilities
export { designSystem, createWindowCard, createButton, createInput, cssVariables } from '@/lib/design-system';

// Legacy components (manter compatibilidade)
export { Button } from './button';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Label } from './label';