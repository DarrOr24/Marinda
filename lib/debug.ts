// lib/debug.ts
import { debugConfig } from '@/config/debug.config'

/**
 * Check if a debug module is enabled.
 * Toggle modules in config/debug.config.ts.
 */
export function isDebugEnabled(module: string): boolean {
  return Boolean(debugConfig[module as keyof typeof debugConfig])
}

/**
 * Log only when the given module is enabled.
 * Use for module-specific debug output.
 */
export function debugLog(module: string, ...args: unknown[]): void {
  if (isDebugEnabled(module)) {
    console.log(`[DEBUG]:[${module}] ->`, ...args)
  }
}
