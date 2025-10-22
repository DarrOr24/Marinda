import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export type Member = { id: string; name: string; role?: 'mom' | 'dad' | 'child' | 'teen' };

export default function MemberAvatar({ member, index = 0 }: { member: Member; index?: number }) {
    const { iconName, iconColor, bgColor } = getStyleForMember(member, index);

    return (
        <View style={[styles.avatarCircle, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
        </View>
    );
}

function getStyleForMember(m: Member, index: number) {
    const childColors = ['#EAF9E8', '#E3EEFF', '#FDF4FF'];

    switch (m.role) {
        case 'mom':
            return {
                iconName: 'face-woman',
                iconColor: '#db2777',
                bgColor: '#fde2f3',
            };
        case 'dad':
            return {
                iconName: 'face-man',
                iconColor: '#2563eb',
                bgColor: '#dbeafe',
            };
        case 'teen':
            return {
                iconName: 'emoticon-cool-outline',
                iconColor: '#f59e0b',
                bgColor: '#fef3c7',
            };
        case 'child':
        default:
            return {
                iconName: 'baby-face-outline',
                iconColor: '#22c55e',
                bgColor: childColors[index % childColors.length],
            };
    }
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
