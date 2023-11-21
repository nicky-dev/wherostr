export const hasNip7Extension = () => {
  return typeof window !== 'undefined' && !!window.nostr
}
