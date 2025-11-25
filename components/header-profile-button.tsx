// components/header-profile-button.tsx
import { useAuthContext } from '@/hooks/use-auth-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'

export default function HeaderProfileButton() {
    const { isLoggedIn, signOut } = useAuthContext()
    const [open, setOpen] = useState(false)

    const handleLogout = () => {
        Alert.alert('Log out?', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log out',
                onPress: async () => {
                    try {
                        await signOut?.()
                    } catch (err: any) {
                        Alert.alert('Sign out failed', err?.message)
                    }
                },
            },
        ])
    }

    const onPressIcon = () => {
        if (!isLoggedIn) {
            return Alert.alert(
                'Welcome to Marinda 💫',
                'Sign in or create your family account to continue',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log in', onPress: () => router.push('/login') },
                    { text: 'Create Account', onPress: () => console.log('create') },
                ]
            )
        }

        setOpen(true)
    }

    return (
        <>
            {/* HeaderRight icon */}
            <TouchableOpacity onPress={onPressIcon}>
                <MaterialCommunityIcons
                    name="account-circle-outline"
                    size={34}
                    color={isLoggedIn ? '#2563eb' : '#9ca3af'}
                />
            </TouchableOpacity>

            {/* Dropdown Modal */}
            <Modal
                transparent
                visible={open}
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setOpen(false)}
                />

                <View style={styles.menu}>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            setOpen(false)
                            console.log('settings')
                        }}
                    >
                        <MaterialCommunityIcons name="cog-outline" size={20} color="#334155" />
                        <Text style={styles.itemText}>Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.item} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="#dc2626" />
                        <Text style={[styles.itemText, { color: '#dc2626' }]}>
                            Log out
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    )
}


const styles = StyleSheet.create({
    menu: {
        position: 'absolute',
        top: 60,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        width: 160,
        paddingVertical: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    itemText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '600',
    },
})
