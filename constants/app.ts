export enum ErrorCode {
  ProfileNotFound = 'ERROR_PROFILE_NOT_FOUND',
  EventNotFound = 'ERROR_EVENT_NOT_FOUND',
}

// debug from zap.stream
export const streamRelayUrls = [
  'wss://nostr.wine',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
]

export const nip5Regexp =
  /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export const svgPin = `<svg xmlns="http://www.w3.org/2000/svg" height="128" viewBox="0 -960 960 960" width="128"><path fill="#fc6a03" d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Z"/></svg>`

export const amountFormat = '0,0.[0]a'