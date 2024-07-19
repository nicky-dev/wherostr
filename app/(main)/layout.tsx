'use client'
import { AppContextProvider } from '@/contexts/AppContext'
import { AccountContextProvider } from '@/contexts/AccountContext'
import SplashScreen from '@/components/SplashScreen'
import SnackbarAlert from '@/components/SnackbarAlert'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppContextProvider>
      <AccountContextProvider>
        <main className="relative min-h-full h-full flex flex-col flex-1">
          {children}
        </main>
        <SplashScreen />
        <SnackbarAlert />
      </AccountContextProvider>
    </AppContextProvider>
  )
}
