// components/ui/phone-field.tsx
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import PhoneInput, { type ICountry } from 'react-native-international-phone-number'

type Props = {
  label: string
  value: string // full E.164, e.g. "+15551234567"
  onChange: (e164: string) => void
  defaultCountry?: string
}

export function PhoneField({
  label,
  value,
  onChange,
  defaultCountry = 'IL',
}: Props) {
  const [inputValue, setInputValue] = useState('') // national number without calling code
  const [selectedCountry, setSelectedCountry] = useState<ICountry | undefined>(
    undefined,
  )

  // When parent clears the value, also clear the input
  useEffect(() => {
    if (!value) {
      setInputValue('')
    }
  }, [value])

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <PhoneInput
        defaultCountry={defaultCountry as any}
        value={inputValue}
        selectedCountry={selectedCountry}
        onChangeSelectedCountry={setSelectedCountry}
        onChangePhoneNumber={(phoneNumber) => {
          setInputValue(phoneNumber)

          if (!selectedCountry) {
            onChange('')
            return
          }

          try {
            const full = `${selectedCountry.idd?.root ?? ''}${phoneNumber}`
            const parsed = parsePhoneNumberFromString(
              full,
              selectedCountry.cca2 as any,
            )
            if (parsed && parsed.isValid()) {
              onChange(parsed.format('E.164'))
            } else {
              onChange('')
            }
          } catch {
            onChange('')
          }
        }}
        phoneInputStyles={{
          container: styles.phoneContainer,
          flagContainer: styles.flagContainer,
          divider: styles.divider,
          callingCode: styles.callingCode,
          input: styles.phoneTextInput,
          caret: styles.caret,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  phoneContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  flagContainer: {
    paddingHorizontal: 8,
  },
  divider: {
    height: '60%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#CBD5E1',
  },
  callingCode: {
    fontSize: 16,
    color: '#111827',
  },
  caret: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  phoneTextInput: { fontSize: 16, color: '#111827' },
})

