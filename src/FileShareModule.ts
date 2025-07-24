import { NativeModules } from 'react-native';

interface IFileShareModule {
  getSharedFiles(): Promise<Array<{
    uri: string;
    type?: string;
    name?: string;
    size?: number;
  }>>;
  clearSharedFiles(): void;
  getDebugInfo(): Promise<string>;
}

const { FileShareModule } = NativeModules;

// Fallback implementation for when the native module is not available
const fallbackModule: IFileShareModule = {
  getSharedFiles: () => Promise.resolve([]),
  clearSharedFiles: () => { },
  getDebugInfo: () => Promise.resolve('Module not available'),
};

export default (FileShareModule || fallbackModule) as IFileShareModule;
