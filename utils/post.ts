import { tryParseNostrLink } from '@snort/system'
import { nip19 } from 'nostr-tools'

export function correctContentMentions(content: string) {
  return content.replace(
    /(\s|^)(?:@)?(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})/gi,
    '$1nostr:$2',
  )
}

export function getContentMentions(content: string) {
  const matched = content.matchAll(
    /nostr:(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})/gi,
  )
  return Array.from(matched)
    .map((m) => {
      const parsed = nip19.decode(m[1])
      if (parsed?.type !== 'npub') return
      return parsed.data
    })
    .filter(Boolean) as string[]
}

export function getMentionTags(content = '') {
  const tags: string[][] = []
  Array.from(
    new Set(
      content.match(
        /nostr:n(pub|profile|event|ote|addr|)1[acdefghjklmnpqrstuvwxyz023456789]+/g,
      ) || [],
    ),
  ).forEach((item) => {
    const link = tryParseNostrLink(item)
    if (link) {
      tags.push(['p', link.id])
    }
  })
  return tags
}
