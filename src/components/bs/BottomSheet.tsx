import { Dimensions, StyleSheet, View } from 'react-native'
import React, { useCallback, useEffect, useImperativeHandle } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { runOnJS } from 'react-native-worklets'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

export type BottomSheet = {
  isOpen: () => boolean;
  snapToIndex: (index: number) => void;
  close: () => void;
  collapse: () => void;
  getCurrentSnapIndex: () => number;
}

interface BottomSheetProps {
  ref?: React.RefObject<BottomSheet | null>;
  children?: React.ReactNode;
  snapPoints?: Array<number | `${number}%`>;
  initialSnapIndex?: number;
  closeIndex?: number;
  onSnapChange?: (index: number) => void;
}

export function BottomSheet({
  ref,
  children,
  snapPoints = ['50%', '85%'],
  initialSnapIndex = 0,
  closeIndex = -1,
  onSnapChange,
}: BottomSheetProps) {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const currentSnapIndex = useSharedValue(initialSnapIndex);
  const containerHeight = useSharedValue(0);

  const resolvedSnapPoints = snapPoints.map(point => {
    if (typeof point === 'number') {
      return -point;
    } else if (typeof point === 'string' && point.endsWith('%')) {
      return (parseFloat(point) / 100) * MAX_TRANSLATE_Y;
    }
    return 0;
  }).sort((a, b) => b - a);

  const scrollTo = useCallback((destination: number) => {
    'worklet';

    const index = resolvedSnapPoints.findIndex(p => Math.abs(p - destination) < 1);
    currentSnapIndex.value = index;

    if (index !== -1) {
      containerHeight.value = Math.abs(resolvedSnapPoints[index]);
    }
    if (onSnapChange) {
      runOnJS(onSnapChange)(index);
    }
    translateY.value = withSpring(destination, {});
  }, [resolvedSnapPoints]);

  const snapToIndex = useCallback((index: number) => {
    'worklet';
    let snapPoint = 0;
    if (index < 0) snapPoint = 0;
    else if (index >= resolvedSnapPoints.length) snapPoint = MAX_TRANSLATE_Y;
    else snapPoint = resolvedSnapPoints[index];
    scrollTo(snapPoint);
  }, [resolvedSnapPoints]);

  const isOpen = useCallback(() => {
    return currentSnapIndex.value !== closeIndex;
  }, [currentSnapIndex, closeIndex]);

  useImperativeHandle(ref, () => ({
    isOpen,
    snapToIndex,
    close: () => snapToIndex(closeIndex),
    collapse: () => snapToIndex(0),
    getCurrentSnapIndex: () => currentSnapIndex.value,
  }), [isOpen, snapToIndex, closeIndex]);


  const gesture = Gesture.Pan()
    .onStart((event) => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const isMovingUp = event.velocityY < 0;
      let snapIndex = -1;
      let snapPoint = 0;

      if (currentY <= resolvedSnapPoints[resolvedSnapPoints.length - 1]) {
        snapPoint = resolvedSnapPoints[resolvedSnapPoints.length - 1];
      } else if (currentY >= resolvedSnapPoints[0] || !isMovingUp) {
        snapPoint = resolvedSnapPoints[0];
      } else {
        for (let i = 0; i < resolvedSnapPoints.length - 1; i++) {
          if (currentY <= resolvedSnapPoints[i] && currentY >= resolvedSnapPoints[i + 1]) {
            snapPoint = isMovingUp ? resolvedSnapPoints[i + 1] : resolvedSnapPoints[i];
            break;
          }
        }
      }

      snapIndex = resolvedSnapPoints.findIndex(point => point === snapPoint);
      currentSnapIndex.value = snapIndex;
      scrollTo(snapPoint);
    });


  useEffect(() => {
    snapToIndex(initialSnapIndex);
  }, [initialSnapIndex, snapToIndex]);


  const animatedBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: containerHeight.value - 50,
    };
  });


  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.bottomSheetContainer, animatedBottomSheetStyle]}>
        <View style={styles.header}>
          <View style={styles.indicator} />
        </View>
        <Animated.View style={[animatedContainerStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  bottomSheetContainer: {
    position: 'absolute',
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 25,
    top: SCREEN_HEIGHT,
  },
  header: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.5,
    backgroundColor: '#f8f8f8',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  indicator: {
    width: 75,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2.5,
  },
})