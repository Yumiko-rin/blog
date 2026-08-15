import { AnimatePresence, motion } from 'framer-motion'

/**
 * Toast - 固定在底部中央的提示气泡
 */
export function Toast({ message }: { message: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-2.5 text-sm text-white"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
