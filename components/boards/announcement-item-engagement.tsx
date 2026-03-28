// components/boards/announcement-item-engagement.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useDeleteAnnouncementReaction,
  useDeleteAnnouncementReply,
  useUpdateAnnouncementReply,
} from '@/lib/announcements/announcements.hooks';
import type {
  AnnouncementReaction,
  AnnouncementReply,
} from '@/lib/announcements/announcements.types';
import { Button, ModalCard, ModalShell, TextInput } from '@/components/ui';
import { Colors } from '@/config/colors';

function normalizeReactionKey(emoji: string): string {
  try {
    // Merge common duplicate forms (e.g. with/without emoji VS15).
    return emoji.trim().normalize('NFC').replace(/\uFE0F/g, '');
  } catch {
    return emoji.trim().replace(/\uFE0F/g, '');
  }
}

type Props = {
  familyId: string;
  myFamilyMemberId?: string;
  hasParentPermissions: boolean;
  nameForId: (id?: string) => string;
  /** Profile photo URL per family member id (optional). */
  avatarUrlForMemberId?: (memberId: string) => string | null | undefined;
  replies: AnnouncementReply[];
  reactions: AnnouncementReaction[];
};

function rowInitial(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t[0]!.toUpperCase();
}

function formatReplyDetailTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const REPLY_MENU_WIDTH = 220;

