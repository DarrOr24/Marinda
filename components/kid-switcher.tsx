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
import { memberDisplayName } from "@/utils/format.utils";

type KidSwitcherProps = {
  kids: FamilyMember[];              // full family list, includes adults → we will filter inside
  selectedKidId: string | null;
  onSelectKid: (kidId: string) => void;
  triggerVariant?: "button" | "avatarOnly";
  buttonLabel?: string;
  buttonIconName?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

export function KidSwitcher({
  kids,
  selectedKidId,
  onSelectKid,
  triggerVariant = "button",
  buttonLabel = "Switch Kid/Teen",
  buttonIconName = "account-switch",
}: KidSwitcherProps) {
  const [open, setOpen] = useState(false);

  // ✅ FILTER ONLY TEENS + KIDS
  const onlyKids = kids.filter(
    (m) => m.role === "CHILD" || m.role === "TEEN"
  );

  // Prefer the selected kid, otherwise fall back to the first available kid.
  const activeKid = onlyKids.find((k) => k.id === selectedKidId) || onlyKids[0] || null;

  return (
    <View style={{ position: "relative" }}>
      {triggerVariant === "avatarOnly" ? (
        <Pressable style={styles.avatarOnlyButton} onPress={() => setOpen((p) => !p)}>
          <View style={styles.avatarOnlyAvatarBox}>
            <MemberAvatar memberId={activeKid.id} size="md" />
          </View>
        </Pressable>
      ) : (
        <Pressable style={styles.button} onPress={() => setOpen((p) => !p)}>
          <MaterialCommunityIcons
            name={buttonIconName}
            size={18}
            color="#334155"
          />
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      )}

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
          styles.dropdownForButton,
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
                  {memberDisplayName(kid)}
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
  avatarOnlyButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  avatarOnlyAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
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
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 4,
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownForButton: {
    top: 38,
    left: 0,
    minWidth: 160,
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
