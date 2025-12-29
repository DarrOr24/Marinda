// lib/auth/phone.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function toE164(raw: string, defaultCountry: 'IL' | string = 'IL'): string {
  const input = raw.trim()
  if (!input) throw new Error('Phone is required')

  const phone = parsePhoneNumberFromString(input, defaultCountry as any)
  if (!phone || !phone.isValid()) {
    throw new Error('Invalid phone number')
  }

  return phone.format('E.164')
}
