'use client'

import Feed from '@/components/Feed'
import { useParams, usePathname } from 'next/navigation'

export default function Page() {
  const { value } = useParams()
  const pathname = usePathname()

  return <Feed q={`l:${value}`} pathname={pathname} />
}
