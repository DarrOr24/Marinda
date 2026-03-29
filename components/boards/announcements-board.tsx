// app/boards/announcements.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Keyboard,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useRefById } from '@/hooks/use-ref-by-id';
import { useFamily } from '@/lib/families/families.hooks';

import {
  useAddAnnouncementReply,
  useAnnouncementEngagement,
  useCreateAnnouncement,
  useCreateAnnouncementTab,
  useDeleteAnnouncement,
  useFamilyAnnouncements,
  useFamilyAnnouncementTabs,
  useSetAnnouncementReaction,
  useUpdateAnnouncement,
} from '@/lib/announcements/announcements.hooks';


import { AnnouncementItemEngagement } from '@/components/boards/announcement-item-engagement';
import { ChipSelector } from '@/components/chip-selector';
import { MoveToTabModal } from '@/components/modals/move-to-tab-modal';
import { StickyNote } from '@/components/sticky-note';
import { Button, ModalDialog, ModalPopover, Screen, ScreenState, TextInput } from '@/components/ui';
import { Colors } from '@/config/colors';
import {
  CUSTOM_TAB_TEXT,
  getBulletinStyle,
  TAB_PILL_TEXT,
} from '@/lib/announcements/announcements.styles';
import { getAvatarPublicUrl } from '@/lib/profiles/profiles.api';
import {
  DEFAULT_ANNOUNCEMENT_TABS,
  type AnnouncementItem,
  type AnnouncementReaction,
  type AnnouncementReply,
  type AnnouncementTab,
} from '@/lib/announcements/announcements.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --------------------------------------------
// Helper: Build a default placeholder
// --------------------------------------------
function buildDefaultPlaceholder(label: string) {
  return `Write a new ${label.trim()}...`;
}

// Helper
const shortId = (id?: string) => (id ? `ID ${String(id).slice(0, 6)}` : '—');

function authorRowInitial(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t[0]!.toUpperCase();
}

function formatBulletinDetailTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Only then enable auto-shrink; shorter placeholders stay at full font size (Android often over-shrinks). */
const COMPOSER_PLACEHOLDER_SHRINK_MIN_CHARS = 52;

