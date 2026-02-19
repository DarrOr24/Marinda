/**
 * Debug module toggles. Edit this file to enable/disable logs per module.
 */
export const debugConfig = {
  realtime: false,
  auth: false,
  announcements: false,
} as const satisfies Record<string, boolean>
