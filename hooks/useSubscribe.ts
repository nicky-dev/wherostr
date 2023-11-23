import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage,
  NDKSubscriptionOptions,
} from '@nostr-dev-kit/ndk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNDK } from './useNostr'
import { useAccount } from './useAccount'
import { nanoid } from 'nanoid'

export type SubscribeResult = [
  NDKEvent[],
  () => Promise<NDKEvent[] | undefined>,
  NDKEvent[],
  () => void,
]

const sortItems = (
  items: NDKEvent[] | Set<NDKEvent> | IterableIterator<NDKEvent>,
  desc = true
) => {
  const sorter = desc ? (a: NDKEvent, b: NDKEvent) => b.created_at! - a.created_at! : (a: NDKEvent, b: NDKEvent) => a.created_at! - b.created_at!
  return Array.from(items)
    .slice()
    .sort(sorter)
}

export const useSubscribe = (
  filter?: NDKFilter<NDKKind>,
  alwaysShowNewItems: boolean = false,
  optRelaySet?: NDKRelaySet,
  options?: {
    subOptions?: NDKSubscriptionOptions
    sortDesc?: boolean
  },
) => {
  const ndk = useNDK()
  const { signing } = useAccount()
  const [sub, setSub] = useState<NDKSubscription>()
  const [items, setItems] = useState<NDKEvent[]>([])
  const [newItems, setNewItems] = useState<NDKEvent[]>([])
  const eos = useRef(false)

  const relaySet = useMemo(() => optRelaySet, [optRelaySet])
  const subOptions = useMemo(() => options?.subOptions, [options?.subOptions])
  const sortDesc = useMemo(() => options?.sortDesc, [options?.sortDesc])

  useEffect(() => {
    if (signing || !ndk) return
    if (!filter) {
      setNewItems([])
      setItems([])
      return setSub((prev) => {
        prev?.removeAllListeners()
        prev?.stop()
        return undefined
      })
    }
    setNewItems([])
    setItems([])
    eos.current = false
    setSub((prev) => {
      const subscribe = ndk.subscribe(
        filter,
        subOptions || {
          subId: nanoid(8),
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        },
        relaySet,
        false,
      )
      prev?.removeAllListeners()
      prev?.stop()
      return subscribe
    })
  }, [signing, ndk, relaySet, filter, subOptions])

  useEffect(() => {
    if (signing || !ndk || !sub) return
    eos.current = false
    let evetns = new Map<string, NDKEvent>()

    const collectEvent = (item: NDKEvent) => {
      const dedupKey = item.deduplicationKey()
      const existingEvent = evetns.get(dedupKey)
      if (existingEvent) {
        item = dedupEvent(existingEvent, item)
      }
      item.ndk = ndk
      return { existingEvent, dedupKey, event: item }
    }

    const onEventDup = (item: NDKEvent) => {
      const { existingEvent, dedupKey, event } = collectEvent(item)
      // console.log('onEventDup:event', { event, existingEvent })
      evetns.set(dedupKey, event)
      if (eos.current) {
        if (!existingEvent) {
          setNewItems((prev) => sortItems([event, ...prev], sortDesc))
        } else {
          setItems(sortItems(evetns.values(), sortDesc))
        }
      } else {
        // setItems(sortItems(evetns.values(), sortDesc))
      }
    }
    const onEvent = (item: NDKEvent) => {
      const { existingEvent, dedupKey, event } = collectEvent(item)
      // console.log('onEvent:event', {
      //   eos: eos.current,
      //   event,
      //   existingEvent,
      //   dedupKey,
      // })
      evetns.set(dedupKey, event)
      if (eos.current) {
        if (!existingEvent || !sub.eventFirstSeen.has(existingEvent.tagId())) {
          setNewItems((prev) => sortItems([event, ...prev], sortDesc))
        } else {
          setItems(sortItems(evetns.values(), sortDesc))
        }
      } else {
        // setItems(sortItems(evetns.values(), sortDesc))
      }
    }
    sub.on('show-new-items', (newItems: NDKEvent[]) => {
      newItems.forEach((ev) => {
        evetns.set(ev.deduplicationKey(), ev)
      })
      setItems(sortItems(evetns.values(), sortDesc))
      setNewItems([])
    })
    sub.on('event', onEvent)
    // sub.on('event:dup', onEventDup)
    sub.once('eose', () => {
      eos.current = true
      setItems(sortItems(evetns.values(), sortDesc))
    })
    sub.start()
    return () => {
      sub.removeAllListeners()
      sub.stop()
    }
  }, [signing, sub, ndk, sortDesc])

  const oldestEvent = useMemo(() => items[items.length - 1], [items])
  const fetchMore = useCallback(async () => {
    if (!filter || !oldestEvent) return
    const { since, ...original } = filter
    const events = await ndk.fetchEvents(
      { ...original, until: oldestEvent.created_at, limit: 30 },
      {
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        subId: nanoid(8),
      },
      relaySet,
    )
    const items = sortItems(events, sortDesc)
    let nonDupItems: NDKEvent[] = []
    setItems((prev) => {
      nonDupItems = items.filter(
        (item) =>
          !prev.find((d) => d.deduplicationKey() === item.deduplicationKey()),
      )
      return [...prev, ...nonDupItems]
    })
    return nonDupItems
  }, [filter, oldestEvent, ndk, relaySet, sortDesc])

  const showNewItems = useCallback(() => {
    if (!newItems.length) return
    sub?.emit('show-new-items', newItems)
    // setItems((prev) => sortItems([...newItems, ...prev], sortDesc))
    // setNewItems([])
  }, [newItems, sub])

  useEffect(() => {
    if (!alwaysShowNewItems) return
    showNewItems()
  }, [alwaysShowNewItems, showNewItems])

  return useMemo<SubscribeResult>(() => {
    return [items, fetchMore, newItems, showNewItems]
  }, [items, fetchMore, newItems, showNewItems])
}

export function dedupEvent(event1: NDKEvent, event2: NDKEvent) {
  // return the newest of the two
  if (event1.created_at! > event2.created_at!) {
    return event1
  }

  return event2
}
