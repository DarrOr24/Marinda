// components/app-text.tsx
import { Platform, StyleSheet, Text } from "react-native";


const styles = StyleSheet.create({
  text: {
    color: 'tomato',
    fontSize: 18,
    ...Platform.select({
      ios: {
        fontFamily: 'Inter',
      },
      android: {
        fontFamily: 'Roboto',
      },
    })
  },
});

export default function AppText({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.text}>
      {children}
    </Text>
  );
}