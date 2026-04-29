// components/settings/edit-email-modal.tsx
import { useMemo, useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'

import { Button, ModalDialog } from '@/components/ui'
import { Colors } from '@/config/colors'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import { isValidEmail } from '@/utils/validation.utils'


type Props = {
  visible: boolean
  initialEmail: string
  loading?: boolean

  onClose: () => void
  onSave: (nextEmail: string) => Promise<void> | void
}

export function EditEmailModal({
  visible,
  initialEmail,
  loading = false,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const r = useRtlStyles()
  const [draft, setDraft] = useState(initialEmail)

  const normalizedInitial = useMemo(() => initialEmail.trim().toLowerCase(), [initialEmail])
  const normalizedDraft = useMemo(() => draft.trim().toLowerCase(), [draft])

  const hasChange = normalizedDraft !== normalizedInitial
  const canSave = isValidEmail(normalizedDraft) && hasChange && !loading

  const showInvalid = draft.trim().length > 0 && !isValidEmail(draft)

  return (
    <ModalDialog visible={visible} onClose={onClose} onShow={() => setDraft(initialEmail)} size="md">
        <Text style={[styles.title, r.textAlignStart, r.writingDirection]}>
          {t('settings.email.modalTitle')}
        </Text>
        <Text style={[styles.subtitle, r.textAlignStart, r.writingDirection]}>
          {t('settings.email.modalSubtitle')}
        </Text>

        <Text style={[styles.label, { marginTop: 14 }, r.textAlignStart, r.writingDirection]}>
          {t('settings.email.label')}
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={draft}
          onChangeText={setDraft}
          placeholder={t('settings.email.placeholder')}
          style={[styles.input, r.textAlignStart, r.writingDirection]}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!canSave) return
            void onSave(normalizedDraft)
          }}
        />

        {showInvalid && (
          <Text style={[styles.errorText, r.textAlignStart, r.writingDirection]}>
            {t('settings.email.invalidEmail')}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            title={loading ? t('settings.common.saving') : t('settings.common.save')}
            type="primary"
            size="lg"
            onPress={() => void onSave(normalizedDraft)}
            disabled={!canSave}
            fullWidth
          />

          <Button
            title={t('common.cancel')}
            type="ghost"
            size="lg"
            titleColor={Colors.common.gray600}
            onPress={() => {
              setDraft(initialEmail)
              onClose()
            }}
            disabled={loading}
            fullWidth
          />
        </View>
    </ModalDialog>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    color: '#0f172a',
  },

  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b91c1c',
  },

  actions: {
    marginTop: 14,
    gap: 10,
  },
})
