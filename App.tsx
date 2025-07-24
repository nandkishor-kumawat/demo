import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import FileShareModule from './src/FileShareModule';

interface SharedFile {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
}

const App = () => {
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ [key: string]: { success: boolean, message: string } }>({});

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to upload a single file
  const uploadFile = async (file: SharedFile): Promise<{ success: boolean, message: string }> => {
    try {
      const formData = new FormData();

      // Add the file to FormData
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'unknown_file',
      } as any);

      const response = await fetch('https://api.nandkishor.in/api/v1/file/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseText = await response.text();
      console.log(`Upload response for ${file.name}:`, responseText);

      if (response.ok) {
        return { success: true, message: 'Upload successful' };
      } else {
        return { success: false, message: `Upload failed: ${response.status} ${responseText}` };
      }
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      return { success: false, message: `Upload error: ${error instanceof Error ? error.message : String(error)}` };
    }
  };

  // Function to upload all shared files
  const uploadAllFiles = async () => {
    if (sharedFiles.length === 0) {
      Alert.alert('No Files', 'No files to upload');
      return;
    }

    setUploading(true);
    setUploadResults({});

    try {
      const results: { [key: string]: { success: boolean, message: string } } = {};

      // Upload files sequentially to avoid overwhelming the server
      for (const file of sharedFiles) {
        console.log(`Uploading file: ${file.name}`);
        const result = await uploadFile(file);
        results[file.uri] = result;
        setUploadResults({ ...results }); // Update UI progressively
      }

      // Show final results
      const successCount = Object.values(results).filter(r => r.success).length;
      const failCount = sharedFiles.length - successCount;

      Alert.alert(
        'Upload Complete',
        `Successfully uploaded: ${successCount}\nFailed uploads: ${failCount}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error during bulk upload:', error);
      Alert.alert('Upload Error', `Failed to upload files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // Check for shared files when app starts
    checkForSharedFiles();

    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, checking for shared files...');
        checkForSharedFiles();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkForSharedFiles = async () => {
    try {
      setLoading(true);
      console.log('Checking for shared files...');

      // Check if the module exists
      if (!FileShareModule) {
        console.error('FileShareModule is not available');
        Alert.alert('Error', 'FileShareModule is not available. Make sure the native module is properly built.');
        return;
      }

      const files = await FileShareModule.getSharedFiles();
      console.log('Files received:', files);

      if (files && files.length > 0) {
        setSharedFiles(files);
        const message = files.length === 1
          ? `Received 1 file from another app: ${files[0].name || 'Unknown file'}`
          : `Received ${files.length} files from another app`;
        Alert.alert(
          'Files Received',
          message,
          [{ text: 'OK' }]
        );
      } else {
        console.log('No files found');
      }
    } catch (error) {
      console.error('Error getting shared files:', error);
      Alert.alert('Error', `Failed to get shared files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFiles = () => {
    FileShareModule.clearSharedFiles();
    setSharedFiles([]);
  };

  const renderFile = ({ item, index }: { item: SharedFile; index: number }) => {
    const uploadResult = uploadResults[item.uri];

    return (
      <View style={styles.fileItem}>
        <Text style={styles.fileName}>
          📄 File {index + 1}: {item.name || 'Unknown file'}
        </Text>
        <Text style={styles.fileType}>📋 Type: {item.type || 'Unknown'}</Text>
        {item.size && item.size > 0 && (
          <Text style={styles.fileSize}>📏 Size: {formatFileSize(item.size)}</Text>
        )}
        {uploadResult && (
          <Text style={[styles.uploadStatus, { color: uploadResult.success ? '#34C759' : '#FF3B30' }]}>
            {uploadResult.success ? '✅ Uploaded' : '❌ Upload failed'}
            {!uploadResult.success && `: ${uploadResult.message}`}
          </Text>
        )}
        <Text style={styles.fileUri} numberOfLines={3}>
          🔗 URI: {item.uri}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>File Share Demo</Text>
        <Text style={styles.subtitle}>
          Share files to this app from other apps
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking for shared files...</Text>
        </View>
      )}

      {sharedFiles.length > 0 ? (
        <View style={styles.content}>
          <View style={styles.fileHeader}>
            <Text style={styles.fileCount}>
              {sharedFiles.length} file(s) received
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.disabledButton]}
                onPress={uploadAllFiles}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Upload All'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={clearFiles}>
                <Text style={styles.clearButtonText}>Clear Files</Text>
              </TouchableOpacity>
            </View>
          </View>
          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.uploadingText}>Uploading files to server...</Text>
            </View>
          )}
          <FlatList
            data={sharedFiles}
            renderItem={renderFile}
            keyExtractor={(item, index) => `${item.uri}_${index}`}
            style={styles.fileList}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No files shared yet. Try sharing a file from another app to this app!
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={checkForSharedFiles}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#34C759', marginTop: 10 }]}
            onPress={() => {
              console.log('Testing FileShareModule availability...');
              console.log('FileShareModule:', FileShareModule);
              if (FileShareModule) {
                console.log('Module methods:', Object.keys(FileShareModule));
              }
            }}
          >
            <Text style={styles.refreshButtonText}>Test Module</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: '#FF9500', marginTop: 10 }]}
            onPress={async () => {
              try {
                const debugInfo = await FileShareModule.getDebugInfo();
                Alert.alert('Debug Info', debugInfo);
                console.log('Debug Info:', debugInfo);
              } catch (error) {
                Alert.alert('Debug Error', `Failed to get debug info: ${error}`);
              }
            }}
          >
            <Text style={styles.refreshButtonText}>Debug Info</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  fileCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  fileType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  uploadStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  fileUri: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 5,
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default App;