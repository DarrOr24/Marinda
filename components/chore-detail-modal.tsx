// components/chore-detail-modal.tsx
import { ChoreView, Proof } from '@/lib/chores/chores.types';
import { Role } from '@/lib/families/families.types';
import { Audio, ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type MemberOption = {
    id: string;
    name: string;
};

type Props = {
    visible: boolean;
    chore: ChoreView;
    currentRole: Role;
    onClose: () => void;

    onAttachProof: (id: string, proof: Proof | null) => void; // null = clear
    onMarkPending: (id: string, doneByIds: string[], proofNote?: string) => void;
    onApprove: (id: string, notes?: string, updatedPoints?: number) => void;
    onDecline: (id: string, notes?: string) => void;

    // still available for OPEN chores if you choose to add buttons there later
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;

    // resolver from parent so names always render correctly
    nameForId: (id?: string) => string;

    // who can be chosen as “done by”
    doneByOptions: MemberOption[];
    // default selection = logged-in member (we’ll also treat this as current member id)
    defaultDoneById?: string;
};

export default function ChoreDetailModal({
    visible,
    chore,
    currentRole,
    onClose,
    onAttachProof,
    onMarkPending,
    onApprove,
    onDecline,
    onDelete,
    onDuplicate,
    nameForId,
    doneByOptions,
    defaultDoneById,
}: Props) {
    const isParent = currentRole === 'MOM' || currentRole === 'DAD';
    const isAssigned = !!chore.assignedToId;

    const [notes, setNotes] = useState(chore.notes ?? '');
    React.useEffect(() => setNotes(chore.notes ?? ''), [chore.id, chore.notes]);

    // kid's note attached to the proof (optional)
    const [proofNote, setProofNote] = useState(chore.proofNote ?? '');
    React.useEffect(() => {
        setProofNote(chore.proofNote ?? '');
    }, [chore.id, chore.proofNote]);

    // parent can tweak points while approving
    const [pointsText, setPointsText] = useState(String(chore.points ?? 0));
    React.useEffect(() => {
        setPointsText(String(chore.points ?? 0));
    }, [chore.id, chore.points]);

    // initial doneBy selection (respect assignment if present)
    const initialDoneByIds: string[] =
        (chore.doneByIds && chore.doneByIds.length > 0
            ? chore.doneByIds
            : chore.assignedToId
                ? [chore.assignedToId]
                : chore.doneById
                    ? [chore.doneById]
                    : defaultDoneById
                        ? [defaultDoneById]
                        : []) ?? [];

    const [selectedDoneByIds, setSelectedDoneByIds] = useState<string[]>(initialDoneByIds);

    React.useEffect(() => {
        const next: string[] =
            (chore.doneByIds && chore.doneByIds.length > 0
                ? chore.doneByIds
                : chore.assignedToId
                    ? [chore.assignedToId]
                    : chore.doneById
                        ? [chore.doneById]
                        : defaultDoneById
                            ? [defaultDoneById]
                            : []) ?? [];
        setSelectedDoneByIds(next);
    }, [chore.id, chore.doneById, chore.doneByIds, chore.assignedToId, defaultDoneById]);

    const lastProof = useMemo(
        () =>
            chore.proofs && chore.proofs.length
                ? chore.proofs[chore.proofs.length - 1]
                : undefined,
        [chore.proofs]
    );

    const doDuplicate = () => onDuplicate(chore.id);
    const doDelete = () => {
        Alert.alert('Delete chore?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    onDelete(chore.id);
                    onClose();
                },
            },
        ]);
    };

    async function playAudioDescription() {
        if (!chore.audioDescriptionUrl) return;
        try {
            const { sound } = await Audio.Sound.createAsync({
                uri: chore.audioDescriptionUrl,
            });
            await sound.playAsync();
        } catch (err) {
            console.error('playAudioDescription error', err);
            Alert.alert('Error', 'Could not play audio description.');
        }
    }

    /**
     * Guard so only the assigned family member can do the chore
     * when the chore is assigned to a specific member.
     */
    function ensureCanModifyAssignedChore(): boolean {
        if (!chore.assignedToId) return true; // not assigned → anyone can do it
        if (!defaultDoneById) return true; // we don't know who is logged in
        if (chore.assignedToId === defaultDoneById) return true; // assigned to me ✅

        Alert.alert(
            'Assigned chore',
            'This chore is assigned to someone else. Only the assigned family member can do it.'
        );
        return false;
    }

    async function ensureCameraPermission() {
        // first check assignment
        if (!ensureCanModifyAssignedChore()) return false;

        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
            alert('Camera permission is required.');
            return false;
        }
        return true;
    }

    async function takePhoto() {
        if (!(await ensureCameraPermission())) return;
        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });
        if (!res.canceled && res.assets?.[0]) {
            onAttachProof(chore.id, { uri: res.assets[0].uri, kind: 'image' });
        }
    }

    async function recordVideo() {
        if (!(await ensureCameraPermission())) return;
        const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.9 as any,
            videoMaxDuration: 30,
        });
        if (!res.canceled && res.assets?.[0]) {
            onAttachProof(chore.id, { uri: res.assets[0].uri, kind: 'video' });
        }
    }

    function removeProof() {
        onAttachProof(chore.id, null);
    }

    const markCompleted = () => {
        // block marking as completed if this user isn't the assignee
        if (!ensureCanModifyAssignedChore()) return;

        if (!chore.proofs || chore.proofs.length === 0) {
            Alert.alert(
                'Proof required',
                'Please upload a photo or video before marking as completed.'
            );
            return;
        }

        if (selectedDoneByIds.length === 0) {
            Alert.alert(
                'Choose who did it',
                'Please select which family members completed this chore.'
            );
            return;
        }

        const cleanedNote = proofNote?.trim() || undefined;

        // SEND ALL SELECTED MEMBERS + optional explanation
        onMarkPending(chore.id, selectedDoneByIds, cleanedNote);
        onClose();
    };

    const approve = () => {
        const cleanedNotes = notes.trim() || undefined;

        // 1) Parse and validate points text
        const parsed = Number(pointsText);
        if (Number.isNaN(parsed) || parsed < 0) {
            Alert.alert(
                'Check points',
                'Please enter a valid number of points (0 or more).'
            );
            return;
        }

        const effectivePoints = parsed;

        // Helper that actually calls onApprove + closes
        const doApprove = () => {
            let updatedPoints: number | undefined;
            if (effectivePoints !== chore.points) {
                updatedPoints = effectivePoints;
            }
            onApprove(chore.id, cleanedNotes, updatedPoints);
            onClose();
        };

        // 2) If approving with 0 points, warn the parent first
        if (effectivePoints === 0) {
            Alert.alert(
                'Approve with 0 points?',
                'This chore will be approved with 0 points. Use this only for chores that should not give a reward (like cleaning up a mess they made).',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Approve with 0 pts',
                        style: 'destructive',
                        onPress: doApprove,
                    },
                ]
            );
            return;
        }

        // 3) Normal path (points > 0)
        doApprove();
    };

    const deny = () => {
        Alert.alert('Deny chore?', 'Are you sure you want to deny this?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Yes, deny',
                style: 'destructive',
                onPress: () => {
                    onDecline(chore.id, notes.trim() || undefined);
                    onClose();
                },
            },
        ]);
    };

    // Done-by label: show all names if multiple
    const doneByName =
        chore.doneByIds && chore.doneByIds.length > 0
            ? chore.doneByIds.map((id) => nameForId(id)).join(', ')
            : nameForId(chore.doneById);

    const approvedByName = nameForId(chore.approvedById);
    const assignedToName = chore.assignedToId ? nameForId(chore.assignedToId) : undefined;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={s.overlay}>
                <View style={s.modal}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        <Text style={s.title}>{chore.title}</Text>
                        <Text style={s.status}>{chore.status.toUpperCase()}</Text>
                        {chore.points > 0 && (
                            <Text style={[s.text, { marginTop: 2 }]}>
                                Worth: <Text style={s.bold}>{chore.points} pts</Text>
                            </Text>
                        )}

                        {chore.description ? (
                            <Text style={[s.text, { marginTop: 6 }]}>{chore.description}</Text>
                        ) : null}

                        {chore.audioDescriptionUrl && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={s.text}>
                                    Audio description{' '}
                                    {chore.audioDescriptionDuration != null && (
                                        <Text style={s.bold}>({chore.audioDescriptionDuration}s)</Text>
                                    )}
                                </Text>
                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 6, alignSelf: 'flex-start' }]}
                                    onPress={playAudioDescription}
                                >
                                    <Text style={s.btnTxt}>Play audio</Text>
                                </Pressable>
                            </View>
                        )}

                        {assignedToName && (
                            <Text style={[s.text, { marginTop: 4 }]}>
                                Assigned to: <Text style={s.bold}>{assignedToName}</Text>
                            </Text>
                        )}

                        {chore.createdByName && (
                            <Text style={[s.text, { marginTop: 2 }]}>
                                Created by: <Text style={s.bold}>{chore.createdByName}</Text>
                            </Text>
                        )}

                        {/* OPEN */}
                        {chore.status === 'open' && (
                            <>
                                {/* assigned: lock to that member */}
                                {isAssigned ? (
                                    <Text style={[s.text, { marginTop: 12 }]}>
                                        This chore is assigned to <Text style={s.bold}>{assignedToName}</Text>.
                                        Only they can complete it.
                                    </Text>
                                ) : (
                                    doneByOptions.length > 0 && (
                                        <>
                                            <Text style={[s.text, { marginTop: 12 }]}>Who did this?</Text>
                                            <View style={s.chipsRow}>
                                                {doneByOptions.map((opt) => {
                                                    const isSelected = selectedDoneByIds.includes(opt.id);
                                                    return (
                                                        <Pressable
                                                            key={opt.id}
                                                            onPress={() =>
                                                                setSelectedDoneByIds((prev) =>
                                                                    prev.includes(opt.id)
                                                                        ? prev.filter((id) => id !== opt.id)
                                                                        : [...prev, opt.id]
                                                                )
                                                            }
                                                            style={[s.chip, isSelected && s.chipSelected]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    s.chipTxt,
                                                                    isSelected && s.chipTxtSelected,
                                                                ]}
                                                            >
                                                                {opt.name}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </>
                                    )
                                )}

                                <Text style={[s.text, { marginTop: 10 }]}>
                                    Upload a quick proof (photo or video) to mark as completed.
                                </Text>

                                <View style={s.row}>
                                    <Pressable style={[s.btn, s.secondary]} onPress={takePhoto}>
                                        <Text style={s.btnTxt}>Take photo</Text>
                                    </Pressable>
                                    <Pressable style={[s.btn, s.secondary]} onPress={recordVideo}>
                                        <Text style={s.btnTxt}>Record video</Text>
                                    </Pressable>
                                </View>

                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === 'image' ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Pressable style={s.removeProof} onPress={removeProof}>
                                            <Text style={s.removeProofTxt}>✕</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {/* optional explanation text for the proof */}
                                <Text style={[s.text, { marginTop: 10 }]}>
                                    Add a short note (optional)
                                </Text>
                                <TextInput
                                    placeholder="What did you do here?"
                                    value={proofNote}
                                    onChangeText={setProofNote}
                                    style={[s.input, { marginTop: 6 }]}
                                    multiline
                                />

                                <View style={s.row}>
                                    <Pressable style={[s.btn, s.primary]} onPress={markCompleted}>
                                        <Text style={[s.btnTxt, s.primaryTxt]}>
                                            Mark as completed
                                        </Text>
                                    </Pressable>
                                    <Pressable style={[s.btn, s.cancel]} onPress={onClose}>
                                        <Text style={[s.btnTxt, s.cancelTxt]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* PENDING */}
                        {chore.status === 'pending' && (
                            <>
                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === 'image' ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                    </View>
                                )}

                                {assignedToName && (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Assigned to: <Text style={s.bold}>{assignedToName}</Text>
                                    </Text>
                                )}

                                {chore.createdByName && (
                                    <Text style={[s.text, { marginTop: 2 }]}>
                                        Created by: <Text style={s.bold}>{chore.createdByName}</Text>
                                    </Text>
                                )}

                                <Text style={[s.text, { marginTop: 6 }]}>
                                    Done by: <Text style={s.bold}>{doneByName}</Text>
                                </Text>
                                <Text style={s.text}>
                                    Time:{' '}
                                    <Text style={s.bold}>
                                        {chore.doneAt
                                            ? new Date(chore.doneAt).toLocaleString()
                                            : '—'}
                                    </Text>
                                </Text>

                                {chore.proofNote ? (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Kid&apos;s note:{' '}
                                        <Text style={s.bold}>{chore.proofNote}</Text>
                                    </Text>
                                ) : null}

                                {isParent && (
                                    <>
                                        <Text style={[s.text, { marginTop: 12 }]}>
                                            Points for this chore
                                        </Text>
                                        <TextInput
                                            value={pointsText}
                                            onChangeText={setPointsText}
                                            keyboardType="number-pad"
                                            style={s.input}
                                        />
                                    </>
                                )}

                                <Text style={[s.text, { marginTop: 12 }]}>Notes</Text>
                                <TextInput
                                    placeholder="Add a note…"
                                    value={notes}
                                    onChangeText={setNotes}
                                    style={s.input}
                                    multiline
                                />

                                {isParent && (
                                    <View style={[s.row, { marginTop: 18 }]}>
                                        <Pressable style={[s.btn, s.cancel]} onPress={deny}>
                                            <Text style={[s.btnTxt, s.cancelTxt]}>Deny</Text>
                                        </Pressable>
                                        <Pressable style={[s.btn, s.primary]} onPress={approve}>
                                            <Text style={[s.btnTxt, s.primaryTxt]}>Approve</Text>
                                        </Pressable>
                                    </View>
                                )}

                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 12 }]}
                                    onPress={onClose}
                                >
                                    <Text style={s.btnTxt}>Cancel</Text>
                                </Pressable>
                            </>
                        )}

                        {/* APPROVED */}
                        {chore.status === 'approved' && (
                            <>
                                {lastProof && (
                                    <View style={s.proof}>
                                        {lastProof.kind === 'image' ? (
                                            <Image source={{ uri: lastProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: lastProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                    </View>
                                )}

                                {assignedToName && (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Assigned to: <Text style={s.bold}>{assignedToName}</Text>
                                    </Text>
                                )}

                                {chore.createdByName && (
                                    <Text style={[s.text, { marginTop: 2 }]}>
                                        Created by: <Text style={s.bold}>{chore.createdByName}</Text>
                                    </Text>
                                )}

                                <Text style={[s.text, { marginTop: 6 }]}>
                                    Done by: <Text style={s.bold}>{doneByName}</Text>
                                </Text>
                                <Text style={s.text}>
                                    Time:{' '}
                                    <Text style={s.bold}>
                                        {chore.doneAt
                                            ? new Date(chore.doneAt).toLocaleString()
                                            : '—'}
                                    </Text>
                                </Text>

                                {chore.proofNote ? (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Kid&apos;s note:{' '}
                                        <Text style={s.bold}>{chore.proofNote}</Text>
                                    </Text>
                                ) : null}

                                <Text style={s.text}>
                                    Approved by: <Text style={s.bold}>{approvedByName}</Text>
                                </Text>
                                <Text style={s.text}>
                                    Approved at:{' '}
                                    <Text style={s.bold}>
                                        {chore.approvedAt
                                            ? new Date(chore.approvedAt).toLocaleString()
                                            : '—'}
                                    </Text>
                                </Text>

                                {chore.notes ? (
                                    <Text style={s.text}>
                                        Notes: <Text style={s.bold}>{chore.notes}</Text>
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 12 }]}
                                    onPress={onClose}
                                >
                                    <Text style={s.btnTxt}>Close</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: '90%',
    },
    title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    status: { fontWeight: '700', color: '#64748b', marginTop: 2 },
    text: { color: '#334155' },
    bold: { fontWeight: '700' },
    row: { flexDirection: 'row', gap: 12, marginTop: 14 },
    btn: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
    primary: { backgroundColor: '#2563eb' },
    primaryTxt: { color: '#fff', fontWeight: '700' },
    secondary: { backgroundColor: '#f1f5f9' },
    cancel: { backgroundColor: '#fee2e2' },
    cancelTxt: { color: '#b91c1c', fontWeight: '700' },
    btnTxt: { fontWeight: '700', color: '#1e293b' },
    proof: { marginTop: 12 },
    media: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        backgroundColor: '#e2e8f0',
    },
    removeProof: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 16,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeProofTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 10,
        minHeight: 44,
        textAlignVertical: 'top',
        backgroundColor: '#fff',
    },

    // “done by” chips
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f9fafb',
    },
    chipSelected: {
        backgroundColor: '#2563eb15',
        borderColor: '#2563eb',
    },
    chipTxt: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    chipTxtSelected: {
        color: '#1d4ed8',
    },
});
