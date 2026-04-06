import React from 'react'
import { DistrictRenderer } from './DistrictRenderer'
import { District, ViewDimension } from '@/types/agents'

interface DistrictsContainerProps {
  districts: District[]
  width: number
  height: number
  viewDimension: ViewDimension
}

/**
 * DistrictsContainer - Maps over district arrays and renders individual DistrictRenderer components
 * Fixes the interface mismatch where CityMap was passing an array to DistrictRenderer
 */
export const DistrictsContainer: React.FC<DistrictsContainerProps> = ({
  districts,
  width,
  height,
  viewDimension
}) => {
  if (districts.length === 0) {
    return null
  }

  return (
    <>
      {districts.map((district) => (
        <DistrictRenderer
          key={district.id}
          district={district}
        />
      ))}
    </>
  )
}
