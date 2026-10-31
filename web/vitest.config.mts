import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// caminho absoluto a partir desta pasta (ESM não tem __dirname)
const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**'],

    setupFiles: ['./tests/integration/setup.ts'],

    alias: [
      { 
        find: '@/backend',
        replacement: dir('./src/app/(backend)') 
      },
      {
        find: '@/frontend',
        replacement: dir('./src/app/(frontend)')
      },
      {
        find: '@',
        replacement: dir('./src')
      },
    ],
  
  coverage: {
    reporter: ['text', 'json', 'html'],
    reportsDirectory: './tests/coverage',
    include: [
      'src/**/*.{ts,tsx}',      // só código; o Vitest 5 tenta parsear tudo que casar aqui
    ],
    exclude: [
      'src/generated/**',       // exclude prisma-generated files
      'src/components/ui/**',   // exclude shadcn components
      '**/*.d.ts',              // exclude type defs
    ],
  },

  server: {
    deps: {
      inline: ['next']
    }
  },
  }
})