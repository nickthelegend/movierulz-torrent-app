"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  View,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"

import { ThemedText } from "@/components/ThemedText"

// Sample movie data - in a real app, this would come from an API
const MOVIES = [
  {
    id: "1",
    title: "Inception",
    year: "2010",
    director: "Christopher Nolan",
    poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg",
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    rating: "8.8",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "2",
    title: "The Dark Knight",
    year: "2008",
    director: "Christopher Nolan",
    poster: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
    description:
      "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    rating: "9.0",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "3",
    title: "Interstellar",
    year: "2014",
    director: "Christopher Nolan",
    poster:
      "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    rating: "8.6",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "4",
    title: "Pulp Fiction",
    year: "1994",
    director: "Quentin Tarantino",
    poster:
      "https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg",
    description:
      "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    rating: "8.9",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "5",
    title: "The Matrix",
    year: "1999",
    director: "Lana Wachowski, Lilly Wachowski",
    poster:
      "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg",
    description:
      "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    rating: "8.7",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "6",
    title: "Parasite",
    year: "2019",
    director: "Bong Joon Ho",
    poster:
      "https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_.jpg",
    description:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    rating: "8.5",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
]

const { width } = Dimensions.get("window")
const ITEM_WIDTH = width * 0.85
const ITEM_HEIGHT = ITEM_WIDTH * 1.5

export default function HomeScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const scale = useSharedValue(1)

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const handlePressIn = () => {
    scale.value = withSpring(0.95)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1)
  }

  const renderMovie = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 200).springify()} style={styles.movieContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(`/(movies)/${item.id}`)}
        style={styles.movieTouchable}
      >
        <Animated.View style={[styles.movieCard, animatedStyle]}>
          <Image source={{ uri: item.poster }} style={styles.poster} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)", "#000"]} style={styles.gradientOverlay} />
          <View style={styles.movieInfo}>
            <ThemedText type="title" style={styles.title}>
              {item.title}
            </ThemedText>
            <View style={styles.detailsRow}>
              <ThemedText style={styles.year}>{item.year}</ThemedText>
              <View style={styles.ratingContainer}>
                <ThemedText style={styles.rating}>★ {item.rating}</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6a11cb" />
        <ThemedText style={styles.loadingText}>Loading Movies...</ThemedText>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />

      <Animated.View entering={FadeInRight.springify()} style={styles.header}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={["rgba(106, 17, 203, 0.5)", "rgba(37, 117, 252, 0.5)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View>
                <ThemedText type="title" style={styles.headerTitle}>
                  Movie Stream
                </ThemedText>
                <ThemedText style={styles.headerSubtitle}>Discover & Watch</ThemedText>
              </View>

              {/* Downloads Button */}
              <TouchableOpacity style={styles.downloadsButton} onPress={() => router.push("/downloads")}>
                <LinearGradient
                  colors={["#6a11cb", "#2575fc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.downloadsButtonGradient}
                >
                  <Ionicons name="download" size={18} color="white" style={styles.downloadsIcon} />
                  <ThemedText style={styles.downloadsText}>Downloads</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      <FlatList
        data={MOVIES}
        renderItem={renderMovie}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    marginBottom: 10,
  },
  blurContainer: {
    overflow: "hidden",
    borderRadius: 20,
    marginHorizontal: 20,
  },
  headerGradient: {
    padding: 20,
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  downloadsButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  downloadsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  downloadsIcon: {
    marginRight: 5,
  },
  downloadsText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 30,
  },
  movieContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  movieTouchable: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
  },
  movieCard: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  poster: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    borderRadius: 20,
  },
  movieInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  year: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  ratingContainer: {
    backgroundColor: "rgba(106, 17, 203, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
})

