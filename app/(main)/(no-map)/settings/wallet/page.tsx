'use client'

import { Box, Divider, NoSsr, Typography } from '@mui/material'
import { useMemo } from 'react'
import UAParser from 'ua-parser-js'
import dynamic from 'next/dynamic'

const BitcoinConnect = dynamic(
  () => import('@getalby/bitcoin-connect-react').then(({ Button }) => Button),
  { ssr: false },
)

export default function Page() {
  const ua = useMemo(
    () =>
      typeof navigator !== 'undefined'
        ? new UAParser(navigator.userAgent)
        : undefined,
    [],
  )
  const appName = useMemo(() => {
    if (!ua) return
    const os = ua.getOS()
    const browser = ua.getBrowser()
    return `Wherostr - ${os.name} - ${browser.name}`
  }, [ua])
  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold">
        Nostr Wallet Connect
      </Typography>
      <Divider className="!my-4" />
      <NoSsr>{!!appName && <BitcoinConnect appName={appName} />}</NoSsr>
    </Box>
  )
}
