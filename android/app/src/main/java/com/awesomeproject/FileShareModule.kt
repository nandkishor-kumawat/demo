package com.awesomeproject

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.*
import java.util.*
import kotlin.collections.ArrayList
import kotlin.collections.HashMap

class FileShareModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MODULE_NAME = "FileShareModule"
        private const val TAG = "FileShareModule"
        
        // Static storage for shared files using regular HashMap
        private val sharedFiles = mutableListOf<Map<String, String>>()
        private var lastIntentProcessed: String? = null
    }

    override fun getName(): String = MODULE_NAME

    // Helper function to get actual file name from URI
    private fun getFileName(uri: Uri): String? {
        var fileName: String? = null
        
        // Try to get name from content resolver first
        try {
            reactApplicationContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex != -1) {
                        fileName = cursor.getString(nameIndex)
                        Log.d(TAG, "Got file name from content resolver: $fileName")
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Could not get file name from content resolver: ${e.message}")
        }
        
        // Fallback to last path segment
        if (fileName == null) {
            fileName = uri.lastPathSegment
            Log.d(TAG, "Using last path segment as file name: $fileName")
        }
        
        return fileName
    }

    // Helper function to get file size from URI
    private fun getFileSize(uri: Uri): Long {
        var fileSize: Long = -1
        
        // Try to get size from content resolver
        try {
            reactApplicationContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (sizeIndex != -1) {
                        fileSize = cursor.getLong(sizeIndex)
                        Log.d(TAG, "Got file size from content resolver: $fileSize bytes")
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Could not get file size from content resolver: ${e.message}")
        }
        
        return fileSize
    }

    // Helper function to get actual MIME type for a URI
    private fun getMimeType(uri: Uri): String {
        var mimeType: String? = null
        
        // Try to get MIME type from content resolver first
        try {
            mimeType = reactApplicationContext.contentResolver.getType(uri)
            Log.d(TAG, "Got MIME type from content resolver: $mimeType")
        } catch (e: Exception) {
            Log.d(TAG, "Could not get MIME type from content resolver: ${e.message}")
        }
        
        // Fallback to file extension
        if (mimeType == null) {
            val fileExtension = MimeTypeMap.getFileExtensionFromUrl(uri.toString())
            if (fileExtension != null) {
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(fileExtension)
                Log.d(TAG, "Got MIME type from extension: $mimeType")
            }
        }
        
        // Final fallback
        return mimeType ?: "application/octet-stream"
    }

    // Helper function to get parcelable with API level compatibility
    private inline fun <reified T : android.os.Parcelable> Intent.getParcelableCompat(key: String): T? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(key, T::class.java)
        } else {
            @Suppress("DEPRECATION")
            getParcelableExtra(key)
        }
    }

    // Helper function to get parcelable array list with API level compatibility
    private inline fun <reified T : android.os.Parcelable> Intent.getParcelableArrayListCompat(key: String): ArrayList<T>? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableArrayListExtra(key, T::class.java)
        } else {
            @Suppress("DEPRECATION")
            getParcelableArrayListExtra(key)
        }
    }

    @ReactMethod
    fun getSharedFiles(promise: Promise) {
        try {
            Log.d(TAG, "getSharedFiles called")
            Log.d(TAG, "Static storage has ${sharedFiles.size} files")
            
            val activity = currentActivity as? MainActivity
            if (activity == null) {
                Log.d(TAG, "Activity is null, returning empty array")
                promise.resolve(Arguments.createArray())
                return
            }

            val intent = activity.intent
            val files = Arguments.createArray()

            if (intent != null) {
                val action = intent.action
                val type = intent.type
                
                Log.d(TAG, "Intent action: $action")
                Log.d(TAG, "Intent type: $type")
                Log.d(TAG, "Intent extras: ${intent.extras}")
                Log.d(TAG, "Intent data: ${intent.data}")

                // If we have files in storage, return them first
                if (sharedFiles.isNotEmpty()) {
                    Log.d(TAG, "Returning ${sharedFiles.size} files from static storage")
                    val filesArray = Arguments.createArray()
                    for (fileData in sharedFiles) {
                        val file = Arguments.createMap()
                        file.putString("uri", fileData["uri"])
                        file.putString("type", fileData["type"])
                        fileData["name"]?.let { file.putString("name", it) }
                        fileData["size"]?.let { 
                            val size = it.toLongOrNull()
                            if (size != null && size > 0) {
                                file.putDouble("size", size.toDouble())
                            }
                        }
                        filesArray.pushMap(file)
                    }
                    promise.resolve(filesArray)
                    return
                }

                // Create a unique identifier for this intent
                val intentId = "${action}_${intent.data}_${intent.getParcelableCompat<Uri>(Intent.EXTRA_STREAM)}_${intent.getParcelableArrayListCompat<Uri>(Intent.EXTRA_STREAM)?.size}"
                Log.d(TAG, "Intent ID: $intentId, Last processed: $lastIntentProcessed")

                // Process sharing intents
                if (action == Intent.ACTION_SEND || action == Intent.ACTION_SEND_MULTIPLE || action == Intent.ACTION_VIEW) {
                    
                    // Only skip if we've already processed this exact intent
                    if (intentId == lastIntentProcessed) {
                        Log.d(TAG, "Already processed this intent, returning empty")
                        promise.resolve(Arguments.createArray())
                        return
                    }
                    
                    Log.d(TAG, "Processing sharing intent")
                    sharedFiles.clear() // Clear old files
                    lastIntentProcessed = intentId

                    when (action) {
                        Intent.ACTION_SEND -> {
                            Log.d(TAG, "Handling single file sharing")
                            val fileUri = intent.getParcelableCompat<Uri>(Intent.EXTRA_STREAM)
                            if (fileUri != null) {
                                Log.d(TAG, "Single file URI: $fileUri")
                                
                                val file = Arguments.createMap()
                                val actualMimeType = getMimeType(fileUri)
                                val fileName = getFileName(fileUri)
                                val fileSize = getFileSize(fileUri)
                                
                                file.putString("uri", fileUri.toString())
                                file.putString("type", actualMimeType)
                                fileName?.let { file.putString("name", it) }
                                if (fileSize > 0) {
                                    file.putDouble("size", fileSize.toDouble())
                                }
                                
                                files.pushMap(file)
                                
                                // Store in static storage as HashMap
                                val fileData = hashMapOf<String, String>()
                                fileData["uri"] = fileUri.toString()
                                fileData["type"] = actualMimeType
                                fileName?.let { fileData["name"] = it }
                                if (fileSize > 0) {
                                    fileData["size"] = fileSize.toString()
                                }
                                sharedFiles.add(fileData)
                                Log.d(TAG, "Added new single file to static storage. Name: $fileName, Type: $actualMimeType, Size: $fileSize bytes")
                            } else {
                                Log.d(TAG, "Single file URI is null")
                            }
                        }
                        Intent.ACTION_SEND_MULTIPLE -> {
                            Log.d(TAG, "Handling multiple files sharing")
                            val fileUris = intent.getParcelableArrayListCompat<Uri>(Intent.EXTRA_STREAM)
                            if (fileUris != null && fileUris.isNotEmpty()) {
                                Log.d(TAG, "Found ${fileUris.size} files in EXTRA_STREAM")
                                
                                fileUris.forEachIndexed { index, uri ->
                                    Log.d(TAG, "Processing file ${index + 1}: $uri")
                                    
                                    val file = Arguments.createMap()
                                    val actualMimeType = getMimeType(uri)
                                    val fileName = getFileName(uri)
                                    val fileSize = getFileSize(uri)
                                    
                                    file.putString("uri", uri.toString())
                                    file.putString("type", actualMimeType)
                                    fileName?.let { file.putString("name", it) }
                                    if (fileSize > 0) {
                                        file.putDouble("size", fileSize.toDouble())
                                    }
                                    
                                    files.pushMap(file)
                                    
                                    // Store in static storage as HashMap
                                    val fileData = hashMapOf<String, String>()
                                    fileData["uri"] = uri.toString()
                                    fileData["type"] = actualMimeType
                                    fileName?.let { fileData["name"] = it }
                                    if (fileSize > 0) {
                                        fileData["size"] = fileSize.toString()
                                    }
                                    sharedFiles.add(fileData)
                                    Log.d(TAG, "Added multiple file ${index + 1} to static storage. Name: $fileName, Type: $actualMimeType, Size: $fileSize bytes")
                                }
                            } else {
                                Log.d(TAG, "File URIs list is null or empty")
                            }
                        }
                        Intent.ACTION_VIEW -> {
                            if (intent.data != null) {
                                Log.d(TAG, "Handling file view")
                                val fileUri = intent.data
                                if (fileUri != null) {
                                    Log.d(TAG, "View file URI: $fileUri")
                                    
                                    val file = Arguments.createMap()
                                    val actualMimeType = getMimeType(fileUri)
                                    val fileName = getFileName(fileUri)
                                    val fileSize = getFileSize(fileUri)
                                    
                                    file.putString("uri", fileUri.toString())
                                    file.putString("type", actualMimeType)
                                    fileName?.let { file.putString("name", it) }
                                    if (fileSize > 0) {
                                        file.putDouble("size", fileSize.toDouble())
                                    }
                                    
                                    files.pushMap(file)
                                    
                                    // Store in static storage as HashMap
                                    val fileData = hashMapOf<String, String>()
                                    fileData["uri"] = fileUri.toString()
                                    fileData["type"] = actualMimeType
                                    fileName?.let { fileData["name"] = it }
                                    if (fileSize > 0) {
                                        fileData["size"] = fileSize.toString()
                                    }
                                    sharedFiles.add(fileData)
                                    Log.d(TAG, "Added new view file to static storage. Name: $fileName, Type: $actualMimeType, Size: $fileSize bytes")
                                }
                            }
                        }
                    }
                } else {
                    Log.d(TAG, "Not a sharing intent. Action: $action")
                }
            } else {
                Log.d(TAG, "Intent is null")
            }

            Log.d(TAG, "Returning ${files.size()} files from intent processing")
            Log.d(TAG, "Static storage now has ${sharedFiles.size} files")
            promise.resolve(files)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting shared files", e)
            promise.reject("ERROR", "Failed to get shared files", e)
        }
    }

    @ReactMethod
    fun clearSharedFiles() {
        try {
            Log.d(TAG, "clearSharedFiles called")
            
            // Clear static storage
            sharedFiles.clear()
            lastIntentProcessed = null
            
            val activity = currentActivity as? MainActivity
            if (activity != null) {
                val intent = activity.intent
                if (intent != null) {
                    intent.removeExtra(Intent.EXTRA_STREAM)
                    intent.action = Intent.ACTION_MAIN
                    intent.type = null
                    intent.data = null
                    Log.d(TAG, "Cleared shared files from intent")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing shared files", e)
        }
    }

    @ReactMethod
    fun getDebugInfo(promise: Promise) {
        try {
            val debug = StringBuilder()
            debug.append("Static storage files: ${sharedFiles.size}\n")
            
            val activity = currentActivity as? MainActivity
            if (activity != null) {
                val intent = activity.intent
                if (intent != null) {
                    debug.append("Intent action: ${intent.action}\n")
                    debug.append("Intent type: ${intent.type}\n")
                    debug.append("Intent data: ${intent.data}\n")
                    debug.append("Intent extras: ${intent.extras}\n")
                    
                    if (Intent.ACTION_SEND_MULTIPLE == intent.action) {
                        val fileUris = intent.getParcelableArrayListCompat<Uri>(Intent.EXTRA_STREAM)
                        debug.append("EXTRA_STREAM files: ${fileUris?.size ?: "null"}\n")
                    }
                } else {
                    debug.append("Intent is null\n")
                }
            } else {
                debug.append("Activity is null\n")
            }
            
            promise.resolve(debug.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get debug info", e)
        }
    }
}
