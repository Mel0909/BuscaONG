import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
 import { resolve } from 'path'

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
        replacement: resolve(__dirname, './src/app/(backend)') 
      },
      {
        find: '@/frontend',
        replacement: resolve(__dirname, './src/app/(frontend)')
      },
      {
        find: '@',
        replacement: resolve(__dirname, './src')
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