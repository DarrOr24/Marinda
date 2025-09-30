import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Marinda</Text>
      <Text>Connect Expo to Git</Text>
      <Text>Test to see if rebuild through git updates the expo production url</Text>
    </View>
  );
}
