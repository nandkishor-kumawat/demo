import React from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { BottomSheet } from './src/components/bs/BottomSheet';
import { TouchableOpacity, View } from 'react-native';
import CreateProperty from './src/components/CreateProperty';
import PropertyTabNavigator from './src/navigation/PropertyTabNavigator';

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
    <View style={{ flex: 1 }}>
      <PropertyTabNavigator />
    </View>
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          width: "100%",
          position: 'absolute',
          top: 50,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
        }} >
        <TouchableOpacity
          onPress={() => ref.current?.snapToIndex(1, { animateFromBottom: true })}
          style={{ padding: 20, backgroundColor: 'blue', borderRadius: 10, width: 50, height: 50 }} />
        <TouchableOpacity
          onPress={() => ref.current?.snapToIndex(1, { animateFromBottom: true })}
          style={{ padding: 20, backgroundColor: 'green', borderRadius: 10, width: 50, height: 50 }} />
        <TouchableOpacity
          onPress={() => ref.current?.snapToIndex(1, { animateFromBottom: true })}
          style={{ padding: 20, backgroundColor: 'yellow', borderRadius: 10, width: 50, height: 50 }} />
      </View>
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={[120, "50%", "85%"]}
        onChange={(index) => {
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