export function AnnouncementItemEngagement({
  familyId,
  myFamilyMemberId,
  hasParentPermissions,
  nameForId,
  avatarUrlForMemberId,
  replies,
  reactions,
}: Props) {
  const deleteReply = useDeleteAnnouncementReply(familyId);
  const updateReply = useUpdateAnnouncementReply(familyId);
  const deleteReaction = useDeleteAnnouncementReaction(familyId);

  const [editingReply, setEditingReply] = useState<AnnouncementReply | null>(null);
  const [editReplyDraft, setEditReplyDraft] = useState('');
  const [reactionsSheetOpen, setReactionsSheetOpen] = useState(false);
  const [replyMenuReply, setReplyMenuReply] = useState<AnnouncementReply | null>(null);

  const byEmojiGrouped = useMemo(() => {
    const m = new Map<
      string,
      { displayEmoji: string; rows: AnnouncementReaction[] }
    >();
    for (const r of reactions) {
      const k = normalizeReactionKey(r.emoji);
      const cur = m.get(k);
      if (!cur) {
        m.set(k, { displayEmoji: r.emoji, rows: [r] });
      } else {
        cur.rows.push(r);
      }
    }
    return m;
  }, [reactions]);

  const reactionSummary = useMemo(() => {
    const out: {
      key: string;
      displayEmoji: string;
      count: number;
      mine: boolean;
      rows: AnnouncementReaction[];
    }[] = [];
    for (const [key, { displayEmoji, rows }] of byEmojiGrouped) {
      out.push({
        key,
        displayEmoji,
        count: rows.length,
        mine: rows.some(x => x.member_id === myFamilyMemberId),
        rows,
      });
    }
    out.sort((a, b) => a.key.localeCompare(b.key));
    return out;
  }, [byEmojiGrouped, myFamilyMemberId]);

  const sheetReactionRows = useMemo(() => {
    return reactions.slice().sort((a, b) => {
      const aMine = a.member_id === myFamilyMemberId;
      const bMine = b.member_id === myFamilyMemberId;
      if (aMine !== bMine) return aMine ? -1 : 1;
      return nameForId(a.member_id).localeCompare(nameForId(b.member_id));
    });
  }, [reactions, myFamilyMemberId, nameForId]);

  const hasAnyMyReaction = reactionSummary.some(s => s.mine);

  const openReactionsSheet = () => setReactionsSheetOpen(true);

  const closeReactionsSheet = () => setReactionsSheetOpen(false);

  useEffect(() => {
    if (!reactionsSheetOpen) return;
    if (reactionSummary.length === 0 || reactions.length === 0) {
      setReactionsSheetOpen(false);
    }
  }, [reactionsSheetOpen, reactionSummary.length, reactions.length]);

  useEffect(() => {
    if (!replyMenuReply) return;
    if (!replies.some(r => r.id === replyMenuReply.id)) {
      setReplyMenuReply(null);
    }
  }, [replies, replyMenuReply]);

  const confirmDeleteReply = (id: string) => {
    Alert.alert('Delete reply?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteReply.mutate(id, { onError: e => Alert.alert('Error', e.message) }),
      },
    ]);
  };

  const canModifyReply = (r: AnnouncementReply) =>
    (myFamilyMemberId && r.member_id === myFamilyMemberId) || hasParentPermissions;

  const canDeleteReactionRow = (r: AnnouncementReaction) =>
    (myFamilyMemberId && r.member_id === myFamilyMemberId) || hasParentPermissions;

  const hasThread = reactionSummary.length > 0 || replies.length > 0;
  if (!hasThread) return null;

  return (
    <View style={styles.wrap}>
      {reactionSummary.length > 0 && (
        <View style={styles.reactionsRow}>
          <View
            style={[
              styles.reactionPillOuter,
              hasAnyMyReaction && styles.reactionPillOuterMine,
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={openReactionsSheet}
              delayPressIn={0}
              accessibilityRole="button"
              accessibilityLabel={`${reactions.length} ${
                reactions.length === 1 ? 'reaction' : 'reactions'
              }. Open who reacted`}
              style={styles.reactionPillTouchable}
            >
              <Text
                style={styles.reactionPillText}
                selectable={false}
                {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
              >
                {reactionSummary.map(s => s.displayEmoji).join(' ')}
                <Text style={styles.reactionPillTotal}> {reactions.length}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {replies.length > 0 && (
        <View style={styles.repliesBlock}>
          {replies.map(r => {
            const replyAuthor = nameForId(r.member_id);
            const replyAvatarUrl = avatarUrlForMemberId?.(r.member_id) ?? null;
            const replyWasEdited = r.created_at !== r.updated_at;
            return (
            <View key={r.id} style={styles.replyRow}>
              <View style={styles.replyAvatarWrap}>
                {replyAvatarUrl ? (
                  <Image
                    source={{ uri: replyAvatarUrl }}
                    style={styles.replyAvatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.replyAvatarPlaceholder}>
                    <Text
                      style={styles.replyAvatarInitial}
                      selectable={false}
                      {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                    >
                      {rowInitial(replyAuthor)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.replyBody}>
                <Text
                  style={[styles.replyMeta, styles.replyMetaByline]}
                  selectable={false}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {replyAuthor} ·{' '}
                  {new Date(r.created_at).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                  {replyWasEdited ? ' · edited' : ''}
                </Text>
                <Text
                  style={styles.replyText}
                  selectable={false}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {r.text}
                </Text>
              </View>
              {canModifyReply(r) && (
                <Pressable
                  hitSlop={10}
                  onPress={() => setReplyMenuReply(r)}
                  style={({ pressed }) => [
                    styles.replyMenuIconBtn,
                    pressed && { opacity: 0.72 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Reply actions"
                >
                  <MaterialCommunityIcons name="dots-vertical" size={20} color="#475569" />
                </Pressable>
              )}
            </View>
            );
          })}
        </View>
      )}

      <ModalShell visible={reactionsSheetOpen} onClose={closeReactionsSheet} keyboardOffset={0}>
        <ModalCard>
          {reactionsSheetOpen ? (
            <>
              <Text style={styles.reactionsSheetTitle}>
                {reactions.length}{' '}
                {reactions.length === 1 ? 'reaction' : 'reactions'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.reactionsSummaryRow}
              >
                {reactionSummary.map(({ key, displayEmoji, count }) => (
                  <View
                    key={key}
                    style={styles.reactionSummaryChip}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Text
                      style={styles.reactionSummaryChipText}
                      selectable={false}
                      {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                    >
                      {displayEmoji} {count}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <ScrollView
                style={styles.detailList}
                keyboardShouldPersistTaps="handled"
              >
                {sheetReactionRows.map(r => {
                  const isOwn = myFamilyMemberId != null && r.member_id === myFamilyMemberId;
                  const displayName = isOwn ? 'You' : nameForId(r.member_id);
                  const initialName =
                    isOwn && myFamilyMemberId
                      ? nameForId(myFamilyMemberId)
                      : nameForId(r.member_id);
                  const avatarUrl = avatarUrlForMemberId?.(r.member_id) ?? null;
                  const canParentRemoveOther =
                    hasParentPermissions && !isOwn && canDeleteReactionRow(r);

                  const rowContent = (
                    <View style={styles.sheetRowMain}>
                      <View style={styles.sheetAvatarWrap}>
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            style={styles.sheetAvatarImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.sheetAvatarPlaceholder}>
                            <Text
                              style={styles.sheetAvatarInitial}
                              selectable={false}
                              {...(Platform.OS === 'android'
                                ? { includeFontPadding: false }
                                : {})}
                            >
                              {rowInitial(initialName)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.sheetNameBlock}>
                        <Text
                          style={styles.sheetName}
                          selectable={false}
                          {...(Platform.OS === 'android'
                            ? { includeFontPadding: false }
                            : {})}
                        >
                          {displayName}
                        </Text>
                        {isOwn ? (
                          <Text
                            style={styles.sheetTapHint}
                            selectable={false}
                            {...(Platform.OS === 'android'
                              ? { includeFontPadding: false }
                              : {})}
                          >
                            Tap to remove
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.sheetRowRight}>
                        {canParentRemoveOther ? (
                          <Pressable
                            hitSlop={8}
                            onPress={() => {
                              Alert.alert('Remove this reaction?', undefined, [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () =>
                                    deleteReaction.mutate(r.id, {
                                      onError: e => Alert.alert('Error', e.message),
                                    }),
                                },
                              ]);
                            }}
                            style={({ pressed }) => [pressed && { opacity: 0.65 }]}
                            accessibilityLabel="Remove reaction"
                          >
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={20}
                              color="#94a3b8"
                            />
                          </Pressable>
                        ) : null}
                        <Text
                          style={styles.sheetRowEmoji}
                          selectable={false}
                          {...(Platform.OS === 'android'
                            ? { includeFontPadding: false }
                            : {})}
                        >
                          {r.emoji}
                        </Text>
                      </View>
                    </View>
                  );

                  if (isOwn) {
                    return (
                      <Pressable
                        key={r.id}
                        disabled={deleteReaction.isPending}
                        onPress={() =>
                          deleteReaction.mutate(r.id, {
                            onError: e => Alert.alert('Error', e.message),
                          })
                        }
                        style={({ pressed }) => [
                          styles.sheetRow,
                          pressed &&
                            !deleteReaction.isPending &&
                            styles.sheetRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Remove my reaction"
                      >
                        {rowContent}
                      </Pressable>
                    );
                  }

                  return (
                    <View key={r.id} style={styles.sheetRow}>
                      {rowContent}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          ) : null}
        </ModalCard>
      </ModalShell>

      <Modal
        visible={!!replyMenuReply}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyMenuReply(null)}
      >
        <View style={styles.replyMenuModalRoot}>
          <Pressable
            style={styles.replyMenuModalDismiss}
            onPress={() => setReplyMenuReply(null)}
          />
          <View style={styles.replyMenuModalSheet} pointerEvents="box-none">
            <View style={styles.replyMenuCard}>
              {replyMenuReply ? (
                <>
                  <Pressable
                    style={styles.replyMenuRow}
                    onPress={() => {
                      const target = replyMenuReply;
                      setReplyMenuReply(null);
                      setEditingReply(target);
                      setEditReplyDraft(target.text);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color="#334155"
                    />
                    <Text style={styles.replyMenuRowLabel}>Edit reply</Text>
                  </Pressable>
                  <View style={styles.replyMenuDivider} />
                  <Pressable
                    style={styles.replyMenuRow}
                    onPress={() => {
                      const id = replyMenuReply.id;
                      setReplyMenuReply(null);
                      confirmDeleteReply(id);
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#b91c1c" />
                    <Text style={styles.replyMenuRowLabelDestructive}>Delete reply</Text>
                  </Pressable>
                  <View style={styles.replyMenuDivider} />
                  <Pressable
                    style={styles.replyMenuRow}
                    onPress={() => {
                      const r = replyMenuReply;
                      const wasEdited = r.created_at !== r.updated_at;
                      setReplyMenuReply(null);
                      Alert.alert(
                        'Reply info',
                        wasEdited
                          ? `Created: ${formatReplyDetailTime(r.created_at)}\n\nLast edited: ${formatReplyDetailTime(r.updated_at)}`
                          : `Created: ${formatReplyDetailTime(r.created_at)}`
                      );
                    }}
                  >
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color="#334155"
                    />
                    <Text style={styles.replyMenuRowLabel}>Info</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <ModalShell
        visible={!!editingReply}
        onClose={() => setEditingReply(null)}
        keyboardOffset={0}
      >
        <ModalCard>
          <Text style={styles.modalTitle}>Edit reply</Text>
          <TextInput
            style={styles.editReplyInput}
            multiline
            value={editReplyDraft}
            onChangeText={setEditReplyDraft}
            placeholder="Reply text…"
          />
          <View style={styles.modalButtons}>
            <Button
              type="ghost"
              size="sm"
              title="Cancel"
              titleColor={Colors.common.gray600}
              onPress={() => setEditingReply(null)}
            />
            <Pressable
              hitSlop={10}
              disabled={!editReplyDraft.trim() || updateReply.isPending || !editingReply}
              onPress={() => {
                if (!editingReply) return;
                updateReply.mutate(
                  { id: editingReply.id, text: editReplyDraft },
                  {
                    onSuccess: () => setEditingReply(null),
                    onError: e => Alert.alert('Error', e.message),
                  }
                );
              }}
              style={({ pressed }) => [
                styles.modalSendIconBtn,
                (!editReplyDraft.trim() || updateReply.isPending) &&
                  styles.modalSendIconBtnDisabled,
                pressed &&
                  editReplyDraft.trim() &&
                  !updateReply.isPending && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save reply"
            >
              {updateReply.isPending ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={24}
                  color={
                    !editReplyDraft.trim() || updateReply.isPending ? '#cbd5e1' : '#2563eb'
                  }
                />
              )}
            </Pressable>
          </View>
        </ModalCard>
      </ModalShell>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    alignSelf: 'stretch',
    gap: 6,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
  },
  reactionPillOuter: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  reactionPillOuterMine: {
    backgroundColor: 'rgba(37,99,235,0.14)',
    borderColor: 'rgba(37,99,235,0.3)',
  },
  reactionPillTouchable: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 5,
    minHeight: 30,
    justifyContent: 'center',
  },
  reactionPillText: {
    fontSize: 15,
    lineHeight: 20,
  },
  reactionPillTotal: {
    fontWeight: '600',
    color: '#334155',
  },
  repliesBlock: {
    gap: 6,
    paddingLeft: 2,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 2,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  replyAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginTop: 1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  replyAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  replyAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyAvatarInitial: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  replyBody: { flex: 1, minWidth: 0 },
  replyMeta: { fontSize: 11, opacity: 0.55, marginBottom: 2 },
  replyMetaByline: { marginTop: 0 },
  replyText: { fontSize: 14, color: '#1e293b' },
  replyMenuIconBtn: {
    padding: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  replyMenuModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyMenuModalDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  replyMenuModalSheet: {
    width: REPLY_MENU_WIDTH,
    maxWidth: '92%',
    zIndex: 1,
  },
  replyMenuCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  replyMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  replyMenuRowLabel: { fontSize: 16, color: '#0f172a' },
  replyMenuRowLabelDestructive: { fontSize: 16, color: '#b91c1c', fontWeight: '500' },
  replyMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 2,
    marginHorizontal: 10,
  },
  reactionsSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0f172a',
  },
  reactionsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  reactionSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  reactionSummaryChipText: {
    fontSize: 15,
    lineHeight: 20,
  },
  detailList: { maxHeight: 280, alignSelf: 'stretch' },
  sheetRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sheetRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  sheetRowPressed: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  sheetAvatarWrap: {
    width: 44,
    height: 44,
  },
  sheetAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
  },
  sheetAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
  },
  sheetNameBlock: { flex: 1, minWidth: 0 },
  sheetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  sheetTapHint: {
    fontSize: 13,
    marginTop: 2,
    color: '#64748b',
  },
  sheetRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetRowEmoji: {
    fontSize: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  editReplyInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  modalSendIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendIconBtnDisabled: { opacity: 0.5 },
});
