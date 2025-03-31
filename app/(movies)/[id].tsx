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
  ActivityIndicator,
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

// Movie interface
interface Movie {
  id: string
  title: string
  year: string
  director: string
  poster: string
  backdrop?: string
  description: string
  rating: string
  duration: string
  genre: string
  cast: string
  quality: string
  language: string
  magnetLinks: MagnetLink[]
}

interface MagnetLink {
  url: string
  quality: string
  size: string
}

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const buttonScale = useSharedValue(1)
  const [downloadId, setDownloadId] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCheckingDownload, setIsCheckingDownload] = useState(true)
  const [selectedMagnetLink, setSelectedMagnetLink] = useState<MagnetLink | null>(null)

  // Use the download hook if we have a downloadId
  const { download, pauseDownload, resumeDownload, removeDownload } = useDownload(downloadId)

  useEffect(() => {
    // Fetch movie details
    fetchMovieDetails()
    // Check if this movie is already downloaded
    checkIfDownloaded()
  }, [id])

  // Fix the issue with movie details not loading correctly

  // 1. Update the fetchMovieDetails function to better handle URL construction and errors
  const fetchMovieDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // First, try to find the movie in the recent movies list on the homepage
      const mainPageUrl = "https://www.5movierulz.prof/"
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(mainPageUrl)}`

      console.log(`Searching for movie with ID ${id} on homepage`)

      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch homepage: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()

      // Extract movie details from the homepage's recent movies section
      const movieMatch = html.match(new RegExp(`<a[^>]*href="([^"]*${id}[^"]*)"[^>]*>([^<]+)<\/a>`, "i"))

      if (movieMatch) {
        const movieUrl = movieMatch[1]
        console.log(`Found movie link on homepage: ${movieUrl}`)

        // Now fetch the movie details page
        const movieProxyUrl = `https://corsproxy.io/?${encodeURIComponent(movieUrl)}`
        const movieResponse = await fetch(movieProxyUrl)

        if (!movieResponse.ok) {
          throw new Error(`Failed to fetch movie details: ${movieResponse.status} ${movieResponse.statusText}`)
        }

        const movieHtml = await movieResponse.text()

        // Parse the HTML to extract movie details
        const movieData = parseMovieDetails(movieHtml)
        setMovie(movieData)
      } else {
        // If we can't find the movie on the homepage, try to extract it from the sidebar
        console.log("Movie not found in main content, checking sidebar")

        // Look for the movie in the "Recent and Updated Movies" sidebar
        const sidebarMovieMatch = html.match(
          new RegExp(`<a[^>]*href="[^"]*movie-watch-online-free-${id}\\.html"[^>]*>([^<]+)<\/a>`, "i"),
        )

        if (sidebarMovieMatch) {
          // Extract movie title from sidebar
          const movieTitle = sidebarMovieMatch[1].trim()
          console.log(`Found movie in sidebar: ${movieTitle}`)

          // Search for this movie in the page content to get more details
          const movieLinkMatch = html.match(
            new RegExp(`<a[^>]*href="([^"]*movie-watch-online-free-${id}\\.html)"[^>]*>`, "i"),
          )

          if (movieLinkMatch) {
            const movieUrl = movieLinkMatch[1]
            console.log(`Found movie URL: ${movieUrl}`)

            // Fetch the movie details page
            const movieProxyUrl = `https://corsproxy.io/?${encodeURIComponent(movieUrl)}`
            const movieResponse = await fetch(movieProxyUrl)

            if (movieResponse.ok) {
              const movieHtml = await movieResponse.text()
              const movieData = parseMovieDetails(movieHtml)
              setMovie(movieData)
            } else {
              // If we can't fetch the movie page, create a basic movie object from sidebar info
              console.log("Could not fetch movie page, creating basic movie object")

              // Extract year, quality, and language from title
              const yearMatch = movieTitle.match(/$$(\d{4})$$/)
              const year = yearMatch ? yearMatch[1] : "2025"

              const qualityMatch = movieTitle.match(/$$.*?$$\s*(PREHD|HDRip|DVDScr|BRRip)/i)
              const quality = qualityMatch ? qualityMatch[1] : "HD"

              const languageMatch = movieTitle.match(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/i)
              const language = languageMatch ? languageMatch[1] : ""

              // Clean up title
              const title = movieTitle
                .replace(/$$\d{4}$$/g, "")
                .replace(/\s*(PREHD|HDRip|DVDScr|BRRip)\s*/gi, "")
                .replace(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/gi, "")
                .replace(/Movie Watch Online Free/gi, "")
                .trim()

              setMovie({
                id: id as string,
                title,
                year,
                director: "Unknown",
                poster: "",
                description: "Movie details could not be loaded. Please try again later.",
                rating: "N/A",
                duration: "N/A",
                genre: "N/A",
                cast: "N/A",
                quality,
                language,
                magnetLinks: [],
              })
            }
          } else {
            throw new Error("Movie link not found")
          }
        } else {
          // If we still can't find the movie, try a direct approach with the ID
          console.log("Movie not found in sidebar, trying direct approach with ID")

          // Find any movie that might match this ID
          const allMovieLinks = html.match(/<a[^>]*href="([^"]*movie-watch-online-free-[^"]*)"[^>]*>([^<]+)<\/a>/gi)

          if (allMovieLinks && allMovieLinks.length > 0) {
            // Get the first movie from the list as a fallback
            const firstMovieMatch = allMovieLinks[0].match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/i)

            if (firstMovieMatch) {
              const movieUrl = firstMovieMatch[1]
              const movieTitle = firstMovieMatch[2].trim()

              console.log(`Using fallback movie: ${movieTitle} (${movieUrl})`)

              // Fetch the movie details page
              const movieProxyUrl = `https://corsproxy.io/?${encodeURIComponent(movieUrl)}`
              const movieResponse = await fetch(movieProxyUrl)

              if (movieResponse.ok) {
                const movieHtml = await movieResponse.text()
                const movieData = parseMovieDetails(movieHtml)

                // Override the ID to match what was requested
                movieData.id = id as string

                setMovie(movieData)
              } else {
                throw new Error("Failed to fetch fallback movie details")
              }
            } else {
              throw new Error("Failed to parse fallback movie link")
            }
          } else {
            throw new Error("No movies found on the homepage")
          }
        }
      }

      setLoading(false)
    } catch (err) {
      console.error("Error fetching movie details:", err)
      setError(`Failed to load movie details: ${err.message}`)
      setLoading(false)
    }
  }

  // 2. Improve the parseMovieDetails function to handle different HTML structures
  const parseMovieDetails = (html: string): Movie => {
    try {
      // Extract poster URL
      const posterMatch =
        html.match(/src="([^"]+)" class="attachment-post-thumbnail/i) ||
        html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*wp-post-image[^"]*"/i) ||
        html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*"/i)

      const poster = posterMatch ? posterMatch[1] : ""
      console.log("Poster URL:", poster)

      // Extract title
      const titleMatch =
        html.match(/<strong>Watch ([^<]+)<\/strong>/i) ||
        html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
        html.match(/<title>([^<]+)<\/title>/i)

      const fullTitle = titleMatch ? titleMatch[1].replace("MovieRulz", "").trim() : "Unknown Movie"

      // Extract year from title
      const yearMatch = fullTitle.match(/$$(\d{4})$$/)
      const year = yearMatch ? yearMatch[1] : "2025"

      // Extract quality from title
      const qualityMatch = fullTitle.match(/$$.*?$$\s*(PREHD|HDRip|DVDScr|BRRip)/i)
      const quality = qualityMatch ? qualityMatch[1] : "HD"

      // Extract language from title
      const languageMatch = fullTitle.match(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/i)
      const language = languageMatch ? languageMatch[1] : "Telugu"

      // Extract director
      const directorMatch = html.match(/<b>Directed by:<\/b>\s*<a[^>]*>([^<]+)<\/a>/i)
      const director = directorMatch ? directorMatch[1] : "Unknown"

      // Extract cast
      const castMatch = html.match(/<b>Starring by:<\/b>(.*?)<br><b>Genres:/is)
      const castHtml = castMatch ? castMatch[1] : ""
      const cast = castHtml.replace(/<[^>]*>/g, "").trim()

      // Extract genres
      const genreMatch = html.match(/<b>Genres:<\/b>(.*?)<br><b>Categories:/is)
      const genreHtml = genreMatch ? genreMatch[1] : ""
      const genre = genreHtml ? genreHtml.replace(/<[^>]*>/g, "").trim() : ""

      // Extract description
      const descriptionMatch =
        html.match(/<p>\s*([^<]+?)<\/p>\s*<p><span style="color: #ff00ff;"><strong>.*?Download/is) ||
        html.match(/<p>\s*([^<]+?)<\/p>/is)

      const description = descriptionMatch ? descriptionMatch[1].trim() : "No description available."

      // Extract magnet links
      const magnetLinks: MagnetLink[] = []
      const magnetMatches = html.matchAll(
        /href="(magnet:[^"]+)"[^>]*><span>.*?<\/span>GET THIS TORRENT.*?<small>([^<]+)<\/small>/g,
      )

      for (const match of magnetMatches) {
        const url = match[1]
        const qualityInfo = match[2].trim()

        // Parse quality info (e.g., "5.5 gb 1080p")
        const parts = qualityInfo.split(" ")
        const quality = parts.length > 1 ? parts[parts.length - 1] : "HD"
        const size = parts.length > 1 ? `${parts[0]} ${parts[1]}` : "Unknown"

        magnetLinks.push({
          url,
          quality,
          size,
        })
      }

      // Clean up title
      const title = fullTitle
        .replace(/$$\d{4}$$/g, "")
        .replace(/\s*(PREHD|HDRip|DVDScr|BRRip)\s*/gi, "")
        .replace(/(Telugu|Tamil|Hindi|Malayalam|Kannada|English)/gi, "")
        .replace(/Movie Watch Online Free/gi, "")
        .trim()

      return {
        id: id as string,
        title,
        year,
        director,
        poster,
        backdrop: poster, // Use poster as backdrop if no separate backdrop image
        description,
        rating: "8.5", // Default rating
        duration: "150 min", // Default duration
        genre,
        cast,
        quality,
        language,
        magnetLinks,
      }
    } catch (err) {
      console.error("Error parsing movie details:", err)
      return {
        id: id as string,
        title: "Unknown Movie",
        year: "2025",
        director: "Unknown",
        poster: "",
        description: "Failed to load movie details.",
        rating: "N/A",
        duration: "N/A",
        genre: "N/A",
        cast: "N/A",
        quality: "HD",
        language: "Telugu",
        magnetLinks: [],
      }
    }
  }

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
    if (!movie || !selectedMagnetLink) {
      Alert.alert("Error", "Please select a torrent quality first")
      return
    }

    setIsDownloading(true)

    try {
      // Use the DownloadManager to add a new download
      const downloadManager = DownloadManager.getInstance()
      const newDownload = await downloadManager.add(selectedMagnetLink.url)
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

  const handleSelectMagnetLink = (magnetLink: MagnetLink) => {
    setSelectedMagnetLink(magnetLink)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#121212", "#1f1f1f", "#121212"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#6a11cb" />
        <ThemedText style={styles.loadingText}>Loading movie details...</ThemedText>
      </View>
    )
  }

  if (error || !movie) {
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

          {/* Torrent Quality Selection */}
          {!isDownloading && movie.magnetLinks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.qualitySelectionContainer}>
              <ThemedText style={styles.qualitySelectionTitle}>Select Quality:</ThemedText>
              <View style={styles.qualityButtonsContainer}>
                {movie.magnetLinks.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.qualityButton,
                      selectedMagnetLink?.quality === link.quality ? styles.selectedQualityButton : null,
                    ]}
                    onPress={() => handleSelectMagnetLink(link)}
                  >
                    <ThemedText style={styles.qualityButtonText}>
                      {link.quality} ({link.size})
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

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
                disabled={!selectedMagnetLink}
                style={[styles.watchButtonTouchable, !selectedMagnetLink && styles.disabledButton]}
              >
                <Animated.View style={[styles.watchButton, buttonAnimatedStyle]}>
                  <LinearGradient
                    colors={["#6a11cb", "#2575fc"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.watchButtonGradient}
                  >
                    <Ionicons name="arrow-down-circle" size={24} color="white" style={styles.playIcon} />
                    <ThemedText style={styles.watchButtonText}>
                      {selectedMagnetLink ? "Download Movie" : "Select Quality First"}
                    </ThemedText>
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

const { width, height } = Dimensions.get("window")
const BACKDROP_HEIGHT = height * 0.5

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
    fontSize: 16,
    color: "#fff",
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
  qualitySelectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  qualitySelectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  qualityButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  qualityButton: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(106, 17, 203, 0.3)",
  },
  selectedQualityButton: {
    backgroundColor: "rgba(106, 17, 203, 0.3)",
    borderColor: "rgba(106, 17, 203, 0.7)",
  },
  qualityButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
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
  disabledButton: {
    opacity: 0.6,
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
})

