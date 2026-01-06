// components/chore-detail-modal.tsx
import { ChipSelector } from '@/components/chip-selector';
import MediaPicker, { PickedMedia } from '@/components/media-picker';
import { ChoreView, Proof } from '@/lib/chores/chores.types';
import { Role } from '@/lib/members/members.types';
import { Audio, ResizeMode, Video } from 'expo-av';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



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

    const insets = useSafeAreaInsets();
    const isParent = currentRole === 'MOM' || currentRole === 'DAD';

    // 🔹 Normalize assignees: plural-only
    const assignedIds: string[] = (chore.assignedToIds ?? []).filter(Boolean);

    const assignedNames: string[] =
        (chore.assignedToNames && chore.assignedToNames.length > 0)
            ? chore.assignedToNames
            : assignedIds.map((id) => nameForId(id));

    const assignedLabel =
        assignedNames && assignedNames.length > 0
            ? assignedNames.join(', ')
            : undefined;

    const isAssigned = assignedIds.length > 0;

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

    // 🔹 initial doneBy selection (respect existing, then assignment, then default)
    const computeInitialDoneByIds = (): string[] => {
        if (chore.doneByIds && chore.doneByIds.length > 0) {
            return [...chore.doneByIds];
        }

        if (assignedIds.length > 0) {
            return [...assignedIds];
        }

        return defaultDoneById ? [defaultDoneById] : [];
    };



    const [selectedDoneByIds, setSelectedDoneByIds] = useState<string[]>(
        computeInitialDoneByIds()
    );

    React.useEffect(() => {
        setSelectedDoneByIds(computeInitialDoneByIds());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        chore.id,
        chore.doneByIds,
        chore.assignedToIds,
        defaultDoneById,
    ]);

    const beforeProof = chore.proofs?.find((p) => p.type === "BEFORE");
    const afterProof = chore.proofs?.find((p) => p.type === "AFTER");

    function addBefore(uri: string, kind: "image" | "video") {
        onAttachProof(chore.id, { uri, kind, type: "BEFORE" });
    }

    function addAfter(uri: string, kind: "image" | "video") {
        onAttachProof(chore.id, { uri, kind, type: "AFTER" });
    }

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
     * Guard so only assigned family members can do the chore
     * when the chore is assigned to specific member(s).
     */
    function ensureCanModifyAssignedChore(): boolean {
        if (!isAssigned) return true;            // not assigned → anyone can do it
        if (!defaultDoneById) return true;      // we don't know who is logged in

        // If this logged-in member is one of the assignees → allowed
        if (assignedIds.includes(defaultDoneById)) return true;

        // Parent: allow, but explain that points go to the assigned kids
        if (isParent) {
            Alert.alert(
                'Assigned chore',
                assignedLabel
                    ? `This chore is assigned to ${assignedLabel}. If you mark it as completed, the points will go to the assigned member(s).`
                    : 'This chore is assigned. If you mark it as completed, the points will go to the assigned member(s).'
            );
            return true;
        }

        // Non-parent & not assigned → still blocked
        Alert.alert(
            'Assigned chore',
            'This chore is assigned to someone else. Only assigned family members can complete it.'
        );
        return false;
    }
    function onPickBefore(media: PickedMedia | null) {
        if (!media) {
            removeBefore();
            return;
        }
        addBefore(media.uri, media.kind);
    }

    function onPickAfter(media: PickedMedia | null) {
        if (!media) {
            removeAfter();
            return;
        }
        addAfter(media.uri, media.kind);
    }


    function removeBefore() {
        onAttachProof(chore.id, { uri: "", kind: "image", type: "BEFORE" } as any);
    }
    function removeAfter() {
        onAttachProof(chore.id, { uri: "", kind: "image", type: "AFTER" } as any);
    }

    const markCompleted = () => {
        // block marking as completed if this user isn't assigned
        if (!ensureCanModifyAssignedChore()) return;

        if (!afterProof) {
            Alert.alert(
                "Proof required",
                "Please upload an AFTER photo or video before marking as completed."
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
            Alert.alert('Check points', 'Please enter a valid number of points (0 or more).');
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
            : '—';

    const approvedByName = nameForId(chore.approvedById);

    function requestClose() {
        // Only warn about unsaved changes in OPEN state
        if (chore.status !== 'open') {
            onClose();
            return;
        }

        const hasUnsaved =
            beforeProof ||
            afterProof ||
            (proofNote && proofNote.trim().length > 0);

        if (!hasUnsaved) {
            onClose();
            return;
        }

        Alert.alert(
            "Discard changes?",
            "You added photos or notes. If you close now, these will be lost.",
            [
                { text: "Keep Editing", style: "cancel" },
                { text: "Discard", style: "destructive", onPress: onClose }
            ]
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                style={[s.overlay, { paddingBottom: Platform.OS === 'android' ? insets.bottom : 0 }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
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

                        {assignedLabel && (
                            <Text style={[s.text, { marginTop: 4 }]}>
                                Assigned to: <Text style={s.bold}>{assignedLabel}</Text>
                            </Text>
                        )}

                        {chore.createdByName && (
                            <Text style={[s.text, { marginTop: 2 }]}>
                                Created by: <Text style={s.bold}>{chore.createdByName}</Text>
                            </Text>
                        )}

                        {/* OPEN */}
                        {chore.status === "open" && (
                            <>
                                {isAssigned && (
                                    <Text style={[s.text, { marginTop: 12 }]}>
                                        This chore is assigned to <Text style={s.bold}>{assignedLabel}</Text>.
                                        Only assigned family members can complete it.
                                    </Text>
                                )}

                                {/* WHO DID IT */}
                                {doneByOptions.length > 0 && (
                                    <>
                                        <Text style={[s.text, { marginTop: 12 }]}>Who did this?</Text>
                                        <ChipSelector
                                            multiple
                                            options={(isAssigned
                                                ? doneByOptions.filter((opt) => assignedIds.includes(opt.id))
                                                : doneByOptions
                                            ).map(opt => ({
                                                label: opt.name,
                                                value: opt.id,
                                            }))}
                                            values={selectedDoneByIds}
                                            onChange={setSelectedDoneByIds}
                                            style={{ marginTop: 8 }}
                                        />

                                    </>
                                )}

                                {/* BEFORE */}
                                <Text style={[s.text, { marginTop: 16 }]}>
                                    Before (optional)
                                </Text>

                                <MediaPicker
                                    label=""
                                    value={
                                        beforeProof?.uri
                                            ? { uri: beforeProof.uri, kind: beforeProof.kind }
                                            : null
                                    }
                                    onChange={onPickBefore}
                                    allowImage={true}
                                    allowVideo={true}
                                    /* disable gallery options */
                                    pickFromLibrary={false}
                                />


                                {/* AFTER */}
                                <Text style={[s.text, { marginTop: 16 }]}>
                                    After (required)
                                </Text>

                                <MediaPicker
                                    label=""
                                    value={
                                        afterProof?.uri
                                            ? { uri: afterProof.uri, kind: afterProof.kind }
                                            : null
                                    }
                                    onChange={onPickAfter}
                                    allowImage={true}
                                    allowVideo={true}
                                    pickFromLibrary={false}
                                />

                                {/* NOTE */}
                                <Text style={[s.text, { marginTop: 10 }]}>
                                    Add a short note (optional)
                                </Text>
                                <TextInput
                                    placeholder="What did you do here?"
                                    value={proofNote}
                                    onChangeText={setProofNote}
                                    style={[s.input, { marginTop: 6 }]}
                                    multiline
                                    submitBehavior="submit"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                />

                                {/* SUBMIT */}
                                <View style={s.row}>
                                    <Pressable style={[s.btn, s.primary]} onPress={markCompleted}>
                                        <Text style={[s.btnTxt, s.primaryTxt]}>Mark as completed</Text>
                                    </Pressable>
                                    <Pressable style={[s.btn, s.cancel]} onPress={requestClose}>

                                        <Text style={[s.btnTxt, s.cancelTxt]}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}

                        {/* PENDING */}
                        {chore.status === "pending" && (
                            <>
                                {/* BEFORE */}
                                {beforeProof?.uri && (
                                    <View style={s.proof}>
                                        {beforeProof.kind === "image" ? (
                                            <Image source={{ uri: beforeProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: beforeProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Text style={s.text}>Before</Text>
                                    </View>
                                )}

                                {/* AFTER */}
                                {afterProof?.uri && (
                                    <View style={s.proof}>
                                        {afterProof.kind === "image" ? (
                                            <Image source={{ uri: afterProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: afterProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Text style={s.text}>After</Text>
                                    </View>
                                )}

                                {assignedLabel && (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Assigned to: <Text style={s.bold}>{assignedLabel}</Text>
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
                                    Time:{" "}
                                    <Text style={s.bold}>
                                        {chore.doneAt ? new Date(chore.doneAt).toLocaleString() : "—"}
                                    </Text>
                                </Text>

                                {chore.proofNote ? (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Kid’s note: <Text style={s.bold}>{chore.proofNote}</Text>
                                    </Text>
                                ) : null}

                                {isParent && (
                                    <>
                                        <Text style={[s.text, { marginTop: 12 }]}>Points for this chore</Text>
                                        <TextInput
                                            value={pointsText}
                                            onChangeText={setPointsText}
                                            keyboardType="number-pad"
                                            style={s.input}
                                            returnKeyType="done"
                                            submitBehavior="submit"
                                            onSubmitEditing={() => Keyboard.dismiss()}
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
                                    submitBehavior="submit"
                                    onSubmitEditing={() => Keyboard.dismiss()}
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
                                    onPress={requestClose}
                                >

                                    <Text style={s.btnTxt}>Cancel</Text>
                                </Pressable>
                            </>
                        )}

                        {/* APPROVED */}
                        {chore.status === "approved" && (
                            <>
                                {/* BEFORE */}
                                {beforeProof?.uri && (
                                    <View style={s.proof}>
                                        {beforeProof.kind === "image" ? (
                                            <Image source={{ uri: beforeProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: beforeProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Text style={s.text}>Before</Text>
                                    </View>
                                )}

                                {/* AFTER */}
                                {afterProof?.uri && (
                                    <View style={s.proof}>
                                        {afterProof.kind === "image" ? (
                                            <Image source={{ uri: afterProof.uri }} style={s.media} />
                                        ) : (
                                            <Video
                                                source={{ uri: afterProof.uri }}
                                                style={s.media}
                                                useNativeControls
                                                resizeMode={ResizeMode.CONTAIN}
                                            />
                                        )}
                                        <Text style={s.text}>After</Text>
                                    </View>
                                )}

                                {assignedLabel && (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Assigned to: <Text style={s.bold}>{assignedLabel}</Text>
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
                                    Time:{" "}
                                    <Text style={s.bold}>
                                        {chore.doneAt ? new Date(chore.doneAt).toLocaleString() : "—"}
                                    </Text>
                                </Text>

                                {chore.proofNote ? (
                                    <Text style={[s.text, { marginTop: 6 }]}>
                                        Kid’s note: <Text style={s.bold}>{chore.proofNote}</Text>
                                    </Text>
                                ) : null}

                                <Text style={s.text}>
                                    Approved by: <Text style={s.bold}>{approvedByName}</Text>
                                </Text>

                                <Text style={s.text}>
                                    Approved at:{" "}
                                    <Text style={s.bold}>
                                        {chore.approvedAt ? new Date(chore.approvedAt).toLocaleString() : "—"}
                                    </Text>
                                </Text>

                                {chore.notes ? (
                                    <Text style={s.text}>
                                        Notes: <Text style={s.bold}>{chore.notes}</Text>
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={[s.btn, s.secondary, { marginTop: 12 }]}
                                    onPress={requestClose}
                                >
                                    <Text style={s.btnTxt}>Close</Text>
                                </Pressable>
                            </>
                        )}

                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
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
});
