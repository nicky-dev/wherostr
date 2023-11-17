import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { transformText, tryParseNostrLink } from '@snort/system'

export const isComment = (
  event: NDKEvent,
  targetEvent?: NDKEvent,
  isDirectOnly = false,
) => {
  const tagE = event.getMatchingTags('e')
  const tagA = event.getMatchingTags('a')
  let isReply = tagE.some(([_1, _2, _3, desc]) => desc !== 'mention')
  isReply = isReply || tagA.some(([_1, _2, _3, desc]) => desc !== 'mention')
  // if (tagA.length > 0) {
  //   console.log('isComment', { event, tagE, tagA, isReply })
  // }
  let isDirect = false
  if (isReply && isDirectOnly && targetEvent) {
    if (
      tagE.some(
        ([_1, id, _3, desc]) => id === targetEvent.id && desc === 'reply',
      ) ||
      tagE.at(-1)?.[1] === targetEvent.id
    ) {
      isDirect = true
    } else {
      const [_1, id, _3, desc] = tagE.at(-1) || []
      if (id === targetEvent.id && (!desc || desc === 'reply')) {
        isDirect = true
      }
    }
  }
  return event.kind === NDKKind.Text && isReply && (!isDirectOnly || isDirect)
}

export const isQuote = (event: NDKEvent, targetEvent: NDKEvent) => {
  return (
    event.kind === NDKKind.Text &&
    targetEvent &&
    transformText(event.content, event.tags).filter(
      ({ type, content }) =>
        type === 'link' &&
        (content.startsWith('nostr:nevent1') ||
          content.startsWith('nostr:note1')) &&
        tryParseNostrLink(content)?.id === targetEvent.id,
    ).length > 0
  )
}
