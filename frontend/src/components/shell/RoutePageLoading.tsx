'use client'

import { BrandLoadingState } from '@/components/shell/BrandLoadingState'

interface RoutePageLoadingProps {
  fullScreen?: boolean
  label?: string
}

export function RoutePageLoading({ fullScreen = false, label }: RoutePageLoadingProps) {
  return <BrandLoadingState fullScreen={fullScreen} label={label} />
}
