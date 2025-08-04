import { Dimensions, Keyboard, StyleSheet, View, KeyboardEvent } from 'react-native'
import React, { useCallback, useEffect, useImperativeHandle } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { runOnJS } from 'react-native-worklets'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;

type Config = {
  animateFromBottom?: boolean;
}

export type BottomSheet = {
  isOpen: () => boolean;
  snapToIndex: (index: number, config?: Config) => void;
  close: () => void;
  collapse: () => void;
  getCurrentSnapIndex: () => number;
}

interface BottomSheetProps {
  ref?: React.RefObject<BottomSheet | null>;
  children?: React.ReactNode;
  snapPoints?: Array<number | `${number}%`>;
  index?: number;
  closeIndex?: number;
  onChange?: (index: number) => void;
  bottomInset?: number;
}

export function BottomSheet({
  ref,
  children,
  snapPoints = ['50%', '85%'],
  index: initialSnapIndex = -1,
  closeIndex = -1,
  onChange,
  bottomInset = 0
}: BottomSheetProps) {
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const currentSnapIndex = useSharedValue(initialSnapIndex);
  const isFirstRender = useSharedValue(false);
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

    let index = resolvedSnapPoints.findIndex(p => Math.abs(p - destination) < 1);
    if (destination === MAX_TRANSLATE_Y) {
      index = snapPoints.length;
      containerHeight.value = Math.abs(destination);
    } else if (index !== -1) {
      containerHeight.value = Math.abs(resolvedSnapPoints[index]);
    }
    currentSnapIndex.value = index;

    if (onChange) runOnJS(onChange)(index);
    translateY.value = withSpring(destination, {});
  }, [resolvedSnapPoints]);

  const snapToIndex = useCallback((index: number, config?: Config) => {
    'worklet';
    let snapPoint = 0;
    if (index < 0) snapPoint = 0;
    else if (index >= resolvedSnapPoints.length) snapPoint = MAX_TRANSLATE_Y;
    else snapPoint = resolvedSnapPoints[index];

    if (config?.animateFromBottom) {
      translateY.value = 0;
      requestAnimationFrame(() => {
        'worklet';
        scrollTo(snapPoint);
      });
    } else {
      scrollTo(snapPoint);
    }
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
    if (!isFirstRender.value) {
      snapToIndex(initialSnapIndex);
      isFirstRender.value = true;
      console.log("calling snapToIndex with", initialSnapIndex);
    }
  }, [initialSnapIndex, snapToIndex]);


  const animatedBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });
  const isKeyboardOpen = useSharedValue(false);
  const keyboardHeight = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      height: containerHeight.value - 40,
      paddingBottom: isKeyboardOpen.value ? keyboardHeight.value : bottomInset,
    };
  });


  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      isKeyboardOpen.value = true;
      keyboardHeight.value = event.endCoordinates.height + 20;
      if (currentSnapIndex.value) {
        scrollTo(MAX_TRANSLATE_Y)
      }
    };

    const handleKeyboardHide = () => {
      isKeyboardOpen.value = false;
      snapToIndex(snapPoints.length - 1);
      keyboardHeight.value = 0;
    };

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [snapPoints, snapToIndex]);


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