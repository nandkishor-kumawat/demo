import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity } from 'react-native';
import { BottomSheet } from './bs/BottomSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CreateProperty from './CreateProperty';

const BottomSheetDemo = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedSnapPoint, setSelectedSnapPoint] = useState(0);

  const snapPoints = [0.3, 0.6, 0.9]; // 30%, 60% and 90% of screen height

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bottom Sheet Demo</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Open Bottom Sheet (30%)"
          onPress={() => {
            setSelectedSnapPoint(0);
            setIsVisible(true);
          }}
        />
        <View style={styles.spacer} />
        <Button
          title="Open Bottom Sheet (60%)"
          onPress={() => {
            setSelectedSnapPoint(1);
            setIsVisible(true);
          }}
        />
        <View style={styles.spacer} />
        <Button
          title="Open Bottom Sheet (90%)"
          onPress={() => {
            setSelectedSnapPoint(2);
            setIsVisible(true);
          }}
        />
      </View>

      {isVisible && (
        <GestureHandlerRootView style={{ flex: 1 }}>

          <BottomSheet
            snapPoints={snapPoints}
            index={selectedSnapPoint}
          >
            <CreateProperty onCreateProperty={() => { }} />
          </BottomSheet>
        </GestureHandlerRootView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    marginVertical: 10,
  },
  spacer: {
    height: 10,
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  scrollContent: {
    flex: 1,
    marginBottom: 15,
  },
  item: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default BottomSheetDemo;
