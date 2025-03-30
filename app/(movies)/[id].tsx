"use client"
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  NativeModules,
  Alert,
} from "react-native"
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
import { useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { ThemedText } from "@/components/ThemedText"
import DownloadManager from "@/utils/downloadManager"
import { useDownload } from "@/utils/useDownloadManager"
import type { DownloadModel } from "@/utils/downloadManager"

const { TorrentModule } = NativeModules

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
  const [downloadId, setDownloadId] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCheckingDownload, setIsCheckingDownload] = useState(true)

  // Use the download hook if we have a downloadId
  const { download, pauseDownload, resumeDownload, removeDownload } = useDownload(downloadId)

  useEffect(() => {
    // Check if this movie is already downloaded
    checkIfDownloaded()
  }, [id])

  const checkIfDownloaded = async () => {
    try {
      setIsCheckingDownload(true)

      // Get all downloads from AsyncStorage
      const jsonValue = await AsyncStorage.getItem("downloads")
      const downloads: DownloadModel[] = jsonValue != null ? JSON.parse(jsonValue) : []

      // Find if this movie is already downloaded
      const existingDownload = downloads.find((download) => {
        // Check if the download ID contains the movie ID
        if (download._id.includes(`_${id}`)) return true

        // Or if the source contains the movie ID
        if (download.source && download.source.includes(`id=${id}`)) return true

        return false
      })

      if (existingDownload) {
        console.log("Movie already downloaded:", existingDownload)
        setDownloadId(existingDownload._id)
        setIsDownloading(true)
      }

      setIsCheckingDownload(false)
    } catch (error) {
      console.error("Error checking if downloaded:", error)
      setIsCheckingDownload(false)
    }
  }

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

  const startDownload = async () => {
    if (!movie || !movie.torrentUrl) {
      Alert.alert("Error", "No torrent URL available")
      return
    }

    setIsDownloading(true)

    try {
      // Use the DownloadManager to add a new download
      const downloadManager = DownloadManager.getInstance()
      const newDownload = await downloadManager.add(movie.torrentUrl)
      setDownloadId(newDownload._id)
    } catch (error) {
      console.error("Error starting download:", error)
      Alert.alert("Error", "Failed to start download")
      setIsDownloading(false)
    }
  }

  const handlePauseResume = async () => {
    if (!downloadId) return

    if (download?.status === "DOWNLOADING") {
      await pauseDownload()
    } else if (download?.status === "PAUSED") {
      await resumeDownload()
    }
  }

  const handleRemoveDownload = async () => {
    if (!downloadId) return

    Alert.alert(
      "Remove Download",
      "Are you sure you want to remove this download? This will delete the downloaded files.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            await removeDownload()
            setDownloadId("")
            setIsDownloading(false)
          },
          style: "destructive",
        },
      ],
    )
  }

  const handleShowFiles = () => {
    if (!downloadId) return
    router.push(`/file-list?downloadId=${downloadId}`)
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const formatSpeed = (bytesPerSecond) => {
    return `${formatBytes(bytesPerSecond)}/s`
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

          {/* Watch/Download Button */}
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.watchButtonContainer}>
            {isCheckingDownload ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={styles.loadingText}>Checking download status...</ThemedText>
              </View>
            ) : download ? (
              <View style={styles.downloadContainer}>
                {/* Download Progress */}
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${download.progress}%` }]} />
                </View>

                {/* Download Status and Speed */}
                <View style={styles.downloadInfoContainer}>
                  <ThemedText style={styles.progressText}>{Math.round(download.progress)}% Downloaded</ThemedText>

                  {download.status === "DOWNLOADING" && (
                    <ThemedText style={styles.speedText}>{formatSpeed(download.downloadRate)}</ThemedText>
                  )}
                </View>

                {/* Download Size Info */}
                <ThemedText style={styles.sizeText}>
                  {formatBytes(download.downloadedSize)} / {formatBytes(download.totalSize || 0)}
                </ThemedText>

                {/* Control Buttons */}
                <View style={styles.controlsRow}>
                  {/* Pause/Resume Button */}
                  {download.status !== "COMPLETED" && (
                    <TouchableOpacity activeOpacity={0.9} onPress={handlePauseResume} style={styles.controlButton}>
                      <LinearGradient
                        colors={["#6a11cb", "#2575fc"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.controlButtonGradient}
                      >
                        <Ionicons
                          name={download.status === "DOWNLOADING" ? "pause" : "play"}
                          size={24}
                          color="white"
                          style={styles.controlIcon}
                        />
                        <ThemedText style={styles.controlButtonText}>
                          {download.status === "DOWNLOADING" ? "Pause" : "Resume"}
                        </ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Show Files Button */}
                  {download.location && (
                    <TouchableOpacity activeOpacity={0.9} onPress={handleShowFiles} style={styles.controlButton}>
                      <LinearGradient
                        colors={["#6a11cb", "#2575fc"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.controlButtonGradient}
                      >
                        <Ionicons name="folder-open" size={24} color="white" style={styles.controlIcon} />
                        <ThemedText style={styles.controlButtonText}>Show Files</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Watch Button (if download is complete) */}
                  {download.status === "COMPLETED" && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                      onPress={() => router.push(`/(movies)/video-player?id=${movie.id}`)}
                      style={styles.controlButton}
                    >
                      <LinearGradient
                        colors={["#6a11cb", "#2575fc"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.controlButtonGradient}
                      >
                        <Ionicons name="play" size={24} color="white" style={styles.controlIcon} />
                        <ThemedText style={styles.controlButtonText}>Watch</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Cancel/Remove Button */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleRemoveDownload}
                    style={[styles.controlButton, styles.removeButton]}
                  >
                    <LinearGradient
                      colors={["#ff4d4d", "#ff6b6b"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.controlButtonGradient}
                    >
                      <Ionicons name="trash" size={24} color="white" style={styles.controlIcon} />
                      <ThemedText style={styles.controlButtonText}>Remove</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={startDownload}
                style={styles.watchButtonTouchable}
              >
                <Animated.View style={[styles.watchButton, buttonAnimatedStyle]}>
                  <LinearGradient
                    colors={["#6a11cb", "#2575fc"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.watchButtonGradient}
                  >
                    <Ionicons name="arrow-down-circle" size={24} color="white" style={styles.playIcon} />
                    <ThemedText style={styles.watchButtonText}>Download Movie</ThemedText>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            )}
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
  downloadContainer: {
    width: "100%",
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 5,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6a11cb",
    borderRadius: 5,
  },
  downloadInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  progressText: {
    fontSize: 14,
    color: "white",
  },
  speedText: {
    fontSize: 14,
    color: "#2575fc",
    fontWeight: "bold",
  },
  sizeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 15,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  controlButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 5,
    minWidth: 100,
  },
  removeButton: {
    backgroundColor: "#ff4d4d",
  },
  controlButtonGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  controlIcon: {
    marginRight: 5,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
})