// --------------------------------------------
// MAIN COMPONENT
// --------------------------------------------
export default function AnnouncementsBoard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const { activeFamilyId, effectiveMember, family, members, hasParentPermissions } =
    useAuthContext() as any;
  const familyId = activeFamilyId ?? undefined;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'edited'>('newest');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const bulletinSearchRef = useRef<RNTextInput>(null);
  const getNoteMenuAnchorRef = useRefById<View>();

  /** Check: collapse toolbar; keep query and filtered results. */
  const applyBulletinSearch = () => {
    setSearchExpanded(false);
    Keyboard.dismiss();
  };

  /** X: clear query and leave search mode. */
  const discardBulletinSearch = () => {
    setSearch('');
    setSearchExpanded(false);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (!searchExpanded) return;
    const id = requestAnimationFrame(() => {
      bulletinSearchRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [searchExpanded]);

  /** Recalculate when returning from system Settings (display size / font scale). */
  const [fontMetricsTick, setFontMetricsTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setFontMetricsTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  /**
   * Default: one tight row (pre–large-type sizing).
   * From ~1.08× content-size scale up: grow so one line + descenders fit without a huge box at 1×.
   */
  const composerSizing = useMemo(() => {
    void fontMetricsTick;
    const fs = Math.max(1, PixelRatio.getFontScale());
    const border = 1;

    if (fs < 1.08) {
      const padV = 10;
      return {
        minHeight: 48,
        paddingTop: padV,
        paddingBottom: padV,
        placeholderInsetTop: border + padV,
        placeholderInsetBottom: border + padV,
      };
    }

    const padV = Math.round(10 + Math.min(fs - 1, 1.2) * 7);
    const descenderExtra = Math.round(2 + (fs - 1) * 6);
    const minH = Math.max(
      50,
      Math.ceil(19 * fs + 2 * padV + descenderExtra + 2)
    );
    return {
      minHeight: minH,
      paddingTop: padV,
      paddingBottom: padV + descenderExtra,
      placeholderInsetTop: border + padV,
      placeholderInsetBottom: border + padV + descenderExtra,
    };
  }, [fontMetricsTick]);

  // --------------------------------------------
  // Load Members
  // --------------------------------------------
  const { familyMembers } = useFamily(familyId);

  const rawMembers: any[] = useMemo(
    () =>
      (familyMembers?.data ??
        members?.data ??
        members ??
        family?.members ??
        []) as any[],
    [familyMembers?.data, members, family]
  );

  const nameForId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of rawMembers) {
      const id = m?.id ?? m?.member_id;
      if (!id) continue;
      const name =
        m?.nickname ||
        m?.profile?.first_name ||
        m?.first_name ||
        m?.profile?.name ||
        m?.name;
      map[id] = name || shortId(id);
    }
    return (id?: string) => (id ? map[id] || shortId(id) : '—');
  }, [rawMembers]);

  const avatarUrlForMemberId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const m of rawMembers) {
      const id = m?.id ?? m?.member_id;
      if (!id) continue;
      const pub = m?.public_avatar_url;
      if (typeof pub === 'string' && pub.length > 0) {
        map[id] = pub;
        continue;
      }
      const path = m?.profile?.avatar_url ?? m?.avatar_url ?? null;
      map[id] = path ? getAvatarPublicUrl(path) : null;
    }
    return (memberId: string) => map[memberId] ?? null;
  }, [rawMembers]);

  /** Kid mode: acting kid's member id; otherwise the logged-in member (matches RLS + proxy policy). */
  const myFamilyMemberId: string | undefined = effectiveMember?.id;

  // --------------------------------------------
  // Load Announcements + Realtime
  // --------------------------------------------
  const { data: announcements, isLoading, error } = useFamilyAnnouncements(familyId);
  const { data: engagement } = useAnnouncementEngagement(familyId);

  const engagementByItem = useMemo(() => {
    const map = new Map<
      string,
      { replies: AnnouncementReply[]; reactions: AnnouncementReaction[] }
    >();
    if (!engagement) return map;
    for (const r of engagement.replies) {
      const cur = map.get(r.announcement_item_id) ?? { replies: [], reactions: [] };
      cur.replies.push(r);
      map.set(r.announcement_item_id, cur);
    }
    for (const r of engagement.reactions) {
      const cur = map.get(r.announcement_item_id) ?? { replies: [], reactions: [] };
      cur.reactions.push(r);
      map.set(r.announcement_item_id, cur);
    }
    return map;
  }, [engagement]);

  const createMutation = useCreateAnnouncement(familyId);
  const deleteMutation = useDeleteAnnouncement(familyId);
  const updateMutation = useUpdateAnnouncement(familyId);
  const addReplyMutation = useAddAnnouncementReply(familyId);
  const setReactionMutation = useSetAnnouncementReaction(familyId);

  // --------------------------------------------
  // Load Custom Tabs
  // --------------------------------------------
  const { data: customTabs = [] } = useFamilyAnnouncementTabs(familyId);
  const createTabMutation = useCreateAnnouncementTab(familyId);

  const ALL_TABS: AnnouncementTab[] = [...DEFAULT_ANNOUNCEMENT_TABS, ...customTabs];

  const [activeKind, setActiveKind] = useState<string>('notes');
  const activeTab = ALL_TABS.find(t => t.id === activeKind) ?? ALL_TABS[0];
  const shrinkComposerPlaceholder =
    activeTab.placeholder.length >= COMPOSER_PLACEHOLDER_SHRINK_MIN_CHARS;

  // If active tab was deleted (or never existed), switch to first tab
  const tabIds = useMemo(() => ALL_TABS.map(t => t.id), [customTabs]);
  useEffect(() => {
    if (!tabIds.includes(activeKind) && tabIds.length > 0) {
      setActiveKind(tabIds[0]);
    }
  }, [tabIds, activeKind]);

  // --------------------------------------------
  // UI State
  // --------------------------------------------
  const [newText, setNewText] = useState('');
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [editText, setEditText] = useState('');

  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabPlaceholder, setNewTabPlaceholder] = useState('');

  const [noteMenuItem, setNoteMenuItem] = useState<AnnouncementItem | null>(null);
  const [moveNoteItem, setMoveNoteItem] = useState<AnnouncementItem | null>(null);
  const [replyModalItem, setReplyModalItem] = useState<AnnouncementItem | null>(null);
  const [replyModalDraft, setReplyModalDraft] = useState('');
  const [emojiPickerForItemId, setEmojiPickerForItemId] = useState<string | null>(null);
  const emojiPickItemRef = useRef<string | null>(null);

  const onBulletinEmojiPicked = useCallback(
    (picked: EmojiType) => {
      const itemId = emojiPickItemRef.current;
      if (!itemId || !myFamilyMemberId || !familyId) return;
      const trimmed = picked.emoji.trim().slice(0, 32);
      if (!trimmed) return;
      setReactionMutation.mutate(
        {
          announcementItemId: itemId,
          familyId,
          memberId: myFamilyMemberId,
          emoji: trimmed,
        },
        {
          onError: e => Alert.alert('Error', e.message),
        }
      );
      emojiPickItemRef.current = null;
      setEmojiPickerForItemId(null);
    },
    [familyId, myFamilyMemberId, setReactionMutation]
  );

  // --------------------------------------------
  // SEARCH LOGIC
  // --------------------------------------------
  const isSearching = search.trim().length > 0;

  let filteredAnnouncements =
    (announcements ?? [])
      .map(a => ({
        ...a,
        created_by_name: nameForId(a.created_by_member_id),
      }))
      .filter(a => {
        if (isSearching) {
          const q = search.toLowerCase();
          if (
            a.text.toLowerCase().includes(q) ||
            (a.created_by_name ?? '').toLowerCase().includes(q)
          ) {
            return true;
          }
          const bundle = engagementByItem.get(a.id);
          if (!bundle?.replies.length) return false;
          for (const r of bundle.replies) {
            if (r.text.toLowerCase().includes(q)) return true;
            const replyAuthor = nameForId(r.member_id);
            if (replyAuthor && replyAuthor.toLowerCase().includes(q)) return true;
          }
          return false;
        }
        return a.kind === activeKind;
      });

  // AUTHOR FILTER
  if (filterAuthor !== 'all') {
    filteredAnnouncements = filteredAnnouncements.filter(
      a => a.created_by_name === filterAuthor
    );
  }

  // SORT
  if (sortBy === 'newest') {
    filteredAnnouncements.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sortBy === 'oldest') {
    filteredAnnouncements.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  } else if (sortBy === 'edited') {
    filteredAnnouncements.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  // --------------------------------------------
  // Add Announcement
  // --------------------------------------------
  function handleAdd() {
    if (!familyId || !myFamilyMemberId) return;

    const trimmed = newText.trim();
    if (!trimmed) return;

    // ✅ CLOSE keyboard immediately
    Keyboard.dismiss();

    createMutation.mutate(
      {
        familyId,
        createdByMemberId: myFamilyMemberId,
        kind: activeKind,
        text: trimmed,
        weekStart: null,
      },
      {
        onSuccess: () => setNewText(''),
        onError: err => Alert.alert('Error', (err as Error).message),
      }
    );
  }


  // --------------------------------------------
  // Delete
  // --------------------------------------------
  function handleDelete(item: AnnouncementItem) {
    deleteMutation.mutate(item.id, {
      onError: err => Alert.alert('Error', err.message),
    });
  }

  function confirmDelete(item: AnnouncementItem) {
    const canDelete =
      item.created_by_member_id === myFamilyMemberId ||
      hasParentPermissions;

    if (!canDelete) {
      Alert.alert('Not allowed', 'You cannot delete this item.');
      return;
    }

    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(item),
      },
    ]);
  }

  // --------------------------------------------
  // Render states
  // --------------------------------------------
  if (!familyId) {
    return (
      <ScreenState
        title="Bulletin"
        description="Please select a family."
        withBackground={false}
      />
    );
  }

  if (isLoading) {
    return (
      <ScreenState
        title="Bulletin"
        description="Loading…"
        showActivityIndicator
        withBackground={false}
      />
    );
  }

  if (error) {
    return (
      <ScreenState
        title="Bulletin"
        description={error.message}
        withBackground={false}
      />
    );
  }

  // --------------------------------------------
  // MAIN RENDER
  // --------------------------------------------
  /** Space under last scrolled item — tab bar sits outside this screen; keep small to avoid a dead gap. */
  const scrollBottomPad = 12 + insets.bottom
  /** Wide enough to type comfortably; horizontal scroll when fonts (or labels) grow. */
  const bulletinSearchFieldMinW = Math.max(200, Math.round(windowWidth * 0.62))

  return (
    <Screen
      scroll={false}
      withBackground={false}
      contentStyle={{ paddingBottom: 0 }}
      overlay={
        showSortMenu || showAuthorMenu ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {showSortMenu ? (
              <Pressable style={styles.modalOverlay} onPress={() => setShowSortMenu(false)}>
                <Pressable style={styles.simpleMenu}>
                  {['newest', 'oldest', 'edited'].map(option => (
                    <Pressable
                      key={option}
                      style={styles.menuItem}
                      onPress={() => {
                        setSortBy(option as any);
                        setShowSortMenu(false);
                      }}
                    >
                      <Text style={styles.menuItemText}>{option}</Text>
                    </Pressable>
                  ))}
                </Pressable>
              </Pressable>
            ) : null}
            {showAuthorMenu ? (
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setShowAuthorMenu(false)}
              >
                <Pressable style={styles.simpleMenu}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      setFilterAuthor('all');
                      setShowAuthorMenu(false);
                    }}
                  >
                    <Text style={styles.menuItemText}>All</Text>
                  </Pressable>

                  {rawMembers.map(m => {
                    const name =
                      m?.nickname || m?.profile?.first_name || m?.name || shortId(m.id);

                    return (
                      <Pressable
                        key={m.id}
                        style={styles.menuItem}
                        onPress={() => {
                          setFilterAuthor(name);
                          setShowAuthorMenu(false);
                        }}
                      >
                        <Text style={styles.menuItemText}>{name}</Text>
                      </Pressable>
                    );
                  })}
                </Pressable>
              </Pressable>
            ) : null}
          </View>
        ) : null
      }
    >
      <View style={styles.tapToDismiss}>
        <View style={styles.boardInner}>
          <View style={styles.container}>
            {/*
              Do not wrap horizontal toolbars in TouchableWithoutFeedback — it steals pans.
              Tap-to-dismiss only the chip row + note composer.
            */}
            <View style={styles.headerBlock}>
            {/* ---------------------------------------------- */}
            {/* SORT / BY / SEARCH — expanded search covers this row */}
            {/* ---------------------------------------------- */}
            {searchExpanded ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                style={styles.toolbarHScroll}
                contentContainerStyle={styles.searchExpandedScrollContent}
              >
                <Pressable
                  onPress={discardBulletinSearch}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and close"
                  style={styles.toolbarIconBtn}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </Pressable>
                <Pressable
                  onPress={applyBulletinSearch}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Done searching"
                  style={styles.toolbarIconBtn}
                >
                  <Ionicons name="checkmark" size={22} color="#2563eb" />
                </Pressable>
                <View style={[styles.searchFieldWrap, { minWidth: bulletinSearchFieldMinW }]}>
                  <TextInput
                    ref={bulletinSearchRef}
                    style={styles.toolbarSearchInput}
                    placeholder="Search bulletin…"
                    value={search}
                    onChangeText={setSearch}
                    returnKeyType="search"
                    onSubmitEditing={applyBulletinSearch}
                    blurOnSubmit
                    {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                  />
                  {search.length > 0 ? (
                    <Pressable
                      style={styles.clearSearchBtnInline}
                      onPress={() => setSearch('')}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search text"
                    >
                      <Ionicons name="close-circle" size={18} color="#999" />
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                style={styles.toolbarHScroll}
                contentContainerStyle={styles.collapsedToolbarScrollContent}
              >
                <View style={styles.sortByGroup}>
                  <Button
                    type="outline"
                    size="sm"
                    backgroundColor="#eef2ff"
                    onPress={() => setShowSortMenu(true)}
                    title={`Sort: ${sortBy}`}
                  />

                  <Button
                    type="outline"
                    size="sm"
                    backgroundColor="#eef2ff"
                    onPress={() => setShowAuthorMenu(true)}
                    title={`By: ${filterAuthor === 'all' ? 'All' : filterAuthor}`}
                  />
                </View>

                <View style={styles.iconGroup}>
                  <Button
                    type="outline"
                    size="sm"
                    backgroundColor="#eef2ff"
                    round
                    hitSlop={8}
                    title=""
                    onPress={() => setSearchExpanded(true)}
                    leftIcon={<Ionicons name="search-outline" size={20} />}
                    accessibilityLabel="Search bulletin"
                  />

                  <Button
                    type="outline"
                    size="sm"
                    backgroundColor="#eef2ff"
                    round
                    hitSlop={8}
                    onPress={() => router.push('/announcements/info')}
                    leftIcon={<Ionicons name="information-circle-outline" size={20} />}
                  />

                  {hasParentPermissions && (
                    <Button
                      type="outline"
                      size="sm"
                      backgroundColor="#eef2ff"
                      round
                      hitSlop={8}
                      onPress={() => router.push('/announcements/settings')}
                      leftIcon={<Ionicons name="settings-outline" size={20} />}
                    />
                  )}
                </View>
              </ScrollView>
            )}

        {/* ---------------------------------------------- */}
        {/* TABS + ADD (flows right after last tab when space allows) */}
        {/* ---------------------------------------------- */}
        <View style={styles.tabsContainer}>
          <ChipSelector
            horizontal
            value={isSearching ? null : activeKind}
            onChange={(val) => {
              if (!val) return;
              if (!isSearching) {
                setActiveKind(val);
                setNewText('');
              }
            }}
            allowDeselect={false}
            options={ALL_TABS.map((t) => ({ label: t.label, value: t.id }))}
            chipStyle={(active, opt) => {
              const style = getBulletinStyle(opt.value);
              return {
                backgroundColor: active ? style.backgroundColor : '#f9fafb',
                borderColor: active ? style.borderLeftColor : '#d4d4d4',
              };
            }}
            chipTextStyle={(active, opt) => ({
              color: active ? (TAB_PILL_TEXT[opt.value] ?? CUSTOM_TAB_TEXT) : '#4b5563',
              fontWeight: active ? '600' : '500',
            })}
            trailingElement={
              <Button
                type="outline"
                size="sm"
                backgroundColor="#eef2ff"
                round
                hitSlop={8}
                title=""
                leftIcon={<Ionicons name="add" size={16} />}
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  minHeight: 28,
                  alignSelf: 'center',
                }}
                onPress={() => {
                  setNewTabLabel('');
                  setNewTabPlaceholder('');
                  setShowAddTabModal(true);
                }}
              />
            }
          />
        </View>


        {/* ---------------------------------------------- */}
        {/* ADD ANNOUNCEMENT INPUT (tap blank composer chrome to dismiss keyboard) */}
        {/* ---------------------------------------------- */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.inputBar}>
          <View style={styles.noteInputWrapper}>
            <TextInput
              style={[
                styles.textInputMultiline,
                styles.textInputMultilineWithCheck,
                styles.noteComposerInput,
                composerSizing,
              ]}
              placeholder=""
              value={newText}
              onChangeText={setNewText}
              multiline
              multilineCompact
              numberOfLines={1}
              submitBehavior="newline"
              returnKeyType="default"
              textAlignVertical="center"
              includeFontPadding={false}
              accessibilityLabel={newText.trim() ? undefined : activeTab.placeholder}
            />
            {newText.length === 0 ? (
              <View
                style={[
                  styles.noteComposerPlaceholderWrap,
                  {
                    top: composerSizing.placeholderInsetTop,
                    bottom: composerSizing.placeholderInsetBottom,
                  },
                ]}
                pointerEvents="none"
              >
                <Text
                  style={styles.noteComposerPlaceholderText}
                  numberOfLines={1}
                  allowFontScaling
                  accessible={false}
                  {...(shrinkComposerPlaceholder
                    ? { adjustsFontSizeToFit: true as const, minimumFontScale: 0.88 }
                    : {})}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {activeTab.placeholder}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.noteCheckBtn,
                (!newText.trim() || createMutation.isPending) && styles.noteCheckBtnDisabled,
                pressed &&
                  newText.trim() &&
                  !createMutation.isPending &&
                  styles.noteCheckBtnPressed,
              ]}
              onPress={handleAdd}
              disabled={!newText.trim() || createMutation.isPending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Send note"
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={22}
                  color={!newText.trim() ? '#cbd5e1' : '#2563eb'}
                />
              )}
            </Pressable>
          </View>
        </View>
        </TouchableWithoutFeedback>
            </View>

        {/* ---------------------------------------------- */}
        {/* LIST — One sticky note per tab */}
        {/* ---------------------------------------------- */}
        <ScrollView
          style={styles.noteScroll}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: scrollBottomPad,
            flexGrow: 0,
          }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            setNoteMenuItem(null);
          }}
          nestedScrollEnabled={Platform.OS === 'android'}
          {...(Platform.OS === 'ios'
            ? { contentInsetAdjustmentBehavior: 'never' as const }
            : {})}
        >
          <StickyNote
            backgroundColor={getBulletinStyle(activeKind).backgroundColor}
            borderLeftColor={getBulletinStyle(activeKind).borderLeftColor}
          >
            {filteredAnnouncements.length === 0 ? (
              <View
                style={[
                  styles.emptyStateBox,
                  {
                    paddingVertical: Math.max(
                      10,
                      Math.round(8 * Math.min(PixelRatio.getFontScale(), 2.2)),
                    ),
                  },
                ]}
              >
                <Text
                  style={styles.infoText}
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {activeTab.emptyText}
                </Text>
              </View>
            ) : (
              filteredAnnouncements.map((item, idx) => {
                const bucket = engagementByItem.get(item.id);
                const authorMemberId = item.created_by_member_id;
                const authorAvatarUrl = authorMemberId
                  ? avatarUrlForMemberId(authorMemberId)
                  : null;
                const authorLabel =
                  item.created_by_name?.trim() ||
                  nameForId(authorMemberId) ||
                  '—';
                const noteWasEdited = item.created_at !== item.updated_at;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemBlock,
                      idx === filteredAnnouncements.length - 1 && styles.itemBlockLast,
                    ]}
                  >
                    <View style={styles.itemRowInner}>
                      <View style={styles.itemAuthorAvatarWrap}>
                        {authorAvatarUrl ? (
                          <Image
                            source={{ uri: authorAvatarUrl }}
                            style={styles.itemAuthorAvatarImg}
                            resizeMode="cover"
                            accessibilityIgnoresInvertColors
                          />
                        ) : (
                          <View style={styles.itemAuthorAvatarPlaceholder}>
                            <Text
                              style={styles.itemAuthorAvatarInitial}
                              selectable={false}
                              {...(Platform.OS === 'android'
                                ? { includeFontPadding: false }
                                : {})}
                            >
                              {authorRowInitial(authorLabel)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text
                          style={[styles.itemMeta, styles.itemMetaByline]}
                          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                        >
                          {authorLabel} • {new Date(item.created_at).toLocaleString()}
                          {noteWasEdited ? ' · edited' : ''}
                        </Text>

                        <Text
                          style={styles.itemText}
                          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                        >
                          {item.text}
                        </Text>

                        {item.completed && (
                          <Text
                            style={styles.itemMeta}
                            {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                          >
                            ✓ Completed
                          </Text>
                        )}
                      </View>

                      <View style={styles.cardActions}>
                        {myFamilyMemberId ||
                        item.created_by_member_id === myFamilyMemberId ||
                        hasParentPermissions ? (
                          <View ref={getNoteMenuAnchorRef(item.id)} collapsable={false}>
                            <Pressable
                              hitSlop={10}
                              onPress={() => setNoteMenuItem(item)}
                              style={({ pressed }) => [
                                styles.noteMenuIconBtn,
                                pressed && { opacity: 0.72 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel="Note actions"
                            >
                              <MaterialCommunityIcons
                                name="dots-vertical"
                                size={20}
                                color="#475569"
                              />
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {familyId && (
                      <AnnouncementItemEngagement
                        familyId={familyId}
                        myFamilyMemberId={myFamilyMemberId}
                        hasParentPermissions={!!hasParentPermissions}
                        nameForId={nameForId}
                        avatarUrlForMemberId={avatarUrlForMemberId}
                        replies={bucket?.replies ?? []}
                        reactions={bucket?.reactions ?? []}
                      />
                    )}
                  </View>
                );
              })
            )}
          </StickyNote>
        </ScrollView>

        {/* ---------------------------------------------- */}
        {/* EDIT ANNOUNCEMENT MODAL */}
        {/* ---------------------------------------------- */}
        <ModalDialog
          visible={!!editingItem}
          onClose={() => setEditingItem(null)}
          size="md"
        >
          <View>
            <Text style={styles.modalTitle}>Edit item</Text>

            <TextInput
              style={styles.textInputMultiline}
              multiline
              value={editText}
              onChangeText={setEditText}
              placeholder="Edit your note..."
            />

            <View style={styles.modalButtons}>
              <Button
                type="ghost"
                size="sm"
                title="Cancel"
                titleColor={Colors.common.gray600}
                onPress={() => setEditingItem(null)}
              />
              <Pressable
                hitSlop={10}
                disabled={!editText.trim() || updateMutation.isPending || !editingItem}
                onPress={() => {
                  if (!editingItem) return;
                  updateMutation.mutate(
                    { id: editingItem.id, updates: { text: editText.trim() } },
                    {
                      onSuccess: () => setEditingItem(null),
                      onError: err => Alert.alert('Error', err.message),
                    }
                  );
                }}
                style={({ pressed }) => [
                  styles.modalSendIconBtn,
                  (!editText.trim() || updateMutation.isPending) && styles.modalSendIconBtnDisabled,
                  pressed && editText.trim() && !updateMutation.isPending && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save note"
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <MaterialCommunityIcons
                    name="send"
                    size={24}
                    color={
                      !editText.trim() || updateMutation.isPending ? '#cbd5e1' : '#2563eb'
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </ModalDialog>

        {/* ---------------------------------------------- */}
        {/* REPLY TO NOTE (from ⋯ menu) */}
        {/* ---------------------------------------------- */}
        <ModalDialog
          visible={!!replyModalItem}
          onClose={() => {
            setReplyModalItem(null);
            setReplyModalDraft('');
          }}
          size="md"
        >
          <View>
            <Text style={styles.modalTitle}>Reply</Text>
            <TextInput
              style={styles.textInputMultiline}
              multiline
              value={replyModalDraft}
              onChangeText={setReplyModalDraft}
              placeholder="Write a reply…"
              submitBehavior="newline"
            />
            <View style={styles.modalButtons}>
              <Button
                type="ghost"
                size="sm"
                title="Cancel"
                titleColor={Colors.common.gray600}
                onPress={() => {
                  setReplyModalItem(null);
                  setReplyModalDraft('');
                }}
              />
              <Pressable
                hitSlop={10}
                disabled={
                  !replyModalDraft.trim() || addReplyMutation.isPending || !replyModalItem
                }
                onPress={() => {
                  if (!replyModalItem || !myFamilyMemberId || !familyId) return;
                  const t = replyModalDraft.trim();
                  if (!t) return;
                  addReplyMutation.mutate(
                    {
                      announcementItemId: replyModalItem.id,
                      familyId,
                      memberId: myFamilyMemberId,
                      text: t,
                    },
                    {
                      onSuccess: () => {
                        setReplyModalItem(null);
                        setReplyModalDraft('');
                      },
                      onError: err => Alert.alert('Error', err.message),
                    }
                  );
                }}
                style={({ pressed }) => [
                  styles.modalSendIconBtn,
                  (!replyModalDraft.trim() || addReplyMutation.isPending) &&
                    styles.modalSendIconBtnDisabled,
                  pressed &&
                    replyModalDraft.trim() &&
                    !addReplyMutation.isPending && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send reply"
              >
                {addReplyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <MaterialCommunityIcons
                    name="send"
                    size={24}
                    color={
                      !replyModalDraft.trim() || addReplyMutation.isPending
                        ? '#cbd5e1'
                        : '#2563eb'
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </ModalDialog>

        <EmojiPicker
          open={!!emojiPickerForItemId}
          onClose={() => {
            emojiPickItemRef.current = null;
            setEmojiPickerForItemId(null);
          }}
          onEmojiSelected={onBulletinEmojiPicked}
          enableSearchBar
        />


        {/* ---------------------------------------------- */}
        {/* ADD TAB MODAL */}
        {/* ---------------------------------------------- */}
        <ModalDialog
          visible={showAddTabModal}
          onClose={() => setShowAddTabModal(false)}
          size="md"
        >
          <View>
            <Text style={styles.modalTitle}>Create New Tab</Text>

            <TextInput
              placeholder="Tab name (e.g., Holidays)"
              value={newTabLabel}
              onChangeText={setNewTabLabel}
              containerStyle={{ marginBottom: 10 }}
            />

            <TextInput
              style={styles.textInputMultiline}
              placeholder={
                newTabLabel.trim()
                  ? buildDefaultPlaceholder(newTabLabel)
                  : 'Placeholder (optional)'
              }
              value={newTabPlaceholder}
              onChangeText={setNewTabPlaceholder}
            />

            <View style={styles.modalButtons}>
              <Button
                type="ghost"
                size="sm"
                title="Cancel"
                titleColor={Colors.common.gray600}
                onPress={() => setShowAddTabModal(false)}
              />

              <Button
                type="primary"
                size="sm"
                title={createTabMutation.isPending ? '...' : 'Create'}
                disabled={!newTabLabel.trim() || createTabMutation.isPending}
                onPress={() => {
                  const trimmed = newTabLabel.trim();
                  if (!trimmed) return;

                  const finalPlaceholder =
                    newTabPlaceholder.trim() || buildDefaultPlaceholder(trimmed);

                  createTabMutation.mutate(
                    { familyId: familyId!, label: trimmed, placeholder: finalPlaceholder },
                    {
                      onSuccess: newTab => {
                        setShowAddTabModal(false);
                        setActiveKind(newTab.id);
                      },
                      onError: err => Alert.alert('Error', err.message),
                    }
                  );
                }}
              />
            </View>
          </View>
        </ModalDialog>


        <ModalPopover
          visible={!!noteMenuItem}
          onClose={() => setNoteMenuItem(null)}
          anchorRef={getNoteMenuAnchorRef(noteMenuItem?.id ?? '')}
          position="bottom-right"
        >
          {noteMenuItem
            ? (() => {
                const item = noteMenuItem;
                const canEditNote =
                  item.created_by_member_id === myFamilyMemberId ||
                  hasParentPermissions;
                const moveTargets = ALL_TABS.filter(t => t.id !== item.kind);
                const noteInfoWasEdited = item.created_at !== item.updated_at;
                return (
                  <>
                    {canEditNote ? (
                      <Pressable
                        style={styles.noteMenuRow}
                        onPress={() => {
                          setNoteMenuItem(null);
                          setEditingItem(item);
                          setEditText(item.text);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={18}
                          color="#334155"
                        />
                        <Text style={styles.noteMenuRowLabel}>Edit</Text>
                      </Pressable>
                    ) : null}
                    {canEditNote && moveTargets.length > 0 ? (
                      <Pressable
                        style={styles.noteMenuRow}
                        onPress={() => {
                          setNoteMenuItem(null);
                          setMoveNoteItem(item);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="folder-move-outline"
                          size={18}
                          color="#334155"
                        />
                        <Text style={styles.noteMenuRowLabel}>Move to tab…</Text>
                      </Pressable>
                    ) : null}
                    {canEditNote ? (
                      <Pressable
                        style={styles.noteMenuRow}
                        onPress={() => {
                          setNoteMenuItem(null);
                          confirmDelete(item);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={18}
                          color="#b91c1c"
                        />
                        <Text style={styles.noteMenuRowLabelDestructive}>
                          Delete
                        </Text>
                      </Pressable>
                    ) : null}
                    {canEditNote && myFamilyMemberId ? (
                      <View style={styles.noteMenuDivider} />
                    ) : null}
                    {myFamilyMemberId ? (
                      <Pressable
                        style={styles.noteMenuRow}
                        onPress={() => {
                          setNoteMenuItem(null);
                          setReplyModalItem(item);
                          setReplyModalDraft('');
                        }}
                      >
                        <MaterialCommunityIcons
                          name="reply-outline"
                          size={18}
                          color="#334155"
                        />
                        <Text style={styles.noteMenuRowLabel}>Reply</Text>
                      </Pressable>
                    ) : null}
                    {myFamilyMemberId ? (
                      <Pressable
                        style={styles.noteMenuRow}
                        onPress={() => {
                          const id = item.id;
                          setNoteMenuItem(null);
                          emojiPickItemRef.current = id;
                          setEmojiPickerForItemId(id);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="emoticon-happy-outline"
                          size={18}
                          color="#334155"
                        />
                        <Text style={styles.noteMenuRowLabel}>React</Text>
                      </Pressable>
                    ) : null}
                    <View style={styles.noteMenuDivider} />
                    <Pressable
                      style={styles.noteMenuRow}
                      onPress={() => {
                        setNoteMenuItem(null);
                        Alert.alert(
                          'Note info',
                          noteInfoWasEdited
                            ? `Created: ${formatBulletinDetailTime(item.created_at)}\n\nLast edited: ${formatBulletinDetailTime(item.updated_at)}`
                            : `Created: ${formatBulletinDetailTime(item.created_at)}`
                        );
                      }}
                    >
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={18}
                        color="#334155"
                      />
                      <Text style={styles.noteMenuRowLabel}>Info</Text>
                    </Pressable>
                  </>
                );
              })()
            : null}
        </ModalPopover>

        <MoveToTabModal
          visible={!!moveNoteItem}
          onClose={() => setMoveNoteItem(null)}
          options={
            moveNoteItem
              ? ALL_TABS.filter((t) => t.id !== moveNoteItem.kind).map((t) => ({
                  id: t.id,
                  label: t.label,
                }))
              : []
          }
          busy={updateMutation.isPending}
          onSelectOption={(tabId) => {
            const target = moveNoteItem;
            if (!target) return;
            updateMutation.mutate(
              { id: target.id, updates: { kind: tabId } },
              {
                onSuccess: () => {
                  setMoveNoteItem(null);
                  setActiveKind(tabId);
                },
                onError: (err) =>
                  Alert.alert(
                    'Error',
                    err instanceof Error ? err.message : 'Could not move',
                  ),
              },
            );
          }}
        />
          </View>
        </View>
      </View>
    </Screen>
  );
}

// --------------------------------------------
// STYLES
// --------------------------------------------
const styles = StyleSheet.create({
  /** `minHeight: 0` lets the nested vertical ScrollView size correctly inside flex parents (avoids jumpy scroll / clipped content). */
  boardInner: { flex: 1, minHeight: 0 },
  container: { flex: 1, minHeight: 0, paddingLeft: 4 },
  tapToDismiss: { flex: 1, minHeight: 0 },
  /** Toolbar + tap area for dismissing keyboard (tabs + composer only). */
  headerBlock: { width: '100%' },
  noteScroll: { flex: 1, minHeight: 0 },
  emptyStateBox: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    flexShrink: 0,
  },

  // --------------------------------------
  // Input overrides (base from TextInput component)
  textInputMultiline: {
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'top',
  },

  /** Single-line-first bulletin composer; vertical size from composerSizing (font scale). */
  noteComposerInput: {
    textAlignVertical: 'center',
    fontSize: 17,
  },

  textInputMultilineWithCheck: {
    paddingRight: 48,
  },

  /** Horizontal insets: border 1 + paddingHorizontal 12; right 1 + paddingRight 48. Vertical: composerSizing. */
  noteComposerPlaceholderWrap: {
    position: 'absolute',
    left: 13,
    right: 49,
    justifyContent: 'center',
  },
  noteComposerPlaceholderText: {
    width: '100%',
    fontSize: 17,
    color: '#94a3b8',
  },

  noteInputWrapper: {
    position: 'relative',
    width: '100%',
  },

  noteCheckBtn: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  noteCheckBtnPressed: {
    opacity: 0.75,
  },
  noteCheckBtnDisabled: {
    opacity: 0.55,
  },

  // --------------------------------------
  // TOOLBAR (Sort / By / search — horizontal scroll for large fonts)
  // --------------------------------------
  toolbarHScroll: {
    marginBottom: 12,
    flexGrow: 0,
  },
  /**
   * Wide phones: Sort/By vs icons separated with space-between.
   * `gap` enforces a minimum strip between groups — without it, scroll-wrapped rows (big fonts)
   * can shrink-wrap to content width and space-between adds zero space, so pills touch the icons.
   */
  collapsedToolbarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingRight: 4,
    minHeight: 32,
    paddingVertical: 2,
    minWidth: '100%',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  searchExpandedScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
    minHeight: 32,
    paddingVertical: 2,
  },
  sortByGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  toolbarIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  searchFieldWrap: {
    flexShrink: 0,
    position: 'relative',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  /** Matches outline `sm` pills (~32pt); grows slightly if Dynamic Type needs it. */
  toolbarSearchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    paddingRight: 34,
    minHeight: 32,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  clearSearchBtnInline: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  // --------------------------------------
  // TABS
  // --------------------------------------
  tabsContainer: {
    marginBottom: 4,
    width: '100%',
  },

  // --------------------------------------
  // LIST — One sticky note per tab (StickyNote component)
  // --------------------------------------
  itemBlock: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  itemBlockLast: {
    borderBottomWidth: 0,
  },
  itemRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemAuthorAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 1,
    overflow: 'hidden',
    flexShrink: 0,
  },
  itemAuthorAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  itemAuthorAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAuthorAvatarInitial: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  itemTextContainer: { flex: 1, minWidth: 0 },
  itemMetaByline: {
    marginTop: 0,
  },
  itemText: { fontSize: 16 },
  itemMeta: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    flexShrink: 0,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },

  // --------------------------------------
  // ADD ANNOUNCEMENT
  // --------------------------------------
  inputBar: {
    paddingTop: 4,
    marginTop: 0,
    /** Space between composer and sticky note (same on iOS and Android). */
    marginBottom: 10,
  },

  // --------------------------------------
  // SHARED MODAL STYLES
  // --------------------------------------
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 16,
  },

  // --------------------------------------
  // MENUS
  // --------------------------------------
  simpleMenu: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 200,
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 16,
  },

  modalSendIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendIconBtnDisabled: { opacity: 0.5 },
  noteMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteMenuRowLabel: { fontSize: 16, color: '#0f172a' },
  noteMenuRowLabelDestructive: { fontSize: 16, color: '#b91c1c', fontWeight: '500' },
  noteMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 2,
    marginHorizontal: 10,
  },
  noteMenuIconBtn: {
    padding: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
