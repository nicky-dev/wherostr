'use client'
import Feed from '@/components/Feed'
import { useParams, usePathname } from 'next/navigation'

export default function Page() {
  const { geohash } = useParams()
  const pathname = usePathname()
  return <Feed q={`g:${geohash}`} pathname={pathname} />
}
