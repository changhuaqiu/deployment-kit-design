import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import ReactDOM from 'react-dom'

// Make vi available globally for tests
global.vi = vi

// Set up React for Zustand tests
window.React = React
window.ReactDOM = ReactDOM

// Mock ImageData for canvas operations
global.ImageData = class ImageData {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
} as any

// Mock HTMLCanvasElement.getContext for tests that use canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => new ImageData(new Uint8ClampedArray(4), 1, 1)),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  clearRect: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  strokeRect: vi.fn(),
})) as any

