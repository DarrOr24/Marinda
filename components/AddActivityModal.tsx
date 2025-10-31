import type { Member } from "@/components/MemberAvatar";
import { useAuthContext } from "@/hooks/use-auth-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ── Types (snake_case for Supabase) ─────────────────────────────────────
export type ActivityStatus = "pending" | "approved";

export type NewActivityForm = {
    title: string;
    day_index: number;          // 0..6 within the visible week
    time: string;               // "18:00"  (REQUIRED)
    location?: string;          // we label it "Place" in UI
    money?: number;
    ride_needed?: boolean;
    present_needed?: boolean;
    babysitter_needed?: boolean;
    participants_member_ids?: string[]; // 👈 NEW
    other?: string;
    status: ActivityStatus;     // default 'pending'
    created_by: string;         // auth user id
    created_by_name: string;    // resolved from profile/user/email
    member_color: string;       // for calendar tinting
    created_at: string;         // ISO
};

// ── Helpers ────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDisplayName = (p?: any, u?: any) => {
    const full = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
    const metaName = u?.user_metadata?.full_name || u?.user_metadata?.name;
    if (metaName) return metaName;
    if (u?.email) return u.email;
    return "Someone";
};

// If you later store member color on profile, swap this for that value.
function pickMemberColor() {
    return "#2563eb"; // blue
}

// ── Props ──────────────────────────────────────────────────────────────
type Props = {
    visible: boolean;
    onClose: () => void;
    onSave: (form: NewActivityForm) => void;
    default_day_index?: number; // parent can pass today's index in the visible week
    week_days: Date[];          // 7 dates for the visible week
    mode?: "create" | "edit";
    submitLabel?: string;
    initial?: Partial<NewActivityForm>;
    members: Member[];          // 👈 NEW: for "Who’s going?"
};

