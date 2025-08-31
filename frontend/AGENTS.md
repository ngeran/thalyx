# Agent Guidelines for Thalyx Frontend

## Build Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint on all files

## Code Style Guidelines

### Imports & Modules
- Use named imports: `import { useState } from "react"`
- Use `@/` alias for src directory: `import { Card } from "@/components/ui/Card"`
- Group imports: React/React DOM, third-party libraries, local components/utilities

### Components
- Use function components with hooks
- Use `React.forwardRef` for reusable UI components
- Set `displayName` for forwarded components
- Use compound component pattern for complex UI elements

### Styling
- Use Tailwind CSS classes
- Use `cn()` utility for conditional classes: `cn("base-class", condition && "conditional-class")`
- Follow design system color tokens: `bg-primary`, `text-muted-foreground`
- Use CSS variables for theming support

### Naming Conventions
- Components: PascalCase (`DashboardPage`, `PageSidebar`)
- Files: PascalCase for components, camelCase for utilities
- Hooks: camelCase with `use` prefix (`useNavigation`)
- Functions: camelCase

### Error Handling
- Use try/catch blocks for async operations
- Throw descriptive Error objects
- Handle loading states appropriately

### Linting
- Follow ESLint recommended rules
- React hooks rules enabled
- Unused vars ignored for uppercase patterns (React components)

### File Structure
- `src/components/ui/` - Reusable UI components
- `src/components/layout/` - Layout components
- `src/pages/` - Page components
- `src/lib/` - Utilities and API client
- `src/hooks/` - Custom React hooks