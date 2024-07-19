'use client'

import { ProfileCard } from '@/components/ProfileCard'
import { useAccountStore } from '@/contexts/AccountContext'
import { Typography } from '@mui/material'

export default function Page() {
  const user = useAccountStore((state) => state.user)
  return (
    <>
      <ProfileCard hexpubkey={user?.hexpubkey} />
      <Typography variant="h4">Coming soon</Typography>
    </>
  )
}