export default function AddActivityModal({
    visible,
    onClose,
    onSave,
    default_day_index = 0,
    week_days,
    mode = "create",
    submitLabel,
    initial,
    members,
}: Props) {
    const { profile, user, session } = useAuthContext() as any;
    const authUser = user ?? session?.user;

    // animations
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(40)).current;

    // form state
    const [dayIndex, setDayIndex] = useState(default_day_index);
    const [title, setTitle] = useState("");
    const [time, setTime] = useState("");
    const [location, setLocation] = useState("");
    const [money, setMoney] = useState("");
    const [rideNeeded, setRideNeeded] = useState(false);
    const [presentNeeded, setPresentNeeded] = useState(false);
    const [babysitterNeeded, setBabysitterNeeded] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // 👈 NEW
    const [other, setOther] = useState("");

    // keep default in sync when modal opens with a different week / edit mode
    useEffect(() => {
        if (visible) {
            if (initial?.day_index !== undefined) {
                setDayIndex(initial.day_index);
            } else {
                setDayIndex(default_day_index);
            }
            if (initial) {
                setTitle(initial.title ?? "");
                setTime(initial.time ?? "");
                setLocation(initial.location ?? "");
                setMoney(
                    initial.money !== undefined && initial.money !== null
                        ? String(initial.money)
                        : ""
                );
                setRideNeeded(!!initial.ride_needed);
                setPresentNeeded(!!initial.present_needed);
                setBabysitterNeeded(!!initial.babysitter_needed);
                setSelectedIds(initial.participants_member_ids ?? []); // 👈 NEW
                setOther(initial.other ?? "");
            }
        }
    }, [visible, default_day_index, initial]);

    // animate in/out
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 180,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 40, duration: 140, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const canSave = title.trim().length > 0 && time.trim().length > 0;

    function reset() {
        setTitle("");
        setTime("");
        setLocation("");
        setMoney("");
        setRideNeeded(false);
        setPresentNeeded(false);
        setBabysitterNeeded(false);
        setSelectedIds([]); // 👈 NEW
        setOther("");
    }

    function toggleMember(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function handleSave() {
        if (!canSave) return;

        const whoId = profile?.id ?? authUser?.id ?? "guest";
        const whoName = getDisplayName(profile, authUser);
        const color = pickMemberColor();

        const payload: NewActivityForm = {
            title: title.trim(),
            day_index: dayIndex,
            time: time.trim(),
            location: location.trim() || undefined,
            money: money ? Number(money) : undefined,
            ride_needed: rideNeeded || undefined,
            present_needed: presentNeeded || undefined,
            babysitter_needed: babysitterNeeded || undefined,
            participants_member_ids: selectedIds.length ? selectedIds : undefined, // 👈 NEW
            other: other.trim() || undefined,
            status: initial?.status ?? "pending",
            created_by: initial?.created_by ?? whoId,
            created_by_name: initial?.created_by_name ?? whoName,
            member_color: initial?.member_color ?? color,
            created_at: initial?.created_at ?? new Date().toISOString(),
        };

        onSave(payload);
        onClose();
        if (mode === "create") reset();
    }

    const dayChips = useMemo(() => {
        return week_days.map((d, idx) => {
            const label = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
            return { idx, label };
        });
    }, [week_days]);

    const quickTimes = ["15:30", "17:00", "18:30", "19:00"];

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backdrop, { opacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>{mode === "edit" ? "Edit Activity ✏️" : "New Activity ✨"}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={22} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/* Day selector (0..6) */}
                <Text style={styles.label}>📅 Date</Text>
                <View style={styles.chips}>
                    {dayChips.map(({ idx, label }) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.chip, idx === dayIndex && styles.chipActive]}
                            onPress={() => setDayIndex(idx)}
                        >
                            <Text style={[styles.chipTxt, idx === dayIndex && styles.chipTxtActive]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Required fields */}
                <Text style={styles.label}>🏷️ Title *</Text>
                <TextInput
                    placeholder="e.g., Soccer practice ⚽️"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    autoCapitalize="words"
                />

                <Text style={styles.label}>🕒 Time *</Text>
                <View style={styles.fieldRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#475569" />
                    <TextInput
                        placeholder="e.g., 18:00"
                        value={time}
                        onChangeText={setTime}
                        style={styles.input}
                    />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    {quickTimes.map((t) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setTime(t)}
                            style={[styles.chip, time === t && styles.chipActive]}
                        >
                            <Text style={[styles.chipTxt, time === t && styles.chipTxtActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Optional fields */}
                <Text style={styles.label}>📍 Place</Text>
                <View style={styles.fieldRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#475569" />
                    <TextInput
                        placeholder="e.g., Community Center"
                        value={location}
                        onChangeText={setLocation}
                        style={styles.input}
                    />
                </View>

                <Text style={styles.label}>💵 $</Text>
                <View style={styles.fieldRow}>
                    <MaterialCommunityIcons name="cash" size={18} color="#475569" />
                    <TextInput
                        placeholder="e.g., 15"
                        keyboardType="numeric"
                        value={money}
                        onChangeText={setMoney}
                        style={styles.input}
                    />
                </View>

                {/* Friendly emoji chips toggles */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                        onPress={() => setRideNeeded((v) => !v)}
                        style={[styles.chip, rideNeeded && styles.chipActive]}
                    >
                        <Text style={[styles.chipTxt, rideNeeded && styles.chipTxtActive]}>
                            🚗 Ride {rideNeeded ? "✅" : "❌"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setPresentNeeded((v) => !v)}
                        style={[styles.chip, presentNeeded && styles.chipActive]}
                    >
                        <Text style={[styles.chipTxt, presentNeeded && styles.chipTxtActive]}>
                            🎁 Present {presentNeeded ? "✅" : "❌"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setBabysitterNeeded((v) => !v)}
                        style={[styles.chip, babysitterNeeded && styles.chipActive]}
                    >
                        <Text style={[styles.chipTxt, babysitterNeeded && styles.chipTxtActive]}>
                            🍼 Babysitter {babysitterNeeded ? "✅" : "❌"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 👥 Who's going? */}
                <Text style={styles.label}>👥 Who’s going?</Text>
                <View style={styles.memberChips}>
                    {members.map((m) => {
                        const active = selectedIds.includes(m.id);
                        return (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => toggleMember(m.id)}
                                style={[styles.memberChip, active && styles.memberChipActive]}
                            >
                                <View style={[styles.memberDot, { backgroundColor: (m as any).color || "#94a3b8" }]} />
                                <Text style={[styles.memberTxt, active && styles.memberTxtActive]}>{m.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.label}>📝 Notes</Text>
                <TextInput
                    placeholder="Add a note…"
                    value={other}
                    onChangeText={setOther}
                    style={[styles.input, { height: 80 }]}
                    multiline
                />

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
                        <Text style={styles.btnGhostTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, canSave ? styles.btnPrimary : styles.btnDisabled]}
                        onPress={handleSave}
                        disabled={!canSave}
                    >
                        <Text style={canSave ? styles.btnPrimaryTxt : styles.btnDisabledTxt}>
                            {submitLabel ?? (mode === "edit" ? "Update" : "Save")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

    label: {
        fontSize: 13,
        color: "#475569",
        marginTop: 10,
        marginBottom: 4,
        fontWeight: "700",
    },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: "#f9fafb",
    },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        borderWidth: 2,
        borderColor: "#cbd5e1",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    chipActive: {
        borderColor: "#2563eb",
        backgroundColor: "#eff6ff",
    },
    chipTxt: { color: "#0f172a", fontWeight: "800" },
    chipTxtActive: { color: "#1d4ed8" },

    // Member chips
    memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    memberChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 2,
        borderColor: "#cbd5e1",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#fff",
    },
    memberChipActive: {
        borderColor: "#2563eb",
        backgroundColor: "#eff6ff",
    },
    memberDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    memberTxt: { color: "#0f172a", fontWeight: "800" },
    memberTxtActive: { color: "#1d4ed8" },

    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
    btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18 },
    btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#e5e7eb" },
    btnGhostTxt: { color: "#0f172a", fontWeight: "700" },
    btnPrimary: { backgroundColor: "#2563eb" },
    btnPrimaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
    btnDisabled: { backgroundColor: "#e5e7eb" },
    btnDisabledTxt: { color: "#64748b", fontWeight: "800", fontSize: 16 },
});
