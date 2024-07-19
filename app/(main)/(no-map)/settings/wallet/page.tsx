'use client'

import { Box, Divider, Typography } from '@mui/material'
import dynamic from 'next/dynamic'

const BitcoinConnect = dynamic(
  () => import('@getalby/bitcoin-connect-react').then(({ Button }) => Button),
  { ssr: false },
)

export default function Page() {
  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold">
        Nostr Wallet Connect
      </Typography>
      <Divider className="!my-4" />
      <BitcoinConnect />
    </Box>
  )
}
