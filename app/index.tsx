// app/index.tsx
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import CheckerboardBackground from '@/components/CheckerboardBackground';
import FeatureTile from '@/components/FeatureTile';
import Sidebar from '@/components/Sidebar';
import { members } from '@/data/members';


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
                        <FeatureTile
                            label="Chores Game"
                            icon={{ family: 'MaterialCommunityIcons', name: 'clipboard-check-outline', color: '#2563eb' }}
                        />
                    </Link>

                    <Link href="/boards/grocery" asChild>
                        <FeatureTile
                            label="Grocery Board"
                            icon={{ family: 'MaterialCommunityIcons', name: 'cart-outline', color: '#16a34a' }}
                        />
                    </Link>
                </View>

                {/* Row 2 */}
                <View style={styles.row}>
                    <Link href="/boards/announcements" asChild>
                        <FeatureTile
                            label="Announcements"
                            icon={{ family: 'MaterialCommunityIcons', name: 'bullhorn-outline', color: '#f59e0b' }}
                        />
                    </Link>

                    <Link href="/wishList" asChild>
                        <FeatureTile
                            label="Wish List"
                            icon={{ family: 'Ionicons', name: 'gift-outline', color: '#db2777' }}
                        />
                    </Link>
                </View>

                {/* Row 3 */}
                <View style={styles.row}>
                    <Link href="/boards/activity" asChild>
                        <FeatureTile
                            label="Activity Board"
                            icon={{ family: 'MaterialCommunityIcons', name: 'calendar-month-outline', color: '#7c3aed' }}
                        />
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
