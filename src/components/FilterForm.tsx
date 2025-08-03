import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { PropertyFilter } from '../types/Property';

interface FilterFormProps {
  onApplyFilter: (filter: PropertyFilter) => void;
  onClearFilter: () => void;
}

const FilterForm: React.FC<FilterFormProps> = ({ onApplyFilter, onClearFilter }) => {
  const [filter, setFilter] = useState<PropertyFilter>({
    name: '',
    type: '',
    subtype: '',
    category: '',
    address: '',
  });

  const handleApplyFilter = () => {
    const activeFilter = Object.fromEntries(
      Object.entries(filter).filter(([_, value]) => value.trim() !== '')
    );
    onApplyFilter(activeFilter);
    Alert.alert('Filter Applied', 'Properties filtered successfully');
  };

  const handleClearFilter = () => {
    setFilter({
      name: '',
      type: '',
      subtype: '',
      category: '',
      address: '',
    });
    onClearFilter();
    Alert.alert('Filter Cleared', 'All filters removed');
  };

  const updateFilter = (field: keyof PropertyFilter, value: string) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filter Properties</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Property Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter property name..."
          value={filter.name || ''}
          onChangeText={(value) => updateFilter('name', value)}
        />

        <Text style={styles.label}>Property Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Residential, Commercial..."
          value={filter.type || ''}
          onChangeText={(value) => updateFilter('type', value)}
        />

        <Text style={styles.label}>Subtype</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Apartment, House, Office..."
          value={filter.subtype || ''}
          onChangeText={(value) => updateFilter('subtype', value)}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., For Sale, For Rent..."
          value={filter.category || ''}
          onChangeText={(value) => updateFilter('category', value)}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter address or location..."
          value={filter.address || ''}
          onChangeText={(value) => updateFilter('address', value)}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilter}>
            <Text style={styles.buttonText}>Apply Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={handleClearFilter}>
            <Text style={styles.buttonText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 15,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterForm;
