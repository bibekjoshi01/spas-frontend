import { toast } from "sonner"

// The message doubles as the toast id, so the same notice raised twice in a
// row (a retried save, a burst of failing requests) refreshes one toast
// instead of stacking copies of it.
export const notifier = {
  success(message: string) {
    toast.success(message, { id: message })
  },

  error(message: string) {
    toast.error(message, { id: message, duration: 6000 })
  },

  warning(message: string) {
    toast.warning(message, { id: message, duration: 6000 })
  },

  info(message: string) {
    toast.info(message, { id: message })
  },
}
