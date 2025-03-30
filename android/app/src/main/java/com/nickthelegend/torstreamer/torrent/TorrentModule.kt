package com.nickthelegend.torstreamer

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.frostwire.jlibtorrent.AlertListener
import com.frostwire.jlibtorrent.SessionManager
import com.frostwire.jlibtorrent.SessionParams
import com.frostwire.jlibtorrent.SettingsPack
import com.frostwire.jlibtorrent.Sha1Hash
import com.frostwire.jlibtorrent.TorrentHandle
import com.frostwire.jlibtorrent.TorrentInfo
import com.frostwire.jlibtorrent.TorrentStatus
import com.frostwire.jlibtorrent.alerts.Alert
import com.frostwire.jlibtorrent.alerts.AlertType
import com.frostwire.jlibtorrent.alerts.PieceFinishedAlert
import com.frostwire.jlibtorrent.alerts.TorrentAlert
import com.frostwire.jlibtorrent.alerts.TorrentFinishedAlert
import com.frostwire.jlibtorrent.swig.settings_pack
import java.io.File
import java.util.HashMap
import java.util.concurrent.CountDownLatch

class TorrentModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context: Context = reactContext
    private val sessionManagers: MutableMap<String, SessionManager> = HashMap()
    private val downloadsInProgress: MutableMap<String, Sha1Hash> = HashMap()

    companion object {
        private val TAG: String = TorrentModule::class.java.simpleName

        fun deleteFolderRecursively(folder: File): Boolean {
            if (folder.isDirectory) {
                val files = folder.listFiles()
                if (files != null) {
                    for (file in files) {
                        deleteFolderRecursively(file)
                    }
                }
            }
            return folder.delete()
        }
    }

    override fun getName(): String {
        return TAG
    }

    @ReactMethod
    fun add(downloadId: String, magnetLink: String) {
        log("Action: ADD download $downloadId")
        Thread { addDownload(downloadId, magnetLink) }.start()
    }

    @ReactMethod
    fun pause(downloadId: String, promise: Promise) {
        log("Action: PAUSE download $downloadId")
        val sessionManager = sessionManagers[downloadId]
        if (sessionManager == null) {
            val errorMsg = "Session Manager doesn't exist for download id $downloadId"
            log(errorMsg, "e")
            promise.reject("DOWNLOAD_PROCESS_NOT_FOUND", errorMsg)
            return
        }
        sessionManager.pause()
        promise.resolve(null)
    }

    @ReactMethod
    fun resume(downloadId: String, promise: Promise) {
        log("Action: RESUME download $downloadId")
        val sessionManager = sessionManagers[downloadId]
        if (sessionManager == null) {
            val errorMsg = "Session Manager doesn't exist for download id $downloadId"
            log(errorMsg, "e")
            promise.reject("DOWNLOAD_PROCESS_NOT_FOUND", errorMsg)
            return
        }
        sessionManager.resume()
        promise.resolve(null)
    }

    @ReactMethod
    fun remove(downloadId: String, path: String, promise: Promise) {
        val sessionManager = sessionManagers[downloadId]
        val downloadHash = downloadsInProgress[downloadId]

        if (sessionManager != null && downloadHash != null) {
            val torrentHandle: TorrentHandle? = sessionManager.find(downloadHash)
            if (torrentHandle != null) {
                sessionManager.remove(torrentHandle)
                sessionManagers.remove(downloadId)
                downloadsInProgress.remove(downloadId)
            }
        }

        val folderRemoved = removeFolder(path)
        if (folderRemoved) {
            promise.resolve(null)
        } else {
            promise.reject("REMOVE_EXCEPTION", "Folder has not been deleted")
        }
    }

    private fun addDownload(downloadId: String, magnetLink: String) {
        val sessionManager = SessionManager()
        try {
            log("Magnet link to process: $magnetLink")
            startSession(sessionManager)
            startDownload(sessionManager, magnetLink, downloadId)
        } catch (e: Exception) {
            log(e.message ?: "Unknown error", "e")
            val errorData: WritableMap = Arguments.createMap()
            errorData.putString("error", e.message)
            emitDataToApp("ADD_ERROR", downloadId, errorData)
        } finally {
            log("Closing sessionManager for downloadId: $downloadId")
            sessionManager.stop()
        }
    }

    @Throws(InterruptedException::class)
    private fun startDownload(sessionManager: SessionManager, magnetLink: String, downloadId: String) {
        val rootFolder: File = getRootFolder()
        val signal = CountDownLatch(1)

        addListener(sessionManager, downloadId, signal)
        log("Storage location: ${rootFolder.absolutePath}")
        log("Starting download")
        sessionManager.download(magnetLink, rootFolder)
        sessionManagers[downloadId] = sessionManager

        signal.await()
    }

    private fun addListener(session: SessionManager, downloadId: String, signal: CountDownLatch) {
        val listener = object : AlertListener {
            var progress = 0
            var lastProgressEventTime = System.currentTimeMillis()
            override fun types(): IntArray? = null

            override fun alert(alert: Alert<*>) {
                val type = alert.type()
                val alertData = Arguments.createMap()
                val torrentHandle = (alert as TorrentAlert<*>).handle()

                when (type) {
                    AlertType.ADD_TORRENT -> {
                        log("ADD_TORRENT: ${alert.message()} Hash: ${torrentHandle.infoHash()}")
                        torrentHandle.resume()
                        emitDataToApp("ADD_TORRENT", downloadId, alertData)
                    }
                    AlertType.METADATA_RECEIVED -> {
                        val torrentInfo: TorrentInfo = torrentHandle.torrentFile()
                        val parentPath = torrentHandle.savePath()
                        val folderPath = combinePaths(parentPath, torrentInfo.name())
                        log("METADATA_RECEIVED: ${torrentInfo.name()} Hash: ${torrentInfo.infoHash()} Folder: $folderPath")
                        downloadsInProgress[downloadId] = torrentInfo.infoHash()
                        alertData.putString("name", torrentInfo.name())
                        alertData.putString("folderLocation", folderPath)
                        alertData.putInt("totalSize", torrentInfo.totalSize().toInt())
                        emitDataToApp("TORRENT_INFO", downloadId, alertData)
                    }
                    AlertType.PIECE_FINISHED -> {
                        val torrentInfo: TorrentInfo = torrentHandle.torrentFile()
                        val status: TorrentStatus = torrentHandle.status()
                        val newProgress = (status.progress() * 100).toInt()
                        val downloadedSize = (torrentInfo.totalSize() * status.progress()).toInt()
                        val currentProgressEventTime = System.currentTimeMillis()
                        val downloadRate = session.downloadRate().toInt()
                        if (progress != newProgress && currentProgressEventTime - lastProgressEventTime > 500) {
                            progress = newProgress
                            lastProgressEventTime = currentProgressEventTime
                            val index = (alert as PieceFinishedAlert).pieceIndex()
                            log("Progress: $progress%, Rate: $downloadRate, Piece: $index")
                            alertData.putInt("downloadedSize", downloadedSize)
                            alertData.putInt("downloadRate", downloadRate)
                            alertData.putInt("peers", status.numPeers())
                            alertData.putInt("progress", progress)
                            alertData.putInt("seeders", status.numSeeds())
                            emitDataToApp("PIECE_FINISHED", downloadId, alertData)
                        }
                    }
                    AlertType.TORRENT_FINISHED -> {
                        (alert as TorrentFinishedAlert).handle().pause()
                        log("TORRENT_FINISHED: ${alert.message()}")
                        emitDataToApp("TORRENT_FINISHED", downloadId, alertData)
                        sessionManagers.remove(downloadId)
                        downloadsInProgress.remove(downloadId)
                        signal.countDown()
                    }
                    AlertType.TORRENT_ERROR,
                    AlertType.DHT_ERROR,
                    AlertType.FILE_ERROR,
                    AlertType.LSD_ERROR,
                    AlertType.PEER_ERROR,
                    AlertType.PORTMAP_ERROR,
                    AlertType.SESSION_ERROR,
                    AlertType.UDP_ERROR,
                    AlertType.METADATA_FAILED,
                    AlertType.FILE_RENAME_FAILED,
                    AlertType.TORRENT_DELETE_FAILED,
                    AlertType.SAVE_RESUME_DATA_FAILED,
                    AlertType.HASH_FAILED,
                    AlertType.LISTEN_FAILED,
                    AlertType.SCRAPE_FAILED,
                    AlertType.STORAGE_MOVED_FAILED -> {
                        log("TORRENT_ERROR: ${alert.what()}")
                        alertData.putString("error", alert.message())
                        emitDataToApp("TORRENT_ERROR", downloadId, alertData)
                        sessionManagers.remove(downloadId)
                        downloadsInProgress.remove(downloadId)
                        signal.countDown()
                    }
                    AlertType.TRACKER_ERROR -> {
                        log("UNHANDLED_ERROR: ${alert.what()}", "e")
                    }
                    else -> {
                        // no-op
                    }
                }
            }
        }
        session.addListener(listener)
    }

    private fun startSession(session: SessionManager) {
        val settingsPack = SettingsPack()
        val params = SessionParams(settingsPack)

        settingsPack.setString(
            settings_pack.string_types.dht_bootstrap_nodes.swigValue(),
            "router.silotis.us:6881"
        )
        settingsPack.setString(
            settings_pack.string_types.dht_bootstrap_nodes.swigValue(),
            "router.bittorrent.com:6881"
        )
        settingsPack.setString(
            settings_pack.string_types.dht_bootstrap_nodes.swigValue(),
            "dht.transmissionbt.com:6881"
        )

        if (!session.isRunning)
            session.start(params)
    }

    private fun emitDataToApp(eventType: String, downloadId: String, data: WritableMap) {
        data.putString("downloadId", downloadId)
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventType, data)
    }

    private fun getRootFolder(): File {
        return context.getExternalFilesDir(null) ?: context.filesDir
    }

    private fun removeFolder(path: String): Boolean {
        val folder = File(path)
        log("Folder to remove: ${folder.absolutePath}")
        return if (!folder.exists()) {
            true
        } else {
            deleteFolderRecursively(folder)
        }
    }

    private fun combinePaths(parent: String, child: String): String {
        return File(parent, child).absolutePath
    }

    private fun log(message: String) {
        log(message, "i")
    }

    private fun log(message: String, level: String) {
        when (level) {
            "d" -> Log.d(TAG, message)
            "i" -> Log.i(TAG, message)
            "e" -> Log.e(TAG, message)
            else -> Log.i(TAG, message)
        }
    }
}
