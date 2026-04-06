import { describe, it, expect } from 'vitest';
import { createDistrictStore } from '@/store/districts';
import { DistrictType } from '@/types/agents';

describe('District Store', () => {
  describe('Creating district with supervisor', () => {
    it('should create a new district with supervisor', () => {
      const store = createDistrictStore();
      const districtId = 'test-compute';
      const city = 'test' as const;
      const type = DistrictType.COMPUTE;

      store.getState().createDistrict(districtId, city, type);

      const district = store.getState().districts[districtId];
      expect(district).toBeDefined();
      expect(district.id).toBe(districtId);
      expect(district.city).toBe(city);
      expect(district.type).toBe(type);
      expect(district.supervisor).toBeDefined();
      expect(district.supervisor.name).toContain('运营总监');
      expect(district.status).toBe('healthy');
      expect(district.issues).toHaveLength(0);
    });
  });

  describe('Adding issue to district', () => {
    it('should add an issue to district', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);

      const issue = {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'medium' as const,
        message: 'Resource drift detected'
      };

      store.getState().addIssue('test-compute', issue);

      const district = store.getState().districts['test-compute'];
      expect(district.issues).toHaveLength(1);
      expect(district.issues[0]).toEqual(issue);
    });

    it('should update district status to warning when issue is added', () => {
      const store = createDistrictStore();
      const issue = {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'medium' as const,
        message: 'Resource drift detected'
      };

      store.getState().createDistrict('test-data', 'test', DistrictType.DATA);
      store.getState().addIssue('test-data', issue);

      const district = store.getState().districts['test-data'];
      expect(district.status).toBe('warning');
    });

    it('should add multiple issues to district', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);

      store.getState().addIssue('test-compute', {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'low' as const,
        message: 'Minor resource drift'
      });

      store.getState().addIssue('test-compute', {
        id: 'issue-2',
        type: 'capacity' as const,
        severity: 'high' as const,
        message: 'Capacity exceeded'
      });

      const district = store.getState().districts['test-compute'];
      expect(district.issues).toHaveLength(2);
    });
  });

  describe('Resolving issue', () => {
    it('should remove issue by id', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);
      store.getState().addIssue('test-compute', {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'medium' as const,
        message: 'Resource drift detected'
      });

      store.getState().resolveIssue('test-compute', 'issue-1');

      const district = store.getState().districts['test-compute'];
      expect(district.issues).toHaveLength(0);
    });

    it('should update district status to healthy when all issues resolved', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);

      store.getState().addIssue('test-compute', {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'medium' as const,
        message: 'Resource drift detected'
      });

      store.getState().addIssue('test-compute', {
        id: 'issue-2',
        type: 'capacity' as const,
        severity: 'high' as const,
        message: 'Capacity exceeded'
      });

      // District should be error with high severity issues
      expect(store.getState().districts['test-compute'].status).toBe('error');

      // Resolve one issue
      store.getState().resolveIssue('test-compute', 'issue-1');
      expect(store.getState().districts['test-compute'].status).toBe('error');

      // Resolve remaining issue
      store.getState().resolveIssue('test-compute', 'issue-2');
      expect(store.getState().districts['test-compute'].status).toBe('healthy');
    });

    it('should not change status when resolving non-existent issue', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);
      store.getState().addIssue('test-compute', {
        id: 'issue-1',
        type: 'drift' as const,
        severity: 'medium' as const,
        message: 'Resource drift detected'
      });

      store.getState().resolveIssue('test-compute', 'non-existent');
      expect(store.getState().districts['test-compute'].status).toBe('warning');
    });
  });

  describe('Updating district metrics', () => {
    it('should update district metrics', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);

      const metrics = {
        resourceCount: 5,
        healthPercent: 85,
        customMetric: 'CPU',
        customValue: '45%'
      };

      store.getState().updateMetrics('test-compute', metrics);

      const district = store.getState().districts['test-compute'];
      expect(district.metrics).toEqual(metrics);
    });

    it('should preserve existing metrics when updating partially', () => {
      const store = createDistrictStore();
      store.getState().createDistrict('test-compute', 'test', DistrictType.COMPUTE);

      store.getState().updateMetrics('test-compute', {
        resourceCount: 3,
        healthPercent: 75
      });

      store.getState().updateMetrics('test-compute', {
        customMetric: 'Memory',
        customValue: '60%'
      });

      const district = store.getState().districts['test-compute'];
      expect(district.metrics.resourceCount).toBe(3);
      expect(district.metrics.healthPercent).toBe(75);
      expect(district.metrics.customMetric).toBe('Memory');
      expect(district.metrics.customValue).toBe('60%');
    });
  });

  describe('City and view dimension management', () => {
    it('should set selected city', () => {
      const store = createDistrictStore();
      store.getState().setCity('test');
      expect(store.getState().selectedCity).toBe('test');
    });

    it('should set view dimension', () => {
      const store = createDistrictStore();
      store.getState().setViewDimension('resource');
      expect(store.getState().viewDimension).toBe('resource');
    });

    it('should handle null city', () => {
      const store = createDistrictStore();
      store.getState().setCity(null);
      expect(store.getState().selectedCity).toBeNull();
    });
  });
});