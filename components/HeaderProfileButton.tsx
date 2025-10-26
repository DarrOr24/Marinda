import { useAuthContext } from '@/hooks/use-auth-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React from 'react'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'

export default function HeaderProfileButton() {
    const { isLoggedIn, signOut } = useAuthContext()

    const onPress = () => {
        if (!isLoggedIn) {
            Alert.alert(
                'Welcome to Marinda 💫',
                'Sign in or create your family account to continue',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Log in',
                        onPress: () => {
                            router.push('/login')
                        },
                    },
                    {
                        text: 'Create Account',
                        onPress: () => {
                            // TODO: navigate to sign-up screen or show signup modal
                            console.log('Navigate to create account screen')
                        },
                    },
                ]
            )
        } else {
            Alert.alert('Log out?', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log out',
                    onPress: async () => {
                        try {
                            await signOut?.()
                        } catch (err: any) {
                            console.error('Error signing out:', err)
                            Alert.alert('Sign out failed', err?.message ?? 'Please try again.')
                        }
                    },
                },
            ])
        }
    }

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity onPress={onPress}>
                <MaterialCommunityIcons
                    name="account-circle-outline"
                    size={34}
                    color={isLoggedIn ? '#2563eb' : '#9ca3af'}
                />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {},
})
