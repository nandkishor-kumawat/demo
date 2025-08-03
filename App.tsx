import React from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetMethods } from './src/components/BottomSheet';
import { TouchableOpacity } from 'react-native';
import CreateProperty from './src/components/CreateProperty';

const App = () => {
  const ref = React.useRef<BottomSheetMethods>(null);

  const onPress = () => {
    const isOpen = ref.current?.isOpen();
    if (isOpen) {
      ref.current?.close();
    } else {
      ref.current?.snapToIndex(1);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableOpacity onPress={onPress}
        style={{
          width: 50,
          height: 50,
          borderRadius: 1000,
          backgroundColor: 'white',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
        }} />
      <BottomSheet
        ref={ref}
        initialSnapIndex={0}
        snapPoints={[120, "50%", "80%"]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onMomentumScrollBegin={e => {
            const y = e.nativeEvent.contentOffset.y;
            const velocityY = e.nativeEvent.velocity?.y || 0;
            if (y === 0 && velocityY > 5) {
              ref.current?.snapToIndex(0);
            }
          }}
        >
          <CreateProperty onCreateProperty={() => { }} />
        </ScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  )
}

export default App;