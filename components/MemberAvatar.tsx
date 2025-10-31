import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export type Member = {
    id: string;
    name: string;
    role?: 'mom' | 'dad' | 'child' | 'teen';
    color?: string; // color passed from member definition
};

export default function MemberAvatar({
    member,
    index = 0,
}: {
    member: Member;
    index?: number;
}) {
    const { iconName, iconColor, bgColor } = getStyleForMember(member, index);

    return (
        <View style={[styles.avatarCircle, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
        </View>
    );
}

function getStyleForMember(m: Member, index: number) {
    const fallbackChildColors = ['#EAF9E8', '#E3EEFF', '#FDF4FF'];

    const iconColor = m.color ?? '#2563eb'; // main member color
    const bgColor = withAlpha(iconColor, 0.18); // lighter background version

    let iconName = 'account-outline';
    switch (m.role) {
        case 'mom':
            iconName = 'face-woman';
            break;
        case 'dad':
            iconName = 'face-man';
            break;
        case 'teen':
            iconName = 'emoticon-cool-outline';
            break;
        case 'child':
        default:
            iconName = 'baby-face-outline';
            break;
    }

    return { iconName, iconColor, bgColor };
}

// Utility: add alpha channel to hex color (#rrggbb -> rgba-like transparency)
function withAlpha(hex: string, alpha = 0.15) {
    if (!/^#([0-9a-f]{6})$/i.test(hex)) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
