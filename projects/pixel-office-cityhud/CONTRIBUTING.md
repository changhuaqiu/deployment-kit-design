# Contributing to Pixel Office CityHUD

Thank you for your interest in contributing to Pixel Office CityHUD! This document provides guidelines and instructions for contributing to the project.

## 🎯 Project Overview

Pixel Office CityHUD is a pixel-art city visualization for Infrastructure as Code (IaC) deployment management. The project uses React, TypeScript, Canvas API, and Zustand for state management.

**Core Philosophy:** IaC is fundamentally a description of deployment architecture - visualize it as an explorable world map.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ (recommended: v20 LTS)
- **npm**: v9+ or **yarn**: v1.22+
- **Git**: Latest version
- **Editor**: VS Code (recommended) with TypeScript extensions

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd deployment-kit-design/projects/pixel-office-cityhud/pixel-prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173/map/prod
   ```

5. **Run tests in parallel**
   ```bash
   npm test
   ```

## 📁 Project Structure

```
pixel-prototype/
├── src/
│   ├── components/         # React components
│   │   ├── city/          # City-related UI components
│   │   └── map/           # Map rendering components
│   ├── store/             # Zustand state management
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── runtime/           # Runtime integration layer
├── public/                # Static assets
└── docs/                  # Project documentation
```

## 🏗️ Development Workflow

### 1. Branch Strategy

- **main/master**: Production-ready code
- **feature/***: New features
- **fix/***: Bug fixes
- **refactor/***: Code refactoring
- **docs/***: Documentation updates

### 2. Component Development

#### Component Structure

```typescript
// src/components/example/ExampleComponent.tsx
import { useState } from 'react'
import { useExampleStore } from '@/store/exampleStore'

interface ExampleComponentProps {
  /** Prop description */
  value: string
  /** Optional callback */
  onChange?: (value: string) => void
}

/**
 * Component description
 *
 * @remarks
 * Additional implementation notes if needed
 */
