'use client'
import { useNDK } from './useNostr'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from '@nostr-dev-kit/ndk'
import { useMemo } from 'react'
import usePromise from 'react-use-promise'

export const useEvent = (
  idOrFilter: string | NDKFilter<NDKKind>,
  optRelaySet?: NDKRelaySet,
) => {
  const ndk = useNDK()
  const relaySet = useMemo(() => optRelaySet, [optRelaySet])

  return usePromise(
    () =>
      ndk.fetchEvent(
        idOrFilter,
        { cacheUsage: NDKSubscriptionCacheUsage.PARALLEL },
        relaySet,
      ),
    [idOrFilter, relaySet],
  )
}

export const useEvents = (
  filter: NDKFilter<NDKKind>,
  optRelaySet?: NDKRelaySet,
) => {
  const ndk = useNDK()
  const relaySet = useMemo(() => optRelaySet, [optRelaySet])

  return usePromise(
    async () =>
      (await ndk.fetchEvents(
        filter,
        { cacheUsage: NDKSubscriptionCacheUsage.PARALLEL },
        relaySet,
      )) || new Set<NDKEvent>(),
    [filter, relaySet],
  )
}
