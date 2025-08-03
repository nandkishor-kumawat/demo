import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import FilterForm from '../components/FilterForm';
import CreateProperty from '../components/CreateProperty';
import Profile from '../components/Profile';
import { Property, PropertyFilter } from '../types/Property';

type TabType = 'filter' | 'create' | 'profile';

const PropertyTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('filter');
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);

  // Bottom sheet refs and state
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [120, '50%', '80%'], []);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
    setCurrentSnapIndex(Math.max(0, Math.min(index, snapPoints.length - 1)));
  }, [snapPoints]);

  const handleApplyFilter = (filter: PropertyFilter) => {
    const filtered = properties.filter(property => {
      return Object.entries(filter).every(([key, value]) => {
        if (!value) return true;
        const propertyValue = property[key as keyof Property];
        if (typeof propertyValue === 'string') {
          return propertyValue.toLowerCase().includes(value.toLowerCase());
        }
        return true;
      });
    });
    setFilteredProperties(filtered);
  };

  const handleClearFilter = () => {
    setFilteredProperties(properties);
  };

  const handleCreateProperty = (property: Property) => {
    setProperties(prev => [...prev, property]);
    setFilteredProperties(prev => [...prev, property]);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'filter':
        return (
          <FilterForm
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleClearFilter}
          />
        );
      case 'create':
        return <CreateProperty onCreateProperty={handleCreateProperty} />;
      case 'profile':
        return <Profile />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{
    tab: TabType;
    title: string;
    icon: string;
  }> = ({ tab, title, icon }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton,
      ]}
      onPress={() => {
        if (activeTab === tab) {
          // Toggle: if same tab is clicked, toggle between 120px and 50%
          if (currentSnapIndex === 0) {
            bottomSheetRef.current?.snapToIndex(1); // Open to 50%
          } else {
            bottomSheetRef.current?.snapToIndex(0); // Close to 120px
          }
        } else {
          // Different tab: switch content and open to 50%
          setActiveTab(tab);
          bottomSheetRef.current?.snapToIndex(1);
        }
      }}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text
        style={[
          styles.tabText,
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const windowHeight = Dimensions.get('window').height;

  const snapValue = snapPoints[currentSnapIndex];
  const height = (parseFloat(snapValue) / 100) * windowHeight;

  console.log(currentSnapIndex, snapValue, height);
  return (
    <View style={styles.container}>
      {/* Map Background */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
        }}
        style={styles.mapBackground}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.mapOverlay}>
            <View style={styles.mainContent}>
              <Text style={styles.title}>Property Management</Text>
              <Text style={styles.subtitle}>
                Select a tab below to {activeTab === 'filter' ? 'filter properties' :
                  activeTab === 'create' ? 'create new property' : 'manage your profile'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={true}
      >
        <BottomSheetView
          style={{
            height: Math.min(height, windowHeight * 0.8)
          }}
        >
          <BottomSheetScrollView
            style={styles.bottomSheetContent}
            contentContainerStyle={styles.bottomSheetScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {renderTabContent()}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>

      {/* Bottom Tab Navigator - Always on top */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TabButton tab="filter" title="Filter" icon="🔍" />
          <TabButton tab="create" title="Create" icon="➕" />
          <TabButton tab="profile" title="Profile" icon="👤" />
        </View>
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  mapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark overlay for better text readability
  },
  content: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff', // White text for better contrast on map
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff', // White text for better contrast on map
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Ensure it stays on top
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
    paddingTop: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },
  bottomSheetIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
  },
  bottomSheetScrollContent: {
    paddingBottom: 150,
  },
});

export default PropertyTabNavigator;
