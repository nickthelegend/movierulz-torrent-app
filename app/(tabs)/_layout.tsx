import { Tabs } from "expo-router"
import { StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#6a11cb",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarItemStyle: styles.tabBarItem,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="download" size={size} color={color} />,
          tabBarItemStyle: styles.tabBarItem,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 0,
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    borderRadius: 25,
    height: 60,
    borderTopWidth: 0,
    shadowColor: "#6a11cb",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    overflow: "hidden",
  },
  tabBarItem: {
    height: 60,
    borderRadius: 25,
  },
})

