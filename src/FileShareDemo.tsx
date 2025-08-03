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
  Modal,
} from 'react-native';
import FileShareModule from './FileShareModule';

interface SharedFile {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
}

interface FileShareDemoProps {
  visible: boolean;
  onClose: () => void;
}

const FileShareDemo: React.FC<FileShareDemoProps> = ({ visible, onClose }) => {
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
    // Check for shared files when component mounts or becomes visible
    if (visible) {
      checkForSharedFiles();
    }

    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && visible) {
        console.log('App became active, checking for shared files...');
        checkForSharedFiles();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [visible]);

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
    onClose(); // Close the modal when files are cleared
  };

  const renderFile = ({ item, index }: { item: SharedFile; index: number }) => {
    const uploadResult = uploadResults[item.uri];

    return (
      <View style={styles.fileItem}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
          📄 {item.name || 'Unknown file'}
        </Text>
        <Text style={styles.fileType}>📋 Type: {item.type || 'Unknown'}</Text>
        {item.size && item.size > 0 && (
          <Text style={styles.fileSize}>📏 Size: {formatFileSize(item.size)}</Text>
        )}
        {uploadResult && (
          <View style={[
            styles.uploadStatus,
            { backgroundColor: uploadResult.success ? '#d1fae5' : '#fee2e2' }
          ]}>
            <Text style={{
              color: uploadResult.success ? '#065f46' : '#991b1b',
              fontSize: 14,
              fontWeight: '700',
            }}>
              {uploadResult.success ? '✅ Uploaded Successfully' : '❌ Upload Failed'}
            </Text>
            {!uploadResult.success && (
              <Text style={{
                color: '#991b1b',
                fontSize: 12,
                marginTop: 2,
              }}>
                {uploadResult.message}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
      backdropColor={'rgba(0, 0, 0, 0.3)'}
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>File Share Demo</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalContent: {
    width: "90%",
    height: "90%",
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fileHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  fileCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  uploadButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  clearButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  fileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  fileType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  uploadStatus: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
  },
  fileUri: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  uploadingText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default FileShareDemo;