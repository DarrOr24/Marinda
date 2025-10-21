// app/index.tsx
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import CheckerboardBackground from '@/components/CheckerboardBackground';
import Sidebar, { Member } from '@/components/Sidebar';
import StarButton from '@/components/StarButton';

const members: Member[] = [
    { id: '1', name: 'Mom' },
    { id: '2', name: 'Dad' },
    { id: '3', name: 'Avi' },
    { id: '4', name: 'Noa' },
    { id: '5', name: 'Lia' },
];

export default function Index() {
    return (
        <View style={styles.screen}>
            {/* Background */}
            <CheckerboardBackground colorA="#F6FAFF" colorB="#EAF3FF" size={28} />

            {/* Left sidebar */}
            <Sidebar members={members} />

            {/* Center content */}
            <View style={styles.center}>
                {/* Row 1 */}
                <View style={styles.row}>
                    <Link href="/chores" asChild>
                        <StarButton label="Chores Game" />
                    </Link>
                    <Link href="/boards/grocery" asChild>
                        <StarButton label="Grocery Board" />
                    </Link>
                </View>

                {/* Row 2 */}
                <View style={styles.row}>
                    <Link href="/boards/announce" asChild>
                        <StarButton label="Announcements" />
                    </Link>
                    <Link href="/wishList" asChild>
                        <StarButton label="Wish List" />
                    </Link>
                </View>

                {/* Row 3 (single centered) */}
                <View style={styles.row}>
                    <Link href="/boards/activity" asChild>
                        <StarButton label="Activity Board" />
                    </Link>
                </View>
            </View>
        </View>
    );
}

const SIDEBAR_WIDTH = 92;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        flexDirection: 'row',          // sidebar (left) + center content
        backgroundColor: '#E6F4FE',    // fallback under SVG
    },
    center: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
    },
    row: {
        flexDirection: 'row',
        gap: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
