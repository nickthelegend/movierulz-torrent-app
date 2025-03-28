"use client"
import { StyleSheet, View, Image, ScrollView, TouchableOpacity, StatusBar, Dimensions } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { BlurView } from "expo-blur"
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
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
    backdrop:
      "https://m.media-amazon.com/images/M/MV5BMjE0NGIwM2EtZjQxZi00ZTE5LWExN2MtNDBlMjY1ZmZkYjU3XkEyXkFqcGdeQXVyNjMwNzk3Mjk@._V1_.jpg",
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    rating: "8.8",
    duration: "148 min",
    genre: "Action, Adventure, Sci-Fi",
    cast: "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "2",
    title: "The Dark Knight",
    year: "2008",
    director: "Christopher Nolan",
    poster: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg",
    backdrop: "https://m.media-amazon.com/images/M/MV5BMTM5MjIxMTQ5MV5BMl5BanBnXkFtZTcwNDEyMzU5Mg@@._V1_.jpg",
    description:
      "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    rating: "9.0",
    duration: "152 min",
    genre: "Action, Crime, Drama",
    cast: "Christian Bale, Heath Ledger, Aaron Eckhart",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "3",
    title: "Interstellar",
    year: "2014",
    director: "Christopher Nolan",
    poster:
      "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg",
    backdrop: "https://m.media-amazon.com/images/M/MV5BMjA3NTEwOTMxMV5BMl5BanBnXkFtZTgwMjMyODgxMzE@._V1_.jpg",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    rating: "8.6",
    duration: "169 min",
    genre: "Adventure, Drama, Sci-Fi",
    cast: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "4",
    title: "Pulp Fiction",
    year: "1994",
    director: "Quentin Tarantino",
    poster:
      "https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg",
    backdrop: "https://m.media-amazon.com/images/M/MV5BNTY1MzgzOTYxNV5BMl5BanBnXkFtZTcwMDQwMTQ0NA@@._V1_.jpg",
    description:
      "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    rating: "8.9",
    duration: "154 min",
    genre: "Crime, Drama",
    cast: "John Travolta, Uma Thurman, Samuel L. Jackson",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "5",
    title: "The Matrix",
    year: "1999",
    director: "Lana Wachowski, Lilly Wachowski",
    poster:
      "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_.jpg",
    backdrop: "https://m.media-amazon.com/images/M/MV5BNzM4OTkzMjcxOF5BMl5BanBnXkFtZTgwMzQxMTgyMjE@._V1_.jpg",
    description:
      "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    rating: "8.7",
    duration: "136 min",
    genre: "Action, Sci-Fi",
    cast: "Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
  {
    id: "6",
    title: "Parasite",
    year: "2019",
    director: "Bong Joon Ho",
    poster:
      "https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_.jpg",
    backdrop:
      "https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_.jpg",
    description:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    rating: "8.5",
    duration: "132 min",
    genre: "Drama, Thriller",
    cast: "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
    torrentUrl: "magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel",
  },
]

const { width, height } = Dimensions.get("window")
const BACKDROP_HEIGHT = height * 0.5

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const movie = MOVIES.find((m) => m.id === id)

  const buttonScale = useSharedValue(1)

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    }
  })

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95)
  }

  const handlePressOut = () => {
    buttonScale.value = withSpring(1)
  }

  if (!movie) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Movie not found</ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backLink}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Backdrop Image */}
      <View style={styles.backdropContainer}>
        <Image source={{ uri: movie.backdrop || movie.poster }} style={styles.backdrop} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)", "#000"]} style={styles.backdropGradient} />
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </BlurView>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Movie Poster and Basic Info */}
          <View style={styles.headerRow}>
            <Animated.View entering={FadeInLeft.delay(200).springify()} style={styles.posterContainer}>
              <Image source={{ uri: movie.poster }} style={styles.poster} />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(400).springify()} style={styles.basicInfo}>
              <ThemedText type="title" style={styles.title}>
                {movie.title}
              </ThemedText>
              <ThemedText style={styles.year}>{movie.year}</ThemedText>

              <View style={styles.ratingRow}>
                <View style={styles.ratingContainer}>
                  <ThemedText style={styles.rating}>★ {movie.rating}</ThemedText>
                </View>
                <ThemedText style={styles.duration}>{movie.duration}</ThemedText>
              </View>

              <ThemedText style={styles.genre}>{movie.genre}</ThemedText>
            </Animated.View>
          </View>

          {/* Watch Button */}
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.watchButtonContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={() => router.push(`/(movies)/video-player?id=${movie.id}`)}
              style={styles.watchButtonTouchable}
            >
              <Animated.View style={[styles.watchButton, buttonAnimatedStyle]}>
                <LinearGradient
                  colors={["#6a11cb", "#2575fc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.watchButtonGradient}
                >
                  <Ionicons name="play" size={24} color="white" style={styles.playIcon} />
                  <ThemedText style={styles.watchButtonText}>Watch Movie</ThemedText>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Movie Details */}
          <Animated.View entering={FadeInDown.delay(800).springify()} style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Director</ThemedText>
              <ThemedText style={styles.detailValue}>{movie.director}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Cast</ThemedText>
              <ThemedText style={styles.detailValue}>{movie.cast}</ThemedText>
            </View>

            <View style={styles.descriptionContainer}>
              <ThemedText style={styles.descriptionLabel}>Synopsis</ThemedText>
              <ThemedText style={styles.description}>{movie.description}</ThemedText>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backLink: {
    marginTop: 20,
    color: "#6a11cb",
    fontSize: 16,
  },
  backdropContainer: {
    height: BACKDROP_HEIGHT,
    width: width,
    position: "absolute",
    top: 0,
    left: 0,
  },
  backdrop: {
    height: "100%",
    width: "100%",
    resizeMode: "cover",
  },
  backdropGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: BACKDROP_HEIGHT * 0.7,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  posterContainer: {
    width: width * 0.3,
    height: width * 0.45,
    borderRadius: 12,
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
  basicInfo: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  year: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingContainer: {
    backgroundColor: "rgba(106, 17, 203, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  rating: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  duration: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  genre: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  watchButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  watchButtonTouchable: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  watchButton: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  watchButtonGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    marginRight: 10,
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  detailsContainer: {
    paddingHorizontal: 20,
  },
  detailRow: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
  descriptionContainer: {
    marginTop: 10,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
  },
})

