import { StyleSheet, View } from "react-native"

type Props = {
  step: number
  total: number
}

export function StepsBar({ step, total }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1
        const isActive = idx <= step

        return (
          <View key={idx} style={styles.step}>
            {/* Left line */}
            {idx > 1 && (
              <View
                style={[
                  styles.line,
                  idx <= step && styles.lineActive,
                ]}
              />
            )}

            {/* Circle */}
            <View
              style={[
                styles.circle,
                isActive && styles.circleActive,
              ]}
            />

            {/* Right line */}
            {idx < total && (
              <View
                style={[
                  styles.line,
                  idx < step && styles.lineActive,
                ]}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // ✅ center the whole bar
    paddingVertical: 16,
    backgroundColor: '#fff',
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    zIndex: 1, // keeps it above the line
  },

  circleActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },

  line: {
    width: 28, // controls spacing between steps
    height: 2,
    backgroundColor: '#e5e7eb',
  },

  lineActive: {
    backgroundColor: '#2563eb',
  },
})
