import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { ChipSelector, type ChipOption } from '@/components/chip-selector'
import { Button, ModalDialog, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import { useColorPalette, useMember, useUpdateMember } from '@/lib/members/members.hooks'
import { formatColorName, tint } from '@/utils/color.utils'

export default function MyFamilyMemberSettingsScreen() {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const { effectiveMember } = useAuthContext() as any
  const memberQuery = useMember(effectiveMember?.id ?? null)
  const colorPaletteQuery = useColorPalette()
  const updateMember = useUpdateMember()
  const member = memberQuery.data ?? effectiveMember

  const [nickname, setNickname] = useState('')
  const [themeColorName, setThemeColorName] = useState<string | null>(null)
  const [themeModalVisible, setThemeModalVisible] = useState(false)

  useEffect(() => {
    setNickname(member?.nickname ?? '')
    setThemeColorName(member?.color?.name ?? null)
  }, [member?.color?.name, member?.nickname])

  const paletteOptions = useMemo<ChipOption[]>(
    () =>
      (colorPaletteQuery.data ?? []).map((color) => ({
        label: formatColorName(color.name),
        value: color.name,
      })),
    [colorPaletteQuery.data],
  )

  const colorByName = useMemo(
    () =>
      new Map((colorPaletteQuery.data ?? []).map((color) => [color.name, color.hex])),
    [colorPaletteQuery.data],
  )

  const currentThemeHex = themeColorName
    ? colorByName.get(themeColorName) ?? '#94a3b8'
    : '#94a3b8'

  const hasChanges =
    nickname.trim() !== (member?.nickname ?? '') ||
    themeColorName !== (member?.color?.name ?? null)

  const onSave = async () => {
    if (!member?.id) {
      Alert.alert(t('settings.common.notReadyTitle'), t('settings.common.notReadyMessage'))
      return
    }

    try {
      const updates: Record<string, string | null> = {}

      if (nickname.trim() !== (member?.nickname ?? '')) {
        updates.nickname = nickname.trim() || null
      }

      if (themeColorName && themeColorName !== member?.color?.name) {
        updates.color_scheme = themeColorName
      }

      await updateMember.mutateAsync({
        memberId: member.id,
        updates,
      })
      Alert.alert(t('settings.common.savedTitle'), t('settings.member.updatedMessage'))
    } catch (e: any) {
      Alert.alert(t('settings.common.saveFailedTitle'), e?.message ?? t('settings.common.pleaseTryAgain'))
    }
  }

  if (!member && memberQuery.isLoading) {
    return (
      <ScreenState
        title={t('settings.member.loadingTitle')}
        description={t('settings.member.loadingDescription')}
        showActivityIndicator
      />
    )
  }

  return (
    <Screen>
      <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>{t('settings.member.title')}</Text>
      <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
        {t('settings.member.subtitle')}
      </Text>

      <View style={styles.card}>
        <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.common.nicknameOptional')}</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          style={[styles.input, r.textAlignStart, r.writingDirection]}
          placeholder={t('settings.member.nicknamePlaceholder')}
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, r.textAlignStart, r.writingDirection]}>{t('settings.member.themeColor')}</Text>

        {colorPaletteQuery.isLoading && !(colorPaletteQuery.data ?? []).length ? (
          <View style={[styles.loadingRow, r.row]}>
            <ActivityIndicator />
            <Text style={[styles.helperText, r.textAlignStart, r.writingDirection]}>
              {t('settings.member.loadingColors')}
            </Text>
          </View>
        ) : colorPaletteQuery.isError ? (
          <Text style={[styles.errorText, r.textAlignStart, r.writingDirection]}>
            {t('settings.member.colorsError')}
          </Text>
        ) : (
          <View style={[styles.themeRow, r.row]}>
            <View style={[styles.themeSummary, r.row]}>
              <View
                style={[
                  styles.themePreview,
                  { backgroundColor: tint(currentThemeHex, 0.12), borderColor: currentThemeHex },
                ]}
              >
                <View style={[styles.themePreviewDot, { backgroundColor: currentThemeHex }]} />
              </View>
              <Text style={[styles.themeName, r.textAlignStart, r.writingDirection]}>
                {themeColorName ? formatColorName(themeColorName) : t('settings.member.noThemeSelected')}
              </Text>
            </View>

            <Button
              title={t('settings.member.changeTheme')}
              type="outline"
              size="md"
              onPress={() => setThemeModalVisible(true)}
            />
          </View>
        )}

        <Button
          title={updateMember.isPending ? t('settings.common.saving') : t('settings.common.saveChanges')}
          type="primary"
          size="lg"
          onPress={onSave}
          disabled={
            !hasChanges ||
            updateMember.isPending ||
            colorPaletteQuery.isLoading ||
            !themeColorName
          }
          fullWidth
          style={{ marginTop: 12 }}
        />
      </View>

      <ModalDialog
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
        size="md"
      >
          <View>
            <Text style={[styles.modalTitle, r.textAlignStart, r.writingDirection]}>{t('settings.member.chooseThemeTitle')}</Text>
            <Text style={[styles.modalSubtitle, r.textAlignStart, r.writingDirection]}>
              {t('settings.member.chooseThemeDescription')}
            </Text>

            <ChipSelector
              options={paletteOptions}
              value={themeColorName}
              onChange={(value) => {
                setThemeColorName(value)
                setThemeModalVisible(false)
              }}
              chipStyle={(active, opt) => {
                const color = colorByName.get(opt.value) ?? '#94a3b8'

                return active
                  ? {
                    borderColor: color,
                    backgroundColor: color,
                  }
                  : {
                    borderColor: color,
                    backgroundColor: tint(color, 0.1),
                  }
              }}
              chipTextStyle={(active) => ({
                color: active ? '#ffffff' : '#0f172a',
                fontWeight: active ? '700' : '600',
              })}
              renderOption={(opt, active) => {
                const color = colorByName.get(opt.value) ?? '#94a3b8'

                return (
                  <View style={[styles.colorOption, r.row]}>
                    <View
                      style={[
                        styles.colorSwatch,
                        {
                          backgroundColor: color,
                          borderColor: active ? '#ffffff' : color,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.colorLabel,
                        r.textAlignStart,
                        r.writingDirection,
                        active && styles.colorLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                )
              }}
            />

            <Button
              title={t('settings.common.done')}
              type="ghost"
              size="lg"
              onPress={() => setThemeModalVisible(false)}
              style={[{ marginTop: 16 }, r.alignSelfEnd]}
            />
          </View>
      </ModalDialog>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155' },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  helperText: { fontSize: 13, color: '#64748b' },
  errorText: { fontSize: 13, color: '#b91c1c' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
  loadingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  themePreview: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePreviewDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  colorLabel: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  colorLabelActive: {
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
})
