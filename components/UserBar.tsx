'use client'
import {
  ChevronLeft,
  ContentPaste,
  Key,
  Login,
  Logout,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProfileChip from '@/components/ProfileChip'
import classNames from 'classnames'
import { LoadingButton } from '@mui/lab'
import { SignInType, useAccountStore } from '@/contexts/AccountContext'
import { useForm } from 'react-hook-form'
import { usePathname, useRouter } from 'next/navigation'
import { hasNip7Extension } from '@/utils/nostr'
import { useShallow } from 'zustand/react/shallow'

const UserBar = ({ className }: { className?: string }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { register, handleSubmit, setValue, reset } = useForm()
  const { user, signing, signIn, signOut } = useAccountStore(
    useShallow((state) => ({
      user: state.user,
      signing: state.signing,
      signIn: state.signIn,
      signOut: state.signOut,
    })),
  )
  const [open, setOpen] = useState(false)
  const [loginType, setLoginType] = useState<SignInType>()

  const signedIn = useMemo(() => {
    return !!user
  }, [user])

  useEffect(() => {
    reset()
  }, [loginType])

  const handleClickSignIn = useCallback(
    async (type: SignInType) => {
      const user = await signIn(type)
      if (!user) return
      if (!pathname.startsWith('/settings')) {
        router.replace(`${pathname}?q=following&map=`)
      } else {
        router.replace(`/?q=following&map=`)
      }
      setOpen(false)
    },
    [signIn, router, pathname],
  )

  const handleClickSignOut = useCallback(() => {
    signOut()
  }, [signOut])

  const _handleSubmit = useCallback(
    async (values: any) => {
      let user
      if (loginType === 'nsec') {
        user = await signIn(loginType, values.nsec)
      } else if (loginType === 'npub') {
        user = await signIn(loginType, values.npub)
      }
      if (!user) return
      router.replace(`/?q=following&map=`)
      setOpen(false)
    },
    [loginType, router, signIn],
  )

  return (
    <Box
      className={classNames(
        'grid items-center rounded-bl-2xl',
        { 'bg-gradient-primary': signedIn },
        className,
      )}
    >
      {user?.pubkey ? (
        <Box className="flex items-center gap-2 p-1">
          <ProfileChip hexpubkey={user?.pubkey} />
          <IconButton size="small" onClick={handleClickSignOut}>
            <Logout />
          </IconButton>
        </Box>
      ) : (
        <LoadingButton
          loading={signing}
          className="bg-gradient-primary"
          variant="contained"
          onClick={() => setOpen(true)}
          startIcon={<Login />}
          loadingPosition="start"
        >
          Login
        </LoadingButton>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          setLoginType(undefined)
        }}
        fullWidth
        maxWidth={'xs'}
        component="form"
        onSubmit={handleSubmit(_handleSubmit)}
      >
        {!!loginType && (
          <DialogTitle>
            <IconButton
              className="!mr-2"
              onClick={() => setLoginType(undefined)}
            >
              <ChevronLeft />
            </IconButton>
            {loginType === 'nsec'
              ? 'Login with Private Key (insecure)'
              : 'Login as read-only'}
          </DialogTitle>
        )}
        <DialogContent>
          {!loginType ? (
            <>
              <Box className="flex flex-col items-center justify-center">
                {!!hasNip7Extension() && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    className="!min-w-[272px]"
                    disabled={signing}
                    onClick={() => handleClickSignIn('nip7')}
                  >
                    Login with Nostr extension
                  </Button>
                )}
                <Box my={0.5} />
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  className="!min-w-[272px]"
                  disabled={signing}
                  onClick={() => setLoginType('nsec')}
                >
                  Login with Private Key (insecure)
                </Button>
                <Box my={0.5} />
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  className="!min-w-[272px]"
                  disabled={signing}
                  onClick={() => setLoginType('npub')}
                >
                  Login as read-only
                </Button>
              </Box>
              <Divider
                sx={{ my: 2, color: signing ? 'text.disabled' : undefined }}
              >{`Don't have an account ?`}</Divider>
              <Box className="flex flex-col items-center justify-center">
                <Button
                  variant="outlined"
                  size="large"
                  color="inherit"
                  disabled={signing}
                  href="https://nostrudel.ninja/#/signup"
                  target="_blank"
                >
                  Create an account
                </Button>
              </Box>
            </>
          ) : loginType === 'nsec' ? (
            <>
              <Alert severity="warning">
                Using private keys is insecure You should use a browser
                extension like{' '}
                <Link href="https://getalby.com/" target="_blank">
                  Alby
                </Link>
                ,{' '}
                <Link
                  href="https://github.com/susumuota/nostr-keyx"
                  target="_blank"
                >
                  nostr-keyx
                </Link>{' '}
                or{' '}
                <Link
                  href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                  target="_blank"
                >
                  Nos2x
                </Link>
              </Alert>
              <Typography>Enter user private key (nsec)</Typography>
              <TextField
                fullWidth
                margin="dense"
                placeholder="nsec or hex"
                type="password"
                color="secondary"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key className="text-contrast-secondary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <IconButton
                      onClick={async () => {
                        const text = await navigator.clipboard.readText()
                        setValue('nsec', text)
                      }}
                    >
                      <ContentPaste />
                    </IconButton>
                  ),
                }}
                disabled={signing}
                {...register('nsec', {
                  required: true,
                })}
              />
            </>
          ) : loginType === 'npub' ? (
            <>
              <Typography>Enter user npub or NIP-05</Typography>
              <TextField
                fullWidth
                margin="dense"
                placeholder="npub1 or NIP-05"
                color="secondary"
                helperText={
                  <>
                    eg. npub1
                    <br />
                    eg. user@domain.com
                  </>
                }
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={async () => {
                        const text = await navigator.clipboard.readText()
                        setValue('npub', text)
                      }}
                    >
                      <ContentPaste />
                    </IconButton>
                  ),
                }}
                disabled={signing}
                {...register('npub', {
                  required: true,
                })}
              />
            </>
          ) : undefined}
        </DialogContent>
        {!!loginType && (
          <DialogActions className="mx-4">
            <Button
              fullWidth
              disabled={signing}
              size="large"
              sx={{
                color: 'background.paper',
                bgcolor: 'grey.500',
                '&:hover': { bgcolor: 'grey.600' },
              }}
              type="submit"
            >
              Login
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  )
}

export default UserBar

export const GreyButton: FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <Button
      {...props}
      // variant="contained"
      // sx={{
      //   color: 'background.paper',
      //   bgcolor: 'grey.500',
      //   '&:hover': {
      //     bgcolor: 'grey.600',
      //   },
      // }}
    >
      {children}
    </Button>
  )
}
