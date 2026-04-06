# Pixel Office CityHUD

A pixel-art city visualization for Infrastructure as Code (IaC) deployment management, featuring interactive agent dispatching and real-time deployment monitoring.

## 🎯 Overview

Pixel Office CityHUD transforms Infrastructure as Code into an explorable, interactive pixel-art city map. Watch as AI agents traverse the city to scan resources, generate configurations, and deploy infrastructure changes.

**Core Philosophy:** IaC is fundamentally a description of deployment architecture - visualize it as an explorable world map.

### Key Features

- **Interactive Map-Based UI**: Canvas-based rendering at 60fps with smooth pan, zoom, and navigation
- **Three-Level Zoom System**:
  - World View: Test Island + Prod Continent overview
  - Environment View: Single environment with all buildings
  - Building View: Individual building with internal instances
- **Agent System**: Pixel-art agents that move visibly on the map to perform tasks
- **Real-Time Monitoring**: Visual feedback for deployment status, resource changes, and agent activities
- **Keyboard Navigation**: Full keyboard support for accessibility and power users
- **OpenCode Integration**: Ready for integration with OpenCode AI agents

## 🚀 Quick Start

### Installation

```bash
cd pixel-prototype
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173/map/prod` to see the production environment map.

### Forward Deployment Kit JSONL

Start the local bridge first:

```bash
cd opencode-bridge
npm run start
```

Forward a local JSONL file into the Deployment Kit ingest endpoint:

```powershell
Get-Content .\sample-events.jsonl -Raw | npm --prefix .\opencode-bridge run forward:deploykit
```

Secure-network sync workflow:

- Ensure Deployment Kit writes structured events to `stdout`
- Start `opencode-bridge` in this repository
- Use the forwarder to post `stdout JSONL` to `/deploykit/ingest`

### Production Build

```bash
npm run build
npm run preview
```

### Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# Type checking
npm run check
```

### Linting

```bash
npm run lint
```

## 📁 Project Structure

```
pixel-prototype/
├── src/
│   ├── components/
│   │   ├── city/           # City-related components
│   │   │   ├── AgentOfficePanel.tsx      # Agent dispatch interface
│   │   │   ├── BuildingDrawer.tsx        # Building details drawer
│   │   │   └── AgentLedgerDrawer.tsx     # Agent history log
│   │   └── map/            # Map rendering components
│   │       ├── CityMapComplete.tsx       # Main map container
│   │       ├── MapCanvas.tsx             # Canvas-based renderer
│   │       ├── MapControls.tsx           # Zoom/pan controls
│   │       ├── BuildingDetailPanel.tsx   # Building detail panel
│   │       ├── Tooltip.tsx               # Hover tooltips
│   │       ├── AgentRenderer.tsx         # Pixel sprite renderer
│   │       └── DistrictRenderer.tsx      # District card renderer
│   ├── store/              # State management (Zustand)
│   │   ├── agents.ts                   # Agent state
│   │   ├── districts.ts                # District/building state
│   │   ├── mapStore.ts                 # Map viewport & zoom state
│   │   ├── deployStore.ts              # Deployment state
│   │   └── runtimeStore.ts             # Runtime event state
│   ├── hooks/              # React hooks
│   │   └── useKeyboardShortcuts.ts    # Keyboard navigation
│   ├── utils/              # Utility functions
│   │   ├── mapRendering.ts            # Map coordinate transforms
│   │   ├── pathfinding.ts             # Agent pathfinding
│   │   └── spriteData.ts              # Pixel sprite data
│   └── types/              # TypeScript type definitions
│       └── agents.ts                  # Agent & district types
└── docs/                   # Documentation
```

## 🎮 Features

### Map Navigation

- **Pan**: Click and drag to move around the map
- **Zoom**: Scroll wheel or +/- buttons to zoom in/out
- **Click**: Select buildings to view details
- **Keyboard**: Arrow keys to pan, +/- to zoom, ESC to close panels

### Agent System

Agents are dispatched from the office panel to perform tasks across the city:

- **Scanner Agents** (🕵️): Scan infrastructure resources
- **Generator Agents** (👨‍🎨): Generate Terraform configurations
- **Reviewer Agents** (👮): Review and validate changes

Watch as agents:
1. Exit the office panel
2. Walk along paths to target buildings
3. Perform work with visual feedback
4. Return to office when complete

### Deployment Management

- **Change Preview**: See planned changes before deployment
- **Resource Scanning**: Discover existing infrastructure
- **Risk Assessment**: View deployment risks and costs
- **Real-Time Updates**: Monitor deployment progress

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow Keys` | Pan map |
| `+` / `-` | Zoom in/out |
| `Escape` | Close panels / deselect |
| `Tab` | Focus next building |
| `Enter` | Select focused building |
| `Space` | Select focused building |

