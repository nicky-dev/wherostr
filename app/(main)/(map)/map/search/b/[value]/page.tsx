'use client'

import Feed from '@/components/Feed'
import { useParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

export default function Page() {
  const { value } = useParams()
  const pathname = usePathname()

  const q = useMemo(
    () => (typeof value === 'string' ? decodeURIComponent(value) : ''),
    [value],
  )
  if (!q) return

  return <Feed q={`b:${q}`} pathname={pathname} />
}
