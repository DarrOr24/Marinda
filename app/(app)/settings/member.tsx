import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native'

import { ChipSelector, type ChipOption } from '@/components/chip-selector'
import { Button, ModalDialog, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useColorPalette, useMember, useUpdateMember } from '@/lib/members/members.hooks'
import { formatColorName, tint } from '@/utils/color.utils'

export default function MyFamilyMemberSettingsScreen() {
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
      Alert.alert('Not ready', 'Please try again in a moment.')
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
      Alert.alert('Saved', 'Member settings updated.')
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.')
    }
  }

  if (!member && memberQuery.isLoading) {
    return (
      <ScreenState
        title="Member settings"
        description="Loading your family member settings."
        showActivityIndicator
      />
    )
  }

  return (
    <Screen>
      <Text style={styles.title}>My family member</Text>
      <Text style={styles.subtitle}>
        Update your nickname and choose the color that represents you across the app.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nickname (optional)</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
          placeholder="Enter a nickname"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Theme color</Text>

        {colorPaletteQuery.isLoading && !(colorPaletteQuery.data ?? []).length ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.helperText}>Loading color palette…</Text>
          </View>
        ) : colorPaletteQuery.isError ? (
          <Text style={styles.errorText}>
            Could not load theme colors. Please try again.
          </Text>
        ) : (
          <View style={styles.themeRow}>
            <View style={styles.themeSummary}>
              <View
                style={[
                  styles.themePreview,
                  { backgroundColor: tint(currentThemeHex, 0.12), borderColor: currentThemeHex },
                ]}
              >
                <View style={[styles.themePreviewDot, { backgroundColor: currentThemeHex }]} />
              </View>
              <Text style={styles.themeName}>
                {themeColorName ? formatColorName(themeColorName) : 'No theme selected'}
              </Text>
            </View>

            <Button
              title="Change theme"
              type="outline"
              size="md"
              onPress={() => setThemeModalVisible(true)}
            />
          </View>
        )}

        <Button
          title={updateMember.isPending ? 'Saving…' : 'Save Changes'}
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
            <Text style={styles.modalTitle}>Choose a theme</Text>
            <Text style={styles.modalSubtitle}>
              Pick the color that you like!
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
                  <View style={styles.colorOption}>
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
              title="Done"
              type="ghost"
              size="lg"
              onPress={() => setThemeModalVisible(false)}
              style={{ marginTop: 16, alignSelf: 'flex-end' }}
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