## 🏗️ Implementation Status

**Status**: ✅ **100% Complete** (21/21 tasks)

### Completed Phases

- ✅ **Phase 1**: Basic Map Rendering Foundation
- ✅ **Phase 2**: Zoom System
- ✅ **Phase 3**: Selection and Details
- ✅ **Phase 4**: Agent Integration
- ✅ **Phase 5**: Visual Polish
- ✅ **Phase 6**: Testing and Refinement

### Component Implementation

All major components implemented:
- ✅ MapCanvas (Canvas-based renderer)
- ✅ MapControls (Zoom/pan controls)
- ✅ BuildingDetailPanel (Slide-out detail panel)
- ✅ Tooltip (Hover information)
- ✅ AgentRenderer (Pixel sprite animation)
- ✅ AgentOfficePanel (Agent dispatch interface)
- ✅ Keyboard navigation system

### Test Coverage

- ✅ Unit tests for stores and utilities
- ✅ Component tests for React components
- ✅ Integration tests for user interactions
- ✅ Performance tests (60fps maintained)

## 🔧 Development Guidelines

### Component Development

1. **Follow existing patterns**: Check similar components before creating new ones
2. **Use TypeScript**: All components must have proper type definitions
3. **Test first**: Write tests before implementation (TDD approach)
4. **Keep components small**: Single responsibility per component
5. **Use hooks**: Extract reusable logic into custom hooks

### State Management

- Use **Zustand** for global state
- Keep stores focused (single responsibility)
- Use selectors to prevent unnecessary re-renders
- Test store actions independently

### Performance

- Canvas rendering must maintain **60fps**
- Use `requestAnimationFrame` for animations
- Memoize expensive computations
- Virtualize lists when rendering many items

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic

### Testing

- Aim for **80%+ test coverage**
- Test user interactions, not just implementation
- Use mocks for external dependencies
- Test error cases and edge cases

## 🎨 Design Philosophy

### Visual Design

- **Pixel Art Style**: Nostalgic, charming, clear visual hierarchy
- **Color Coding**: Test (blue), Prod (orange), Status (green/yellow/red)
- **Animations**: Smooth 60fps transitions, status indicators
- **Accessibility**: WCAG AA compliant, keyboard navigation

### User Experience

- **Immediate Feedback**: Every action has visual response
- **Progressive Disclosure**: Show more detail on zoom
- **Immersive**: Users feel part of the deployment process
- **Fun**: Engaging pixel art makes IaC approachable

## 🔗 OpenCode Integration

The map is designed to integrate with [OpenCode](https://opencode.ai) AI agents:

### Current State
- Mock API simulates OpenCode responses
- Agent data structure mirrors OpenCode agents
- Task dispatch system ready for real API

### Future Integration
Replace `mockOpenCodeApi` with real OpenCode client:
```typescript
// src/lib/opencodeClient.ts (future)
const opencodeClient = new OpenCodeClient({
  baseUrl: import.meta.env.VITE_OPENCODE_BASE_URL,
  apiKey: import.meta.env.VITE_OPENCODE_API_KEY
})
```

## 📚 Documentation

- **Design Spec**: `docs/superpowers/specs/2026-04-06-living-city-map-based-ui-design.md`
- **Component Docs**: Inline comments in source files
- **Type Definitions**: `src/types/`

## 🤝 Contributing

See `CONTRIBUTING.md` for detailed contribution guidelines.

## 📝 License

Internal project - Not for public distribution

## 🔗 Related Projects

- **Deployment Kit**: Parent project for IaC tooling
- **OpenCode**: AI-powered development platform
- **Terraform**: Infrastructure as Code tooling
