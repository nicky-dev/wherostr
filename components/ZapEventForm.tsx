'use client'
import '@getalby/bitcoin-connect-react'
import ProfileChip from '@/components/ProfileChip'
import ShortTextNoteCard from '@/components/ShortTextNoteCard'
import {
  Avatar,
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useContext, useMemo, useState } from 'react'
import { ElectricBolt } from '@mui/icons-material'
import { AppContext } from '@/contexts/AppContext'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useForm } from 'react-hook-form'
import numeral from 'numeral'
import { requestProvider } from 'webln'
import { LoadingButton } from '@mui/lab'
import { useNDK } from '@/hooks/useNostr'

const amountFormat = '0,0.[0]a'

const ZapEventForm = ({ event }: { event: NDKEvent }) => {
  const ndk = useNDK()
  const { setEventAction, showSnackbar } = useContext(AppContext)
  const { register, handleSubmit, setValue, watch } = useForm()
  const [loading, setLoading] = useState(false)
  const _amountValue = watch('amount')

  const maxWeight = useMemo(
    () =>
      event
        .getMatchingTags('zap')
        .reduce((a, [, , , w]) => (a += Number(w)), 0),
    [event],
  )

  const zaps = useMemo(() => {
    const zaps = event.getMatchingTags('zap')
    const zapsplit: { pubkey: string; weight: number; amount: number }[] = []
    zaps.forEach(([, p, , w]) => {
      const weight = Number(w)
      const amount = (1 - weight / maxWeight) * Number(_amountValue || 0)
      zapsplit.push({ pubkey: p, weight, amount })
    })
    return zapsplit
  }, [event, _amountValue, maxWeight])

  const _handleSubmit = useCallback(
    async (data: any) => {
      try {
        setLoading(true)
        const { amount, comment } = data
        const zapsplit = zaps.slice()
        if (!zapsplit.length) {
          zapsplit.push({
            pubkey: event.isReplaceable()
              ? event.tagValue('p') || event.pubkey
              : event.pubkey,
            amount,
            weight: 1,
          })
        }

        let totalAmount = 0
        await Promise.all(
          zapsplit.map(async (zap) => {
            const pr = await event.zap(
              Math.floor(zap.amount) * 1000,
              comment || undefined,
              undefined,
              ndk.getUser({ hexpubkey: zap.pubkey }),
            )
            if (pr) {
              await (await requestProvider()).sendPayment(pr)
              totalAmount += Math.floor(zap.amount)
            }
          }),
        )
        showSnackbar(`Zapped ${totalAmount} sats`, {
          slotProps: {
            alert: {
              severity: 'success',
            },
          },
        })
        setEventAction(undefined)
      } finally {
        setLoading(false)
      }
    },
    [event, ndk, zaps, setEventAction, showSnackbar],
  )
  const amountValue = useMemo(
    () =>
      _amountValue
        ? numeral(_amountValue).format(amountFormat).toUpperCase()
        : '?',
    [_amountValue],
  )
  const amountOptions = useMemo(
    () => [
      5, 20, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000,
      1_000_000,
    ],
    [],
  )
  const handleClickAmount = useCallback(
    (amount: Number) => () => {
      setValue('amount', amount)
    },
    [setValue],
  )

  return (
    <form onSubmit={handleSubmit(_handleSubmit)}>
      <Box className="mt-3 grid gap-3 grid-cols-1">
        {!!zaps.length && (
          <Box className="flex gap-4 justify-center">
            {zaps.map((d) => {
              return (
                <Box key={d.pubkey} className="relative scale-125">
                  <ProfileChip
                    hexpubkey={d.pubkey}
                    showName={false}
                    clickable={false}
                  />
                  <Avatar className="!absolute top-0 left-0 !bg-disabled-dark opacity-75">
                    <Typography variant="body2" fontWeight="bold" color="white">
                      {d.amount
                        ? numeral(Math.floor(d.amount)).format(amountFormat)
                        : d.weight}
                    </Typography>
                  </Avatar>
                </Box>
              )
            })}
          </Box>
        )}
        <Box className="relative max-h-80 border-2 border-secondary-dark rounded-2xl overflow-hidden">
          <ShortTextNoteCard
            event={event}
            action={false}
            relatedNoteVariant="link"
          />
          <Box className="absolute top-0 left-0 w-full h-full min-h-[320px] bg-gradient-to-t from-[#000000] to-50%" />
          <Box className="absolute right-0 bottom-0 border-t-2 border-l-2 border-secondary-dark p-2 rounded-tl-2xl text-primary bg-secondary-dark">
            <ElectricBolt />
          </Box>
        </Box>
        <TextField
          disabled={loading}
          placeholder="Comment"
          variant="outlined"
          fullWidth
          autoComplete="off"
          {...register('comment')}
        />
        <Box className="flex gap-2 flex-wrap justify-center">
          {amountOptions.map((amount, index) => (
            <Button
              disabled={loading}
              key={index}
              color="secondary"
              variant="outlined"
              startIcon={<ElectricBolt className="!text-primary" />}
              onClick={handleClickAmount(amount)}
            >
              {numeral(amount).format(amountFormat).toUpperCase()}
            </Button>
          ))}
        </Box>
        <TextField
          disabled={loading}
          placeholder="Amount"
          variant="outlined"
          type="number"
          fullWidth
          required
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment className="!text-primary" position="start">
                <ElectricBolt />
              </InputAdornment>
            ),
            endAdornment: <InputAdornment position="end">sats</InputAdornment>,
            inputProps: {
              min: 1,
            },
          }}
          {...register('amount', {
            required: true,
            valueAsNumber: true,
            min: 1,
          })}
        />
        <Box className="flex justify-end">
          <LoadingButton
            loading={loading}
            variant="contained"
            type="submit"
            loadingPosition="start"
            startIcon={<ElectricBolt />}
          >
            {`Zap ${amountValue} sats`}
          </LoadingButton>
        </Box>
      </Box>
    </form>
  )
}

export default ZapEventForm
