import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthContext } from '@/hooks/use-auth-context';
import { useChoreTemplates } from '@/lib/chores/chores-templates.hooks';
import type { Role } from '@/lib/families/families.types';

type LocalEditorState = {
    id?: string;
    title: string;
    points: string;
};

export default function ChoreGameSettingsScreen() {
    const { activeFamilyId, member } = useAuthContext() as any;
    const currentRole = (member?.role as Role) ?? 'TEEN';
    const myFamilyMemberId: string | undefined = member?.id as string | undefined;

    const {
        templates,
        createTemplate,
        deleteTemplate,
    } = useChoreTemplates(activeFamilyId);

    const [editing, setEditing] = React.useState<LocalEditorState | null>(null);
    const [saving, setSaving] = React.useState(false);

    const isParent = currentRole === 'MOM' || currentRole === 'DAD';

    const requireParent = () => {
        if (!isParent) {
            Alert.alert(
                'Parents only',
                'Only a parent can add, edit, or delete routine chores. Ask a parent to sign in.'
            );
            return false;
        }
        return true;
    };

    const startAdd = () => {
        if (!requireParent()) return;
        setEditing({ id: undefined, title: '', points: '10' });
    };

    const startEdit = (tpl: { id: string; title: string; defaultPoints: number }) => {
        if (!requireParent()) return;
        setEditing({
            id: tpl.id,
            title: tpl.title,
            points: String(tpl.defaultPoints ?? 0),
        });
    };

    const onSaveTemplate = async () => {
        if (!editing || !activeFamilyId) return;
        if (!requireParent()) return;

        const title = editing.title.trim();
        const pointsNum = Number(editing.points);

        if (!title) {
            Alert.alert('Add a title', 'Please enter a name for this routine chore.');
            return;
        }
        if (Number.isNaN(pointsNum)) {
            Alert.alert('Check points', 'Please enter a valid number of points.');
            return;
        }

        try {
            setSaving(true);

            if (editing.id) {
                await deleteTemplate(editing.id);
            }

            await createTemplate({
                title,
                defaultPoints: pointsNum,
                createdById: myFamilyMemberId,
            });

            setEditing(null);
        } catch (e) {
            console.error('save routine template failed', e);
            Alert.alert('Error', 'Could not save the routine chore.');
        } finally {
            setSaving(false);
        }
    };

    const onDeleteTemplate = (id: string, title: string) => {
        if (!requireParent()) return;

        Alert.alert(
            'Delete routine chore?',
            `Are you sure you want to delete "${title}" from your routine chores?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTemplate(id);
                        } catch (e) {
                            console.error('delete routine template failed', e);
                            Alert.alert('Error', 'Could not delete this routine chore.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Intro */}
                <Text style={styles.intro}>
                    Set up your family&apos;s routine chores and points rules. These
                    settings help keep the game fair, motivating, and clear for everyone.
                </Text>

                {/* Routine chores section */}
                <Section title="Routine chores">
                    <Bullet>
                        Here you can add, edit, and delete routine chores like &quot;Empty
                        dishwasher&quot; or &quot;Tidy toys&quot; with default point
                        values.
                    </Bullet>
                    <Bullet>
                        Later, the Post Chore screen can reuse these as quick templates so
                        you don&apos;t have to type the same chores again and again.
                    </Bullet>

                    {!isParent && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={styles.note}>
                                Only parents can change this list. You can still see the routine
                                chores, but adding, editing, or deleting them is for parents only.
                            </Text>
                        </View>
                    )}

                    {/* Editor card (add / edit) */}
                    {editing ? (
                        <View style={styles.editorCard}>
                            <Text style={styles.editorTitle}>
                                {editing.id ? 'Edit routine chore' : 'Add routine chore'}
                            </Text>

                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                value={editing.title}
                                onChangeText={(txt) =>
                                    setEditing((prev) => (prev ? { ...prev, title: txt } : prev))
                                }
                                placeholder="e.g. Empty the dishwasher"
                                style={styles.input}
                            />

                            <Text style={[styles.label, { marginTop: 8 }]}>Points</Text>
                            <TextInput
                                value={editing.points}
                                onChangeText={(txt) =>
                                    setEditing((prev) => (prev ? { ...prev, points: txt } : prev))
                                }
                                keyboardType="number-pad"
                                placeholder="e.g. 10"
                                style={styles.input}
                            />

                            <View style={styles.editorButtonsRow}>
                                <Pressable
                                    style={[styles.smallBtn, styles.secondaryBtn]}
                                    onPress={() => setEditing(null)}
                                    disabled={saving}
                                >
                                    <Text style={styles.smallBtnText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.smallBtn,
                                        styles.primaryBtn,
                                        saving && styles.disabledBtn,
                                    ]}
                                    onPress={onSaveTemplate}
                                    disabled={saving}
                                >
                                    <Text style={[styles.smallBtnText, { color: '#fff' }]}>
                                        {editing.id ? 'Save' : 'Add'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <Pressable style={styles.addBtn} onPress={startAdd}>
                            <Text style={styles.addBtnText}>＋ Add routine chore</Text>
                        </Pressable>
                    )}

                    {/* Existing templates list - visible to all, actions guarded */}
                    {templates && templates.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.label}>Current routine chores</Text>
                            {templates.map((t) => (
                                <View key={t.id} style={styles.templateRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.templateTitle}>{t.title}</Text>
                                        <Text style={styles.templateMeta}>
                                            {t.defaultPoints ?? 0} pts
                                        </Text>
                                    </View>

                                    <View style={styles.templateActions}>
                                        <Pressable
                                            style={[styles.chipBtn, styles.secondaryBtn]}
                                            onPress={() => startEdit(t)}
                                        >
                                            <Text style={styles.chipBtnText}>Edit</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.chipBtn, styles.deleteBtn]}
                                            onPress={() => onDeleteTemplate(t.id, t.title)}
                                        >
                                            <Text
                                                style={[styles.chipBtnText, { color: '#b91c1c' }]}
                                            >
                                                Delete
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </Section>

                {/* Points rules & bonuses (still informational for now) */}
                <Section title="Points rules & bonuses">
                    <Bullet>
                        Soon you&apos;ll be able to set automatic rules, like:
                    </Bullet>
                    <Bullet>
                        • Every 100 points earned in a week = +10 bonus points
                    </Bullet>
                    <Bullet>
                        • 0 expired chores this week = bonus points for everyone
                    </Bullet>
                    <Bullet>
                        You&apos;ll also be able to give manual bonus points from each
                        child&apos;s profile page.
                    </Bullet>
                </Section>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

/* Helper components */
function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>{'\u2022'}</Text>
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F7FBFF',
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    intro: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 16,
    },

    section: {
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 6,
    },

    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bulletDot: {
        fontSize: 14,
        color: '#64748b',
        marginRight: 6,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        color: '#4b5563',
    },
    highlight: {
        fontWeight: '700',
        color: '#1d4ed8',
    },
    note: {
        fontSize: 12,
        color: '#64748b',
    },

    // Editor styles
    editorCard: {
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    editorTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        marginTop: 4,
        backgroundColor: '#fff',
    },
    editorButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    smallBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        backgroundColor: '#2563eb',
    },
    secondaryBtn: {
        backgroundColor: '#f3f4f6',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    smallBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },

    // List of existing templates
    addBtn: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#e0edff',
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1d4ed8',
    },
    templateRow: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    templateTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    templateMeta: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    templateActions: {
        flexDirection: 'row',
        gap: 6,
    },
    chipBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
    chipBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    deleteBtn: {
        backgroundColor: '#fee2e2',
        borderColor: '#fecaca',
    },
});
