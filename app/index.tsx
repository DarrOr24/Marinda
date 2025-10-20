import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E6F4FE",
      }}
    >
      <Text>Marinda</Text>
      <Text>Don't need this now? Let's remove it.</Text>
      <Text>Trying Build from Github button</Text>
      <Link href="/chores">Chores</Link>
    </View>
  );
}
