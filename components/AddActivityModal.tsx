// components/AddActivityModal.tsx
import { useAuthContext } from "@/hooks/use-auth-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
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
    location?: string;
    money?: number;
    ride_needed?: boolean;
    present_needed?: boolean;
    babysitter_needed?: boolean;
    other?: string;
    status: ActivityStatus;     // default 'pending'
    created_by: string;         // auth user id
    created_by_name: string;    // resolved from profile/user/email
    member_color: string;       // for calendar tinting
    created_at: string;         // ISO
};

// ── Helpers (same spirit as groceries) ─────────────────────────────────
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
// For now, a stable default tint:
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
};

export default function AddActivityModal({
    visible,
    onClose,
    onSave,
    default_day_index = 0,
    week_days,
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
    const [other, setOther] = useState("");

    // keep default in sync when modal opens with a different week
    useEffect(() => {
        if (visible) setDayIndex(default_day_index);
    }, [visible, default_day_index]);

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
        setOther("");
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
            other: other.trim() || undefined,
            status: "pending",
            created_by: whoId,
            created_by_name: whoName,
            member_color: color,
            created_at: new Date().toISOString(),
        };

        onSave(payload);
        onClose();
        reset();
    }

    const dayChips = useMemo(() => {
        return week_days.map((d, idx) => {
            const label = `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
            return { idx, label };
        });
    }, [week_days]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backdrop, { opacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>New Activity</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={22} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/* Day selector (0..6) */}
                <Text style={styles.label}>Date</Text>
                <View style={styles.chips}>
                    {dayChips.map(({ idx, label }) => (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.chip,
                                idx === dayIndex && styles.chipActive,
                            ]}
                            onPress={() => setDayIndex(idx)}
                        >
                            <Text style={[styles.chipTxt, idx === dayIndex && styles.chipTxtActive]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Required fields */}
                <Text style={styles.label}>Title *</Text>
                <TextInput
                    placeholder="e.g., Soccer practice"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                />

                <Text style={styles.label}>Time *</Text>
                <View style={styles.fieldRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#475569" />
                    <TextInput
                        placeholder="e.g., 18:00"
                        value={time}
                        onChangeText={setTime}
                        style={styles.input}
                    />
                </View>

                {/* Optional fields */}
                <Text style={styles.label}>Location</Text>
                <View style={styles.fieldRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#475569" />
                    <TextInput
                        placeholder="e.g., Community Center"
                        value={location}
                        onChangeText={setLocation}
                        style={styles.input}
                    />
                </View>

                <Text style={styles.label}>Money</Text>
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

                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Ride needed</Text>
                    <Switch value={rideNeeded} onValueChange={setRideNeeded} />
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Present needed</Text>
                    <Switch value={presentNeeded} onValueChange={setPresentNeeded} />
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Babysitter needed</Text>
                    <Switch value={babysitterNeeded} onValueChange={setBabysitterNeeded} />
                </View>

                <Text style={styles.label}>Other</Text>
                <TextInput
                    placeholder="Notes / extra info"
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
                        <Text style={canSave ? styles.btnPrimaryTxt : styles.btnDisabledTxt}>Save</Text>
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
    title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },

    label: {
        fontSize: 12,
        color: "#475569",
        marginTop: 8,
        marginBottom: 4,
    },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 15,
        backgroundColor: "#f9fafb",
    },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#fff",
    },
    chipActive: {
        borderColor: "#2563eb",
        backgroundColor: "#eff6ff",
    },
    chipTxt: { color: "#0f172a", fontWeight: "600" },
    chipTxtActive: { color: "#1d4ed8" },

    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    switchLabel: { fontSize: 15, color: "#0f172a" },

    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
    btn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
    btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#e5e7eb" },
    btnGhostTxt: { color: "#0f172a", fontWeight: "600" },
    btnPrimary: { backgroundColor: "#2563eb" },
    btnPrimaryTxt: { color: "#fff", fontWeight: "700" },
    btnDisabled: { backgroundColor: "#e5e7eb" },
    btnDisabledTxt: { color: "#64748b", fontWeight: "700" },
});
