import type { InventoryItem, ResourceChange, RiskTag } from '@/store/deployStore'

export type DistrictKey = 'business' | 'data' | 'network' | 'security' | 'ops' | 'config'

export const districtMeta: Record<DistrictKey, { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }> = {
  business: { label: '业务街区', tone: 'neutral' },
  data: { label: '数据仓储区', tone: 'warn' },
  network: { label: '交通网络区', tone: 'info' },
  security: { label: '安全治理区', tone: 'bad' },
  ops: { label: '监控运维区', tone: 'info' },
  config: { label: '配置文书区', tone: 'neutral' },
}

function byType(type: string): DistrictKey {
  const t = type.toLowerCase()
  if (t.includes('db') || t.includes('rds') || t.includes('postgres') || t.includes('mysql') || t.includes('redis') || t.includes('kafka')) return 'data'
  if (t.includes('s3') || t.includes('bucket') || t.includes('object') || t.includes('storage')) return 'data'
  if (t.includes('vpc') || t.includes('subnet') || t.includes('security_group') || t.includes('load_balancer') || t.includes('alb') || t.includes('nlb') || t.includes('ingress') || t.includes('cloudfront') || t.includes('waf')) return 'network'
  if (t.includes('iam') || t.includes('kms') || t.includes('policy') || t.includes('role') || t.includes('secret')) return 'security'
  if (t.includes('log') || t.includes('metric') || t.includes('trace') || t.includes('alarm') || t.includes('monitor')) return 'ops'
  if (t.includes('config') || t.includes('parameter') || t.includes('env') || t.includes('vars')) return 'config'
  return 'business'
}

function byRisk(riskTags: RiskTag[]): DistrictKey | null {
  if (riskTags.includes('iam')) return 'security'
  if (riskTags.includes('network')) return 'network'
  if (riskTags.includes('data')) return 'data'
  return null
}

export function districtForResource(r: Pick<ResourceChange, 'type' | 'riskTags'>): DistrictKey {
  return byRisk(r.riskTags) ?? byType(r.type)
}

export function districtForInventory(i: Pick<InventoryItem, 'type'>): DistrictKey {
  return byType(i.type)
}

export function buildingLabel(type: string) {
  const t = type.toLowerCase()
  if (t.includes('db') || t.includes('rds') || t.includes('postgres') || t.includes('mysql')) return '金库/档案馆'
  if (t.includes('redis')) return '分拨中心'
  if (t.includes('kafka') || t.includes('mq')) return '交通枢纽'
  if (t.includes('waf') || t.includes('gateway') || t.includes('ingress')) return '城门/海关'
  if (t.includes('iam') || t.includes('policy') || t.includes('role')) return '通行证系统'
  if (t.includes('bucket') || t.includes('s3')) return '仓库/港口'
  if (t.includes('security_group') || t.includes('acl')) return '检查站'
  return '设施'
}

