import { PowWorker } from '@snort/system'

const powWorker =
  typeof window !== 'undefined' ? new PowWorker('/pow.js') : undefined
export default powWorker
