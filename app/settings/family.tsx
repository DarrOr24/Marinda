// app/settings/family.tsx
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { FamilyAvatar } from '@/components/avatar/family-avatar'
import { ProfileAvatar } from '@/components/avatar/profile-avatar'
import { useAuthContext } from '@/hooks/use-auth-context'
import {
  useFamily,
  useRemoveMember,
  useRotateFamilyCode,
  useUpdateFamilyAvatar,
  useUpdateMemberRole,
} from '@/lib/families/families.hooks'
import type { Member, Role } from '@/lib/families/families.types'
import { getSupabase } from '@/lib/supabase'


const ROLE_OPTIONS: Role[] = ['MOM', 'DAD', 'ADULT', 'TEEN', 'CHILD']

export default function FamilySettingsScreen() {
  const { member } = useAuthContext() as any
  const familyId = member?.family_id
  const myRole = member?.role as Role | undefined
  const myProfileId = member?.profile_id as string | undefined
  const isParent = myRole === 'MOM' || myRole === 'DAD'

  const { family, members } = useFamily(familyId)
  const supabase = getSupabase()

  const updateMemberRole = useUpdateMemberRole(familyId)
  const rotateCode = useRotateFamilyCode(familyId)
  const removeMember = useRemoveMember(familyId)
  const updateFamilyAvatar = useUpdateFamilyAvatar(familyId)

  const familyData = family.data
  const familyMembers: Member[] = members.data ?? []
  const isLoadingMembers = members.isLoading
  const isLoadingFamily = family.isLoading

  const [familyAvatarUri, setFamilyAvatarUri] = useState<string | null>(null)

  if (!isParent) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family management</Text>
        <Text style={styles.sectionSubtitle}>
          Only parents (Mom or Dad) can manage family settings.
        </Text>
        {familyData?.code && (
          <Text style={[styles.sectionSubtitle, { marginTop: 8 }]}>
            Ask your parent to share the family code with you to join.
          </Text>
        )}
      </View>
    )
  }

  if (!familyId) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family management</Text>
        <Text style={styles.sectionSubtitle}>
          You are not attached to a family yet.
        </Text>
      </View>
    )
  }

  if (isLoadingFamily && !familyData) {
    return (
      <View style={styles.section}>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading family…</Text>
        </View>
      </View>
    )
  }

  const handleChangeRole = (m: Member, newRole: Role) => {
    if (newRole === m.role) return
    updateMemberRole.mutate({ memberId: m.id, role: newRole })
  }

  const handleRotateCode = () => {
    rotateCode.mutate(undefined, {
      onError: (e: any) => {
        Alert.alert('Could not rotate code', e?.message ?? 'Please try again.')
      },
    })
  }

  const handleRemoveMember = (m: Member) => {
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
            removeMember.mutate(
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

  useEffect(() => {
    if (!familyData?.avatar_url) {
      setFamilyAvatarUri(null)
      return
    }

    const { data: pub } = supabase.storage
      .from('family-photos')
      .getPublicUrl(familyData.avatar_url)

    setFamilyAvatarUri(pub.publicUrl ?? null)
  }, [familyData?.avatar_url, supabase])

  const handleChangeFamilyAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    })

    if (result.canceled) return
    const uri = result.assets[0].uri

    // Optimistic local update for snappier UI
    setFamilyAvatarUri(uri)

    updateFamilyAvatar.mutate(uri, {
      onError: () => {
        // revert to previous avatar if upload fails
        if (familyData?.avatar_url) {
          const { data: pub } = supabase.storage
            .from('family-photos')
            .getPublicUrl(familyData.avatar_url)
          setFamilyAvatarUri(pub.publicUrl ?? null)
        } else {
          setFamilyAvatarUri(null)
        }
      },
    })
  }

  return (
    <View style={styles.section}>

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
          <Pressable
            style={styles.rotateButton}
            onPress={handleRotateCode}
            disabled={rotateCode.isPending}
          >
            <Text style={styles.rotateButtonText}>
              {rotateCode.isPending ? 'Rotating…' : 'Rotate'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.codeHint}>
          Kids can go to “Join with Code” and enter this code. You can rotate it
          anytime.
        </Text>
      </View>

      {/* Members list */}
      <View style={{ marginTop: 16, gap: 10 }}>
        {isLoadingMembers && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading family members…</Text>
          </View>
        )}

        {!isLoadingMembers &&
          familyMembers.map(m => {
            const name =
              m.profile?.first_name ||
              m.nickname ||
              m.profile?.last_name ||
              'No name yet'
            const isSelf = myProfileId && m.profile_id === myProfileId

            return (
              <View key={m.id} style={styles.memberRow}>
                {/* avatar */}
                <View style={styles.memberAvatarWrapper}>
                  {m.profile_id ? (
                    <ProfileAvatar
                      profileId={m.profile_id}
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

                  <View style={styles.roleChipsRow}>
                    {ROLE_OPTIONS.map(r => (
                      <Pressable
                        key={r}
                        onPress={() => handleChangeRole(m, r)}
                        style={[
                          styles.roleChip,
                          m.role === r && styles.roleChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            m.role === r && styles.roleChipTextActive,
                          ]}
                        >
                          {r.toLowerCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* remove (hidden for self) */}
                {!isSelf && (
                  <Pressable
                    onPress={() => handleRemoveMember(m)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                )}
              </View>
            )
          })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
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
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#111827',
  },
  rotateButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  rotateButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
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

  roleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  roleChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleChipText: {
    fontSize: 11,
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  roleChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },

  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
  },
})
