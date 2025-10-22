import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login, logout } from '../src/authSlice';
import type { RootState } from '../src/store';

export default function HeaderProfileButton() {
    const dispatch = useDispatch();
    const isLoggedIn = useSelector((s: RootState) => s.auth.isLoggedIn);

    const onPress = () => {
        console.log(isLoggedIn);
        if (!isLoggedIn) {
            Alert.alert(
                'Welcome to Marinda 💫',
                'Sign in or create your family account to continue',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log in', onPress: () => dispatch(login()) },
                    { text: 'Create Account', onPress: () => console.log('TODO: go to signup') },
                ]
            );
        } else {
            Alert.alert(
                'Log out?',
                'Are you sure you want to log out?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log out', onPress: () => dispatch(logout()) },
                ]
            );
        }
    };

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
    );
}

const styles = StyleSheet.create({
    wrapper: {},
});
