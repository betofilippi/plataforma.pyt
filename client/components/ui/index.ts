// Design System Components
export { WindowCard } from './WindowCard';
export { WindowButton } from './WindowButton';
export { WindowInput, WindowTextarea, WindowSelect } from './WindowInput';
export { WindowToggle } from './WindowToggle';
export { CurrentUserAvatar } from './CurrentUserAvatar';
export { NotificationBadge } from './NotificationBadge';
export { ContextMenu, useContextMenu, getStandardModuleContextOptions } from './ContextMenu';
export { StandardIcon, SystemIcon, AdminIcon, PlatformIcon, ModuleIcon } from './StandardIcon';
export { StandardCard, SystemCard, AdminCard, PlatformCard, SettingsCard, InfoCard } from './StandardCard';
export { StandardBadge, StatusBadge, RoleBadge, PermissionBadge, ModuleBadge } from './StandardBadge';

// Re-export design system utilities
export { designSystem, createWindowCard, createButton, createInput, cssVariables } from '@/lib/design-system';

// Legacy components (manter compatibilidade)
export { Button } from './button';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Label } from './label';