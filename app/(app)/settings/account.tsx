// app/settings/account.tsx
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { ChipSelector } from '@/components/chip-selector'
import { DatePicker } from '@/components/date-picker'
import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useHydratedEffect } from '@/hooks/use-hydrated-effect'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import { useMyFamilies } from '@/lib/families/families.hooks'
import { ROLE_OPTIONS } from '@/lib/members/members.types'
import { GENDER_OPTIONS } from '@/lib/profiles/profiles.types'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'


export default function AccountSettingsScreen() {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const { effectiveMember } = useAuthContext()
  const profileId = effectiveMember?.profile_id
  const activeFamilyId = effectiveMember?.family_id ?? null

  const { data, isLoading } = useProfile(profileId ?? null)
  const updateProfile = useUpdateProfile()
  const {
    data: myFamilies,
    isLoading: isLoadingFamilies,
  } = useMyFamilies(profileId)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState<string>('')
  const genderOptions = useMemo(
    () =>
      GENDER_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [t],
  )
  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [t],
  )

  useHydratedEffect(() => {
    if (!data) return

    setFirstName(data.first_name ?? '')
    setLastName(data.last_name ?? '')
    setGender((data.gender as string) ?? null)
    setBirthDate(data.birth_date ?? '')
  }, [data])

  const hasChanges =
    firstName !== (data?.first_name ?? '') ||
    lastName !== (data?.last_name ?? '') ||
    (gender ?? '') !== (data?.gender ?? '') ||
    birthDate !== (data?.birth_date ?? '')

  const handleSave = async () => {
    if (!profileId) return

    await updateProfile.mutateAsync({
      profileId,
      updates: {
        first_name: firstName,
        last_name: lastName,
        gender: gender ?? undefined,
        birth_date: birthDate,
      },
    })
  }

  const families = useMemo(
    () => myFamilies ?? [],
    [myFamilies],
  )

  if (isLoading || !data) {
    return (
      <View style={[styles.centerOnly, { marginTop: 32 }]}>
        <ActivityIndicator />
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.account.loadingProfile')}
        </Text>
      </View>
    )
  }

  return (
    <Screen>
      <Text style={[styles.sectionTitle, r.textAlignStart, r.writingDirection]}>
        {t('settings.account.title')}
      </Text>

      {/* My families */}
      <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.account.myFamilies')}</Text>
      {isLoadingFamilies ? (
        <View style={[styles.familiesLoadingRow, r.row]}>
          <ActivityIndicator size="small" />
          <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
            {t('settings.account.loadingFamilies')}
          </Text>
        </View>
      ) : families.length === 0 ? (
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.account.noFamilies')}
        </Text>
      ) : (
        <View style={[styles.familiesRow, r.row]}>
          {families.map((fam) => {
            const isSelected = families.length > 1 && fam.id === activeFamilyId
            return (
              <View key={fam.id} style={styles.familyItem}>
                <FamilyAvatar
                  familyId={fam.id}
                  size="md"
                  isSelected={isSelected}
                  // selection logic – can adjust later if needed
                  onSelect={() => {
                    // TODO: select family
                    console.log('TODO: select family', fam.id)
                  }}
                />
                <Text style={[styles.familyName, r.writingDirection]} numberOfLines={1}>
                  {fam.name}
                </Text>
                {fam.role && (
                  <Text style={[styles.familyRole, r.textAlignStart, r.writingDirection]}>
                    {roleOptions.find((option) => option.value === fam.role)?.label ?? fam.role}
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      )}

      {/* First name */}
      <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.account.firstName')}</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        style={[styles.input, r.textAlignStart, r.writingDirection]}
      />

      {/* Last name */}
      <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.account.lastName')}</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        style={[styles.input, r.textAlignStart, r.writingDirection]}
      />

      {/* Gender */}
      <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.common.gender')}</Text>
      <ChipSelector
        options={genderOptions}
        value={gender}
        onChange={setGender}
        style={{ marginTop: 4 }}
      />

      {/* Birth date */}
      <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.common.birthDate')}</Text>
      <DatePicker
        value={birthDate}
        onChange={setBirthDate}
        title={t('settings.account.pickBirthDate')}
        disabled={updateProfile.isPending}
        enableYearPicker
        yearPickerRange={{ past: 120, future: 0 }}
      />

      {/* Save */}
      <Button
        title={updateProfile.isPending ? t('settings.common.saving') : t('settings.common.saveChanges')}
        type="primary"
        size="lg"
        onPress={handleSave}
        disabled={updateProfile.isPending || !hasChanges}
        fullWidth
        style={{ marginTop: 12 }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
  },
  centerOnly: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  familiesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  familyItem: {
    width: 84,
    alignItems: 'center',
    gap: 4,
  },
  familyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  familyRole: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
})
