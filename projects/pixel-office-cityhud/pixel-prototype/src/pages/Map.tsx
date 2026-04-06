import CityHudMap from '@/components/city/CityHudMap'
import { useDeployStore } from '@/store/deployStore'

export default function Map() {
  const envFocus = useDeployStore((s) => s.envFocus)
  return (
    <div className="h-screen">
      <CityHudMap env={envFocus} />
    </div>
  )
}

