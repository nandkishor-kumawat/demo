import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import FileShareModule from './FileShareModule';
import FileShareDemo from './FileShareDemo';

const FileShareManager: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [checkingFiles, setCheckingFiles] = useState(false);

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
      FileShareModule.clearSharedFiles();
    };
  }, []);

  const checkForSharedFiles = async () => {
    if (checkingFiles) return; // Prevent multiple simultaneous checks

    try {
      setCheckingFiles(true);
      console.log('Checking for shared files...');

      // Check if the module exists
      if (!FileShareModule) {
        console.error('FileShareModule is not available');
        return;
      }

      const files = await FileShareModule.getSharedFiles();
      console.log('Files received:', files);

      if (files && files.length > 0) {
        console.log(`Found ${files.length} shared files, showing modal`);
        setShowModal(true);
      } else {
        console.log('No files found');
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error getting shared files:', error);
    } finally {
      setCheckingFiles(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Clear shared files when modal is closed
    FileShareModule.clearSharedFiles();
  };

  return (
    <FileShareDemo
      visible={showModal}
      onClose={handleCloseModal}
    />
  );
};

export default FileShareManager;
