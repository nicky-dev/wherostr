'use client'

import Feed from '@/components/Feed'
import { RedirectType } from 'next/dist/client/components/redirect'
import { redirect, useSearchParams } from 'next/navigation'

export default function Page() {
  const query = useSearchParams()
  const q = query.get('q') || ''
  if (q.startsWith('g:')) {
    redirect('/g/' + q.slice(2), RedirectType.replace)
  } else if (q.startsWith('t')) {
    redirect('/search/t/' + q.slice(2), RedirectType.replace)
  } else if (q.startsWith('b')) {
    redirect('/search/b/' + q.slice(2), RedirectType.replace)
  } else if (q === 'following') {
    redirect('/following', RedirectType.replace)
  } else if (q === 'global') {
    redirect('/global', RedirectType.replace)
  } else if (q === 'conversation') {
    redirect('/conversation', RedirectType.replace)
  }
  return <Feed q={q} />
}
