import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DistrictRenderer } from './DistrictRenderer';
import { District, DistrictType } from '@/types/agents';

describe('DistrictRenderer', () => {
  const mockDistrict: District = {
    id: 'test-compute',
    city: 'test',
    type: DistrictType.COMPUTE,
    supervisor: {
      id: 'sup-1',
      name: '👨‍💼 运营总监',
      icon: 'user',
      role: 'Operations Manager',
      statusMessage: '监控系统性能',
      active: false
    },
    resources: [],
    issues: [],
    status: 'healthy',
    metrics: {
      resourceCount: 5,
      healthPercent: 100,
      customMetric: 'CPU',
      customValue: '45%'
    },
    position: {
      x: 100,
      y: 100,
      width: 120,
      height: 80
    }
  };

  it('renders district card with supervisor info', () => {
    render(<DistrictRenderer district={mockDistrict} />);

    expect(screen.getByText('👨‍💼 运营总监')).toBeInTheDocument();
    expect(screen.getByText('Operations Manager')).toBeInTheDocument();
    expect(screen.getByText('监控系统性能')).toBeInTheDocument();
  });

  it('renders metrics', () => {
    const { container } = render(<DistrictRenderer district={mockDistrict} />);

    // Check that key metrics are displayed
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('45%');
    expect(container.textContent).toContain('100%');
    expect(container.textContent).toContain('CPU');
    expect(container.textContent).toContain('Resources');
  });

  it('applies healthy status styling', () => {
    const { container } = render(<DistrictRenderer district={mockDistrict} />);

    const card = container.querySelector('.district-card');
    expect(card).toHaveClass('border-green-300', 'bg-green-50');
  });

  it('applies warning status styling', () => {
    const warningDistrict = { ...mockDistrict, status: 'warning' as const };
    const { container } = render(<DistrictRenderer district={warningDistrict} />);

    const card = container.querySelector('.district-card');
    expect(card).toHaveClass('border-yellow-300', 'bg-yellow-50');
  });

  it('applies error status styling', () => {
    const errorDistrict = { ...mockDistrict, status: 'error' as const };
    const { container } = render(<DistrictRenderer district={errorDistrict} />);

    const card = container.querySelector('.district-card');
    expect(card).toHaveClass('border-red-300', 'bg-red-50');
  });

  it('renders issues when present', () => {
    const districtWithIssues = {
      ...mockDistrict,
      issues: [
        {
          id: 'issue-1',
          type: 'drift' as const,
          severity: 'high' as const,
          message: 'Configuration drift detected'
        }
      ]
    };

    render(<DistrictRenderer district={districtWithIssues} />);

    expect(screen.getByText('Configuration drift detected')).toBeInTheDocument();
    expect(screen.getByText('1 Issue')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <div>
        <DistrictRenderer district={mockDistrict} onClick={handleClick} />
      </div>
    );

    const card = container.querySelector('.district-card');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockDistrict);
    }
  });

  it('handles hover events', () => {
    const handleHover = vi.fn();
    const { container } = render(
      <div>
        <DistrictRenderer district={mockDistrict} onHover={handleHover} />
      </div>
    );

    const card = container.querySelector('.district-card');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.mouseEnter(card);

      expect(handleHover).toHaveBeenCalledTimes(1);
      expect(handleHover).toHaveBeenCalledWith(mockDistrict, true);
    }
  });
});
