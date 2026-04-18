import type { AiOperationEvent } from '@/types'

type Listener = (event: AiOperationEvent) => void

const listeners: Listener[] = []

export const aiChatEvents = {
  emit(event: AiOperationEvent) {
    listeners.forEach(l => l(event))
  },
  subscribe(listener: Listener) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }
  },
}
