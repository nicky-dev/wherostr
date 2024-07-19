import {
  Box,
  Fade,
  FadeProps,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material'
import Image from 'next/image'
import { FC } from 'react'
import logo from '@/public/Wherostr- logo2_forDarkBG.png'
import { useAccountStore } from '@/contexts/AccountContext'

interface SplashScreenProps extends Omit<FadeProps, 'children'> {}
const SplashScreen: FC<SplashScreenProps> = (props) => {
  const signing = useAccountStore((state) => state.signing)
  return (
    <Fade in={signing} {...props}>
      <Paper className="fixed inset-0 z-50 flex justify-center items-center flex-col -mt-16">
        <Box className="relative w-[128px] h-[128px] rounded-full opacity-80">
          <Image fill={true} src={logo.src} alt="Logo" objectFit="contain" />
        </Box>
        <Typography className="tracking-widest !font-bold !text-4xl text-gradient bg-gradient-primary overflow-hidden text-ellipsis whitespace-nowrap">
          Wherostr
        </Typography>
        <Box my={1} />
        <LinearProgress className="min-w-[240px]" />
      </Paper>
    </Fade>
  )
}

export default SplashScreen
