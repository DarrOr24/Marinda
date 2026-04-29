// app/settings/family.tsx
import { useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useTranslation } from 'react-i18next'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { MemberAvatar } from '@/components/avatar/member-avatar'
import { ChipSelector } from '@/components/chip-selector'
import { ShareButton } from '@/components/share-button'
import { Button, Screen, ScreenState } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useRtlStyles } from '@/hooks/use-rtl-styles'
import {
  useCancelFamilyInvite,
  useFamily,
  useRemoveMember,
  useRotateFamilyCode,
  useUpdateMemberRole,
} from '@/lib/families/families.hooks'
import type { FamilyInvite } from '@/lib/families/families.types'
import { ROLE_OPTIONS, type FamilyMember, type Role } from '@/lib/members/members.types'
import { memberDisplayName } from '@/utils/format.utils'


export default function FamilySettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const r = useRtlStyles()
  const { effectiveMember, activeFamilyId, hasParentPermissions } = useAuthContext() as any
  const familyId = activeFamilyId ?? effectiveMember?.family_id
  const mutationFamilyId = familyId ?? ''
  const myProfileId = effectiveMember?.profile_id as string | undefined

  const { family, familyMembers, familyInvites } = useFamily(familyId)

  const updateMemberRole = useUpdateMemberRole(mutationFamilyId)
  const rotateCode = useRotateFamilyCode(mutationFamilyId)
  const removeMember = useRemoveMember(mutationFamilyId)
  const cancelInvite = useCancelFamilyInvite(mutationFamilyId)

  const familyData = family.data
  const isLoadingMembers = familyMembers.isLoading
  const isLoadingFamily = family.isLoading
  const isLoadingInvites = familyInvites.isLoading
  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [t],
  )

  if (!hasParentPermissions) {
    return (
      <ScreenState
        title={t('settings.family.managementTitle')}
        description={
          familyData?.code
            ? t('settings.family.parentsOnlyWithCode')
            : t('settings.family.parentsOnly')
        }
      />
    )
  }

  if (!familyId) {
    return (
      <ScreenState
        title={t('settings.family.managementTitle')}
        description={t('settings.family.noFamily')}
      />
    )
  }

  if (isLoadingFamily && !familyData) {
    return (
      <ScreenState
        title={t('settings.family.managementTitle')}
        description={t('settings.family.loadingDetails')}
        showActivityIndicator
      />
    )
  }

  const handleChangeRole = (m: FamilyMember, newRole: Role) => {
    if (newRole === m.role) return
    updateMemberRole?.mutate({ memberId: m.id, role: newRole })
  }

  const handleRotateCode = () => {
    rotateCode?.mutate(undefined, {
      onError: (e: any) => {
        Alert.alert(t('settings.family.rotateFailedTitle'), e?.message ?? t('settings.common.pleaseTryAgain'))
      },
    })
  }

  const handleCancelInvite = (invite: FamilyInvite) => {
    Alert.alert(
      t('settings.family.cancelInviteTitle'),
      t('settings.family.cancelInviteMessage', { phone: invite.invited_phone }),
      [
        { text: t('settings.family.keep'), style: 'cancel' },
        {
          text: t('settings.family.cancelInvite'),
          style: 'destructive',
          onPress: () =>
            cancelInvite?.mutate(
              { inviteId: invite.id },
              {
                onError: (e: any) => {
                  Alert.alert(
                    t('settings.family.cancelFailedTitle'),
                    e?.message ?? t('settings.common.pleaseTryAgain'),
                  )
                },
              },
            ),
        },
      ],
    )
  }

  const handleRemoveMember = (m: FamilyMember) => {
    const displayName = m.profile?.first_name || m.nickname || t('settings.family.thisMember')
    Alert.alert(
      t('settings.family.removeMemberTitle'),
      t('settings.family.removeMemberMessage', { name: displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.common.remove'),
          style: 'destructive',
          onPress: () =>
            removeMember?.mutate(
              { memberId: m.id },
              {
                onError: (e: any) => {
                  Alert.alert(
                    t('settings.family.removeFailedTitle'),
                    e?.message ?? t('settings.common.pleaseTryAgain'),
                  )
                },
              },
            ),
        },
      ],
    )
  }


  return (
    <Screen>

      {/* Family avatar + name */}
      <View style={[styles.familyHeaderRow, r.row]}>
        <FamilyAvatar
          familyId={familyId}
          size="lg"
          isUpdatable={true}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, r.textAlignStart, r.writingDirection]}>
            {t('settings.family.familyName', { name: familyData?.name })}
          </Text>
          <Text style={[styles.sectionSubtitle, r.textAlignStart, r.writingDirection]}>
            {t('settings.family.changeAvatarHint')}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionSubtitle, r.textAlignStart, r.writingDirection]}>
        {t('settings.family.shareCodeIntro')}
      </Text>

      <View style={styles.codeBox}>
        <Text style={[styles.codeLabel, r.textAlignStart, r.writingDirection]}>{t('settings.family.familyCode')}</Text>
        <View style={[styles.codeRow, r.row]}>
          <Text style={styles.codeValue}>
            {familyData?.code ?? '— — — — — —'}
          </Text>

          <View style={[styles.codeActionsRow, r.row]}>
            {/* Share */}
            <ShareButton
              shareMessage={t('settings.family.shareMessage', { code: familyData?.code })}
              shareTitle={t('settings.family.shareTitle')}
              buttonTitle={t('settings.family.share')}
              disabled={!familyData?.code}
            />

            {/* Rotate */}
            <Button
              title={rotateCode?.isPending ? t('settings.family.rotating') : t('settings.family.rotate')}
              type="primary"
              size="sm"
              onPress={handleRotateCode}
              disabled={rotateCode?.isPending}
            />
          </View>
        </View>

        <Text style={[styles.codeHint, r.textAlignStart, r.writingDirection]}>
          {t('settings.family.codeHint')}
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Button
          title={t('settings.family.addMember')}
          type="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/settings/add-member')}
        />
      </View>

      {/* Members + invites list */}
      <View style={{ marginTop: 16, gap: 10 }}>
        {isLoadingMembers && (
          <View style={[styles.loadingRow, r.row]}>
            <ActivityIndicator />
            <Text style={[styles.loadingText, r.textAlignStart, r.writingDirection]}>
              {t('settings.family.loadingMembers')}
            </Text>
          </View>
        )}

        {/* Pending invites (shown as "members" with a Pending tag) */}
        {!isLoadingInvites && (familyInvites.data?.length ?? 0) > 0 && (
          <Text style={[styles.listTitle, r.textAlignStart, r.writingDirection]}>{t('settings.family.pendingInvites')}</Text>
        )}

        {!isLoadingInvites &&
          familyInvites.data?.map((invite: FamilyInvite) => {
            const roleLabel =
              roleOptions.find((opt) => opt.value === invite.role)?.label ??
              invite.role.toLowerCase()

            return (
              <View key={`invite-${invite.id}`} style={[styles.memberRow, r.row]}>
                <View style={styles.memberAvatarWrapper}>
                  <MemberAvatar size="md" />
                </View>

                {/* phone + role + pending tag */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[{ alignItems: 'center' }, r.row]}>
                    <Text style={[styles.memberName, r.textAlignStart, r.writingDirection]}>{invite.invited_phone}</Text>
                  </View>
                  <Text style={[styles.pendingBadge, r.textAlignStart, r.writingDirection]}>{t('settings.family.pendingInvite')}</Text>
                  <Text style={[styles.memberMeta, r.textAlignStart, r.writingDirection]}>
                    {t('settings.family.invitedAs', { role: roleLabel.toLowerCase() })}
                  </Text>
                </View>

                {/* cancel invite */}
                <Button
                  title={t('common.cancel')}
                  type="danger"
                  size="sm"
                  onPress={() => handleCancelInvite(invite)}
                />
              </View>
            )
          })}

        {!isLoadingMembers && (familyMembers.data?.length ?? 0) > 0 && (
          <Text style={[styles.listTitle, r.textAlignStart, r.writingDirection]}>{t('settings.family.familyMembers')}</Text>
        )}

        {!isLoadingMembers &&
          familyMembers.data?.map((m: FamilyMember) => {
            const name = memberDisplayName(m, { official: true })
            const isSelf = myProfileId && m.profile_id === myProfileId
            const roleLabel = roleOptions.find((option) => option.value === m.role)?.label ?? m.role

            return (
              <View key={m.id} style={[styles.memberRow, r.row]}>
                {/* avatar */}
                <View style={styles.memberAvatarWrapper}>
                  {m.profile_id && (
                    <MemberAvatar
                      memberId={m.id}
                      size="md"
                      isUpdatable={true}
                    />
                  )}
                </View>

                {/* name + role */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[{ alignItems: 'center' }, r.row]}>
                    <Text style={[styles.memberName, r.textAlignStart, r.writingDirection]}>{name}</Text>
                    {isSelf && (
                      <Text style={[styles.youBadge, r.textAlignStart, r.writingDirection]}>
                        &nbsp;•&nbsp;{t('settings.family.you')}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.memberMeta, r.textAlignStart, r.writingDirection]}>
                    {t('settings.family.roleLabel', { role: roleLabel })}
                  </Text>

                  <ChipSelector
                    options={roleOptions}
                    value={m.role}
                    onChange={(value: string | null) => handleChangeRole(m, value as Role)}
                    style={styles.roleChipsRow}
                  />
                </View>

                {/* remove (hidden for self) */}
                {!isSelf && (
                  <Button
                    title={t('settings.common.remove')}
                    type="danger"
                    size="sm"
                    onPress={() => handleRemoveMember(m)}
                  />
                )}
              </View>
            )
          })}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  familyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },

  codeBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    gap: 6,
  },
  codeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#111827',
  },
  codeHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#4b5563',
  },
  memberRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  memberAvatarWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  memberAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberMeta: {
    fontSize: 12,
    color: '#6b7280',
  },

  youBadge: {
    fontSize: 11,
    color: '#6b7280',
  },

  pendingBadge: {
    fontSize: 11,
    color: '#b45309',
  },

  listTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },

  roleChipsRow: {
    marginTop: 4,
  },
})