export function ExampleComponent({ value, onChange }: ExampleComponentProps) {
  const [localState, setLocalState] = useState(value)

  // Component implementation

  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

#### Best Practices

1. **Use TypeScript**:
   - All components must have prop interfaces
   - Use proper type definitions for all variables
   - Avoid `any` type

2. **Component Naming**:
   - Use PascalCase for components: `MapCanvas.tsx`
   - Use kebab-case for files: `map-canvas.test.tsx`
   - Be descriptive: `BuildingDetailPanel` not `Panel`

3. **Keep Components Small**:
   - Single responsibility per component
   - Extract reusable logic into hooks
   - Maximum 200-300 lines per component

4. **Props Design**:
   - Use interfaces for props
   - Add JSDoc comments for complex props
   - Provide default values for optional props

### 3. State Management with Zustand

#### Store Structure

```typescript
// src/store/exampleStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface ExampleState {
  items: Item[]
  selectedId: string | null
}

interface ExampleActions {
  addItem: (item: Item) => void
  removeItem: (id: string) => void
  setSelectedId: (id: string | null) => void
}

export const useExampleStore = create<ExampleState & ExampleActions>()(
  devtools(
    (set) => ({
      // State
      items: [],
      selectedId: null,

      // Actions
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),

      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),

      setSelectedId: (id) => set({ selectedId: id })
    }),
    { name: 'ExampleStore' }
  )
)
```

#### Store Best Practices

1. **Separate State and Actions**: Use different interfaces
2. **Use DevTools**: Add middleware for debugging
3. **Keep Stores Focused**: One store per domain (agents, map, districts, etc.)
4. **Use Selectors**: Prevent unnecessary re-renders
   ```typescript
   // ❌ Bad: Re-renders on any store change
   const state = useExampleStore()

   // ✅ Good: Only re-renders when items change
   const items = useExampleStore((state) => state.items)
   ```

### 4. Testing

#### Unit Tests

```typescript
// src/components/example/ExampleComponent.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExampleComponent } from './ExampleComponent'

describe('ExampleComponent', () => {
  it('renders with default props', () => {
    render(<ExampleComponent value="test" />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn()
    render(<ExampleComponent value="test" onChange={handleChange} />)

    // User interaction
    // ...

    expect(handleChange).toHaveBeenCalled()
  })
})
```

#### Testing Best Practices

1. **Test User Behavior**, Not Implementation:
   - ✅ Test: "Clicking button calls onChange"
   - ❌ Test: "setState is called with value"

2. **Use Descriptive Test Names**:
   - ✅ Good: "renders agent card with correct status"
   - ❌ Bad: "test 1"

3. **Follow AAA Pattern**:
   - **Arrange**: Set up test data
   - **Act**: Perform action
   - **Assert**: Verify result

4. **Test Coverage**:
   - Aim for **80%+ coverage**
   - Test happy paths and error cases
   - Test edge cases (empty arrays, null values, etc.)

#### Test Commands

```bash
# Run all tests once
npm test

# Watch mode (re-run on changes)
npm run test:watch

# Run specific test file
npm test ExampleComponent.test.tsx

# Run tests with coverage
npm test -- --coverage
```

### 5. Canvas Rendering

#### Canvas Component Structure

```typescript
// src/components/map/ExampleCanvas.tsx
import { useRef, useEffect } from 'react'

export function ExampleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Animation loop
    let animationId: number
    function animate() {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw frame
      // ...

      // Schedule next frame
      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} />
}
```

#### Canvas Best Practices

1. **Performance**:
   - Use `requestAnimationFrame` for animations
   - Target **60fps** (16.67ms per frame)
   - Batch draw calls when possible

2. **Coordinate Transforms**:
   - Separate map coordinates from screen coordinates
   - Use transform functions for conversions
   - Test hit detection thoroughly

3. **Memory Management**:
   - Clean up animations in `useEffect` return
   - Avoid creating objects in render loop
   - Use object pooling for sprites

### 6. Code Style

#### Formatting

We use **Prettier** for code formatting:

```bash
# Format all files
npm run format
# (Note: Add this script to package.json if not present)
```

#### Linting

We use **ESLint** for code quality:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

#### Code Style Guidelines

1. **Naming Conventions**:
   - Components: PascalCase (`MapCanvas`)
   - Functions: camelCase (`renderBuilding`)
   - Constants: UPPER_SNAKE_CASE (`MAX_ZOOM_LEVEL`)
   - Types/Interfaces: PascalCase (`Building`)

2. **Imports**:
   - Group imports: External → Internal → Relative
   - Use `@/` alias for src imports
   - Remove unused imports

3. **Comments**:
   - Add JSDoc for public functions
   - Comment complex logic
   - Keep comments up-to-date

4. **File Organization**:
   - One component per file
   - Co-locate tests with components
   - Use barrel exports (`index.ts`) for related modules

## 🎨 Design Guidelines

### Visual Design

- **Pixel Art Style**: Use pixel-perfect rendering
- **Color Palette**: Stick to defined color variables
- **Spacing**: Use consistent spacing (4px grid)
- **Typography**: Use defined font families and sizes

### Accessibility

1. **Keyboard Navigation**:
   - All interactive elements must be keyboard accessible
   - Use semantic HTML (`button`, `a`, `input`)
   - Add `tabIndex` where appropriate

2. **ARIA Labels**:
   - Add `aria-label` to icon-only buttons
   - Use `role` for custom components
   - Announce dynamic changes

3. **Color Contrast**:
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text
   - Don't rely on color alone to convey meaning

### Performance

1. **Rendering**:
   - Canvas must maintain **60fps**
   - React components should render efficiently
   - Use `React.memo` for expensive components

2. **Bundle Size**:
   - Lazy load routes where appropriate
   - Avoid large libraries
   - Use tree-shaking

3. **Optimization**:
   - Memoize expensive computations
   - Use `useCallback` and `useMemo` appropriately
   - Profile performance before optimizing

## 🧪 Testing Requirements

### Before Committing

1. **Run Tests**:
   ```bash
   npm test
   ```

2. **Type Check**:
   ```bash
   npm run check
   ```

3. **Lint**:
   ```bash
   npm run lint
   ```

4. **Build**:
   ```bash
   npm run build
   ```

### Test Coverage

- **Minimum**: 80% coverage
- **Target**: 90%+ coverage for critical paths
- **Check coverage**: `npm test -- --coverage`

## 📝 Commit Guidelines

### Commit Message Format

Follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
# Feature
git commit -m "feat(map): add zoom controls UI"

# Bug fix
git commit -m "fix(agent): prevent duplicate agent creation"

# Documentation
git commit -m "docs(readme): update getting started guide"

# Refactoring
git commit -m "refactor(store): extract common store logic"
```

## 🐛 Bug Reports

### Before Creating Bug Report

1. **Check existing issues**: Search for similar problems
2. **Reproduce bug**: Confirm it's reproducible
3. **Isolate problem**: Create minimal reproduction

### Bug Report Template

```markdown
**Description**: Brief description of the bug

**Steps to Reproduce**:
1. Go to...
2. Click on...
3. See error...

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Node Version: [e.g., v20.10.0]

**Screenshots**: If applicable

**Additional Context**: Any other relevant information
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**: Brief description

**Problem Statement**: What problem does this solve?

**Proposed Solution**: How should it work?

**Alternatives Considered**: Other approaches you considered

**Additional Context**: Mockups, examples, etc.
```

## 🔍 Code Review Guidelines

### For Reviewers

1. **Be Constructive**: Focus on code, not person
2. **Explain Why**: Don't just say "change this", explain why
3. **Approve Quickly**: Don't delay for trivial issues
4. **Test Changes**: Verify code works before approving

### For Authors

1. **Keep PRs Focused**: One feature per PR
2. **Respond to Feedback**: Address all review comments
3. **Update Docs**: Keep documentation in sync
4. **Add Tests**: Ensure tests pass

## 📚 Resources

### Documentation

- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Zustand**: https://zustand-demo.pmnd.rs
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

### Internal Docs

- **Design Spec**: `docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md`
- **Type Definitions**: `src/types/`
- **Component Comments**: Inline JSDoc comments

## 🤝 Community Guidelines

### Code of Conduct

1. **Be Respectful**: Treat everyone with respect
2. **Be Inclusive**: Welcome diverse perspectives
3. **Be Collaborative**: Work together constructively
4. **Be Professional**: Maintain professional discourse

### Getting Help

1. **Read Docs**: Check existing documentation first
2. **Search Issues**: Look for similar problems
3. **Ask Questions**: Don't hesitate to ask for help
4. **Share Knowledge**: Help others when you can

## 🎯 Success Criteria

Your contribution is successful when:

- ✅ All tests pass (`npm test`)
- ✅ No linting errors (`npm run lint`)
- ✅ No type errors (`npm run check`)
- ✅ Build succeeds (`npm run build`)
- ✅ Code follows style guidelines
- ✅ Tests have adequate coverage
- ✅ Documentation is updated
- ✅ PR description is clear

---

Thank you for contributing to Pixel Office CityHUD! Your contributions help make Infrastructure as Code more accessible and engaging. 🚀