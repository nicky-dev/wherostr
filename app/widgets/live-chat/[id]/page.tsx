'use client'
import { Box } from '@mui/material'
import { useParams } from 'next/navigation'
import LiveChatBox from '@/components/LiveChatBox'
import { AccountContextProvider } from '@/contexts/AccountContext'

export default function Page() {
  const { id } = useParams()
  return (
    <AccountContextProvider>
      <Box className="w-full h-full flex justify-center">
        <Box className="h-full w-96 bg-disabled">
          <LiveChatBox naddr={typeof id === 'string' ? id : undefined} />
        </Box>
      </Box>
    </AccountContextProvider>
  )
}
