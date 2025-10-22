import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LoginModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    onCreate: () => void;
}

export default function LoginModal({ visible, onClose, onLogin, onCreate }: LoginModalProps) {
    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text style={styles.title}>Welcome to Marinda 💫</Text>
                    <Text style={styles.subtitle}>Sign in or create your family account to continue</Text>

                    <TouchableOpacity style={[styles.button, styles.login]} onPress={onLogin}>
                        <Text style={styles.btnText}>Log In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.create]} onPress={onCreate}>
                        <Text style={[styles.btnText, { color: '#2563eb' }]}>Create Family Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={styles.cancel}>
                        <Text style={{ color: '#6b7280' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        width: 280,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    subtitle: { fontSize: 13, color: '#555', marginBottom: 20, textAlign: 'center' },
    button: {
        width: '100%',
        paddingVertical: 10,
        borderRadius: 8,
        marginVertical: 5,
        alignItems: 'center',
    },
    login: { backgroundColor: '#2563eb' },
    create: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563eb' },
    btnText: { fontWeight: '600', color: 'white' },
    cancel: { marginTop: 10 },
});
