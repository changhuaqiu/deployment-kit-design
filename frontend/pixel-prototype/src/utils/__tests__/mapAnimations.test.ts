import { animateZoomTransition, getNextZoomScale } from '../mapAnimations'

describe('Zoom Animations', () => {
  it('calculates correct zoom scale for each level', () => {
    expect(getNextZoomScale('world')).toBe(0.5)
    expect(getNextZoomScale('environment')).toBe(1.0)
    expect(getNextZoomScale('building')).toBe(2.0)
  })

  it('returns animation frame callback', () => {
    const callback = animateZoomTransition(
      { x: 0, y: 0, width: 1200, height: 800, zoom: 'world' },
      'environment',
      100
    )

    expect(typeof callback).toBe('function')
  })

  it('animation callback can be called', () => {
    const callback = animateZoomTransition(
      { x: 0, y: 0, width: 1200, height: 800, zoom: 'world' },
      'environment',
      100
    )

    // Should be able to call it (will be cancelled in real use)
    expect(() => callback(performance.now(), () => {})).not.toThrow()
  })
})