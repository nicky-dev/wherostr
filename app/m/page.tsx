'use client'
import { RedirectType } from 'next/dist/client/components/redirect'
import { redirect, useSearchParams } from 'next/navigation'

export default function Page() {
  const query = useSearchParams()
  const q = query.get('q')
  redirect('/g/' + q?.slice(0, -2) || q || '', RedirectType.replace)
}
