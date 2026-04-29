import { Image, Platform, StyleSheet, Text, View } from 'react-native'

const APP_BRAND_TITLE_COLOR = '#1570dc'
const BRAND_TITLE_FONT = 'Fredoka_700Bold'

export function LoginHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/images/app-icon.png')}
          style={styles.appIcon}
        />
        <Text style={[styles.brandText, styles.brandTitle]}>Marinda</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 180,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  brandRow: {
    alignItems: 'center',
    gap: 10,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  brandText: {
    fontSize: 42,
    lineHeight: Platform.OS === 'android' ? 52 : 46,
    fontWeight: 'normal',
  },
  brandTitle: {
    color: APP_BRAND_TITLE_COLOR,
    fontFamily: BRAND_TITLE_FONT,
    letterSpacing: -0.3,
  },
})
