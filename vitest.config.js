import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    include: ['src/deskhub.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/modules/ui.js', 'src/utils/keyboardContext.js', 'src/modules/keyboardShortcuts.js']
    }
  }
})
