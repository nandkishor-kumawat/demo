import React from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { BottomSheet } from './src/components/bs/BottomSheet';
import { TouchableOpacity } from 'react-native';
import CreateProperty from './src/components/CreateProperty';

const App = () => {
  const ref = React.useRef<BottomSheet>(null);

  const onPress = () => {
    const isOpen = (ref.current?.getCurrentSnapIndex() || 0) > 0;
    console.log(ref.current?.getCurrentSnapIndex(), isOpen);
    if (isOpen) {
      ref.current?.collapse();
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
        snapPoints={[120, "50%", "85%"]}
        onSnapChange={(index) => {
          console.log('Snap changed to index:', index);
        }}
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