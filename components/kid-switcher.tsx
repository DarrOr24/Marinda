// components/kid-switcher.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MemberAvatar } from "@/components/avatar/member-avatar";
import type { FamilyMember } from "@/lib/members/members.types";

type KidSwitcherProps = {
  kids: FamilyMember[];              // full family list, includes adults → we will filter inside
  selectedKidId: string | null;
  onSelectKid: (kidId: string) => void;
};

export function KidSwitcher({ kids, selectedKidId, onSelectKid }: KidSwitcherProps) {
  const [open, setOpen] = useState(false);

  // ✅ FILTER ONLY TEENS + KIDS
  const onlyKids = kids.filter(
    (m) => m.role === "CHILD" || m.role === "TEEN"
  );

  // If selected kid exists, use it. Otherwise none.
  const activeKid = onlyKids.find((k) => k.id === selectedKidId) || null;

  return (
    <View style={{ position: "relative" }}>
      {/* BUTTON */}
      <Pressable style={styles.button} onPress={() => setOpen((p) => !p)}>
        <MaterialCommunityIcons
          name="account-switch"
          size={18}
          color="#334155"
        />
        {/* 🆕 GENERIC TEXT */}
        <Text style={styles.buttonText}>
          Switch Kid/Teen
        </Text>
      </Pressable>

      {/* CLICK OUTSIDE TO CLOSE */}
      {open && (
        <Pressable
          style={styles.overlay}
          onPress={() => setOpen(false)}
        />
      )}

      {/* 🔁 ALWAYS-MOUNTED DROPDOWN (avatars stay mounted) */}
      <View
        style={[
          styles.dropdown,
          !open && styles.dropdownHidden, // hide when closed
        ]}
        pointerEvents={open ? "auto" : "none"}
      >
        {/* NO KIDS → SHOW MESSAGE */}
        {onlyKids.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No kids/teens yet</Text>
          </View>
        ) : (
          onlyKids.map((kid) => (
            <Pressable
              key={kid.id}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              onPress={() => {
                onSelectKid(kid.id);
                setOpen(false);
              }}
            >
              <View style={styles.row}>
                <MemberAvatar memberId={kid.id} size="sm" />
                <Text style={styles.optionText}>
                  {kid.profile?.first_name}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e5edff",
    gap: 4,
  },
  buttonText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },

  /* OVERLAY BEHIND DROPDOWN */
  overlay: {
    position: "absolute",
    top: -2000,   // full screen catch
    left: -2000,
    width: 5000,
    height: 5000,
    zIndex: 10,
  },

  dropdown: {
    position: "absolute",
    top: 38,
    left: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 160,
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownHidden: {
    opacity: 0,
    transform: [{ scaleY: 0.95 }],
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionPressed: {
    backgroundColor: "#eef2f7",
  },
  optionText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  /* NO KIDS STATE */
  emptyState: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },
});
