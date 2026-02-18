// app/settings/family.tsx
import { useRouter } from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { MemberAvatar } from '@/components/avatar/member-avatar'
import { ChipSelector } from '@/components/chip-selector'
import { ShareButton } from '@/components/share-button'
import { Button, Screen } from '@/components/ui'
import { useAuthContext } from '@/hooks/use-auth-context'
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
import { isParentRole } from '@/utils/validation.utils'


export default function FamilySettingsScreen() {
  const router = useRouter()
  const { member, activeFamilyId } = useAuthContext() as any
  const familyId = activeFamilyId ?? member?.family_id
  const myRole = member?.role as Role | undefined
  const myProfileId = member?.profile_id as string | undefined
  const isParent = isParentRole(myRole)

  const { family, familyMembers, familyInvites } = useFamily(familyId)

  const updateMemberRole = familyId ? useUpdateMemberRole(familyId) : null
  const rotateCode = familyId ? useRotateFamilyCode(familyId) : null
  const removeMember = familyId ? useRemoveMember(familyId) : null
  const cancelInvite = familyId ? useCancelFamilyInvite(familyId) : null

  const familyData = family.data
  const isLoadingMembers = familyMembers.isLoading
  const isLoadingFamily = family.isLoading
  const isLoadingInvites = familyInvites.isLoading

  if (!isParent) {
    return (
      <Screen>
        <Text style={styles.sectionTitle}>Family management</Text>
        <Text style={styles.sectionSubtitle}>
          Only parents (Mom or Dad) can manage family settings.
        </Text>
        {familyData?.code && (
          <Text style={[styles.sectionSubtitle, { marginTop: 8 }]}>
            Ask your parent to share the family code with you to join.
          </Text>
        )}
      </Screen>
    )
  }

  if (!familyId) {
    return (
      <Screen>
        <Text style={styles.sectionTitle}>Family management</Text>
        <Text style={styles.sectionSubtitle}>
          You are not attached to a family yet.
        </Text>
      </Screen>
    )
  }

  if (isLoadingFamily && !familyData) {
    return (
      <Screen>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading family…</Text>
        </View>
      </Screen>
    )
  }

  const handleChangeRole = (m: FamilyMember, newRole: Role) => {
    if (newRole === m.role) return
    updateMemberRole?.mutate({ memberId: m.id, role: newRole })
  }

  const handleRotateCode = () => {
    rotateCode?.mutate(undefined, {
      onError: (e: any) => {
        Alert.alert('Could not rotate code', e?.message ?? 'Please try again.')
      },
    })
  }

  const handleCancelInvite = (invite: FamilyInvite) => {
    Alert.alert(
      'Cancel invite',
      `Cancel invite to ${invite.invited_phone}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel invite',
          style: 'destructive',
          onPress: () =>
            cancelInvite?.mutate(
              { inviteId: invite.id },
              {
                onError: (e: any) => {
                  Alert.alert(
                    'Cancel failed',
                    e?.message ?? 'Please try again.',
                  )
                },
              },
            ),
        },
      ],
    )
  }

  const handleRemoveMember = (m: FamilyMember) => {
    const displayName = m.profile?.first_name || m.nickname || 'this member'
    Alert.alert(
      'Remove member',
      `Remove ${displayName} from your family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            removeMember?.mutate(
              { memberId: m.id },
              {
                onError: (e: any) => {
                  Alert.alert(
                    'Remove failed',
                    e?.message ?? 'Please try again.',
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
      <View style={styles.familyHeaderRow}>
        <FamilyAvatar
          familyId={familyId}
          size="lg"
          isUpdatable={true}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.sectionTitle}>
            {`${familyData?.name} Family`}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Tap the photo to change your family avatar.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Share the family code with your kids so they can join during signup.
      </Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Family code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeValue}>
            {familyData?.code ?? '— — — — — —'}
          </Text>

          <View style={styles.codeActionsRow}>
            {/* Share */}
            <ShareButton
              shareMessage={`Join our family on Marinda! Use this family code: ${familyData?.code}`}
              shareTitle="Share family code"
              buttonTitle="Share"
              disabled={!familyData?.code}
            />

            {/* Rotate */}
            <Button
              title={rotateCode?.isPending ? 'Rotating…' : 'Rotate'}
              type="primary"
              size="sm"
              onPress={handleRotateCode}
              disabled={rotateCode?.isPending}
            />
          </View>
        </View>

        <Text style={styles.codeHint}>
          Kids can go to “Join with Code” and enter this code. You can rotate it
          anytime.
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Button
          title="Add a new family member"
          type="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/settings/add-member')}
        />
      </View>

      {/* Members + invites list */}
      <View style={{ marginTop: 16, gap: 10 }}>
        {isLoadingMembers && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading family members…</Text>
          </View>
        )}

        {/* Pending invites (shown as "members" with a Pending tag) */}
        {!isLoadingInvites && (familyInvites.data?.length ?? 0) > 0 && (
          <Text style={styles.listTitle}>Pending invites</Text>
        )}

        {!isLoadingInvites &&
          familyInvites.data?.map((invite: FamilyInvite) => {
            const roleLabel =
              ROLE_OPTIONS.find((opt) => opt.value === invite.role)?.label ??
              invite.role.toLowerCase()

            return (
              <View key={`invite-${invite.id}`} style={styles.memberRow}>
                <View style={styles.memberAvatarWrapper}>
                  <MemberAvatar size="md" />
                </View>

                {/* phone + role + pending tag */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.memberName}>{invite.invited_phone}</Text>
                  </View>
                  <Text style={styles.pendingBadge}>Pending invite</Text>
                  <Text style={styles.memberMeta}>
                    Invited as: {roleLabel.toLowerCase()}
                  </Text>
                </View>

                {/* cancel invite */}
                <Button
                  title="Cancel"
                  type="danger"
                  size="sm"
                  onPress={() => handleCancelInvite(invite)}
                />
              </View>
            )
          })}

        {!isLoadingMembers && (familyMembers.data?.length ?? 0) > 0 && (
          <Text style={styles.listTitle}>Family members</Text>
        )}

        {!isLoadingMembers &&
          familyMembers.data?.map((m: FamilyMember) => {
            const name = memberDisplayName(m, { official: true })
            const isSelf = myProfileId && m.profile_id === myProfileId

            return (
              <View key={m.id} style={styles.memberRow}>
                {/* avatar */}
                <View style={styles.memberAvatarWrapper}>
                  {m.profile_id ? (
                    <MemberAvatar
                      memberId={m.id}
                      size="md"
                      isUpdatable={true}
                    />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarPlaceholderText}>
                        {name.charAt(0)?.toUpperCase() ?? '👤'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* name + role */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.memberName}>{name}</Text>
                    {isSelf && (
                      <Text style={styles.youBadge}>
                        &nbsp;•&nbsp;You
                      </Text>
                    )}
                  </View>
                  <Text style={styles.memberMeta}>
                    Role: {m.role.toLowerCase()}
                  </Text>

                  <ChipSelector
                    options={ROLE_OPTIONS}
                    value={m.role}
                    onChange={(value: string | null) => handleChangeRole(m, value as Role)}
                    style={styles.roleChipsRow}
                  />
                </View>

                {/* remove (hidden for self) */}
                {!isSelf && (
                  <Button
                    title="Remove"
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
