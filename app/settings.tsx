// app/settings.tsx
import CheckerboardBackground from '@/components/checkerboard-background'
import MemberSidebar from '@/components/members-sidebar'
import { useAuthContext } from '@/hooks/use-auth-context'
import { useProfile, useUpdateProfile } from '@/lib/profiles/profiles.hooks'
import { getSupabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SettingsScreen() {
    const { member } = useAuthContext() as any
    const profileId = member?.profile_id

    const { data, isLoading } = useProfile(profileId)
    const updateProfile = useUpdateProfile()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [gender, setGender] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // local state: selected but NOT uploaded yet
    const [pendingAvatar, setPendingAvatar] = useState<string | null>(null)

    const supabase = getSupabase()

    // Load initial values
    useEffect(() => {
        if (data) {
            setFirstName(data.first_name ?? '')
            setLastName(data.last_name ?? '')
            setGender(data.gender ?? '')
            setBirthDate(data.birth_date ?? '')

            if (data.avatar_url) {
                const { data: pub } = supabase.storage
                    .from('profile-photos')
                    .getPublicUrl(data.avatar_url)

                setAvatarUrl(pub.publicUrl)
            }
        }
    }, [data])

    // 🔥 Refresh avatar preview when the DB avatar_url changes
    useEffect(() => {
        if (data?.avatar_url) {
            const { data: pub } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(data.avatar_url);

            setAvatarUrl(pub.publicUrl);
        }
    }, [data?.avatar_url]);

    // Detect changes for Save button
    const hasChanges =
        firstName !== (data?.first_name ?? '') ||
        lastName !== (data?.last_name ?? '') ||
        gender !== (data?.gender ?? '') ||
        birthDate !== (data?.birth_date ?? '') ||
        pendingAvatar !== null;

    // Pick avatar
    const pickAvatar = async () => {
        console.log("Opening picker...")

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
            allowsEditing: false, // NO BROKEN SAMSUNG CROP SCREEN
        })

        if (result.canceled) return

        const uri = result.assets[0].uri
        console.log("Selected file:", uri)

        setPendingAvatar(uri)    // local preview
    }

    const uploadAvatar = () => {
        if (!profileId || !pendingAvatar) return

        updateProfile.mutate({
            profileId,
            avatarFileUri: pendingAvatar,
            updates: {},
        })

        setPendingAvatar(null)
    }

    const handleSave = async () => {
        if (!profileId) return;

        // 🎯 store local copy before we clear it
        const avatarToUpload = pendingAvatar;

        await updateProfile.mutateAsync({
            profileId,
            avatarFileUri: avatarToUpload ?? null,
            updates: {
                first_name: firstName,
                last_name: lastName,
                gender: gender,
                birth_date: birthDate,
            },
        });

        // Only clear after successful upload
        setPendingAvatar(null);
    };

    if (isLoading || !data) {
        return (
            <View style={[styles.screen, styles.centerOnly]}>
                <ActivityIndicator />
                <Text style={styles.subtitle}>Loading profile…</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
            <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />
            <MemberSidebar />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.center}
                keyboardShouldPersistTaps="handled"
            >

                {/* Avatar */}
                <Text style={styles.label}>Profile Photo</Text>

                <Pressable onPress={pickAvatar} style={styles.avatarWrapper}>
                    {pendingAvatar || avatarUrl ? (
                        <Image
                            source={{ uri: pendingAvatar || avatarUrl! }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={styles.avatarEmpty}>
                            <Text style={styles.avatarEmptyText}>Tap to upload</Text>
                        </View>
                    )}
                </Pressable>


                {/* First Name */}
                <Text style={styles.label}>First Name</Text>
                <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    style={styles.input}
                />

                {/* Last Name */}
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    style={styles.input}
                />

                {/* Gender */}
                <Text style={styles.label}>Gender</Text>
                <TextInput
                    value={gender}
                    onChangeText={setGender}
                    style={styles.input}
                    placeholder="MALE / FEMALE"
                />

                {/* Birthdate */}
                <Text style={styles.label}>Birth Date</Text>
                <TextInput
                    value={birthDate}
                    onChangeText={setBirthDate}
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                />

                {/* Save Button */}
                <Pressable
                    onPress={handleSave}
                    disabled={updateProfile.isPending || !hasChanges}
                    style={[
                        styles.saveBtn,
                        (updateProfile.isPending || !hasChanges) &&
                        styles.saveBtnDisabled,
                    ]}
                >
                    <Text style={styles.saveBtnText}>
                        {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#E6F4FE',
    },
    centerOnly: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 40,
        gap: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#475569',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    input: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        fontSize: 16,
        color: '#0f172a',
    },
    saveBtn: {
        marginTop: 12,
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#93c5fd',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    submitAvatarBtn: {
        backgroundColor: '#10B981',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 12,
    },
    submitAvatarText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    avatarWrapper: {
        alignSelf: 'center',
        marginBottom: 12,
    },

    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },

    avatarEmpty: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarEmptyText: {
        color: '#334155',
        fontWeight: '600',
    },

})
