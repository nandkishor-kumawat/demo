import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PropertyTabNavigator from './src/navigation/PropertyTabNavigator';
import FileShareManager from './src/FileShareManager';
import "react-native-reanimated";

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Main Property Management Content */}
        <PropertyTabNavigator />

        {/* File Share Manager (Modal) - Always present */}
        <FileShareManager />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;