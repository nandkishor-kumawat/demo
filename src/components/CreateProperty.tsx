import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Property, PropertyOwner, PropertyDocument } from '../types/Property';
import ContactModule, { type Contact } from '../ContactModule';

interface CreatePropertyProps {
  onCreateProperty: (property: Property) => void;
}

const CreateProperty: React.FC<CreatePropertyProps> = ({ onCreateProperty }) => {
  // Property types and subtypes data for react-native-dropdown-picker
  const propertyTypeItems = [
    { label: 'Residential', value: 'Residential' },
    { label: 'Commercial', value: 'Commercial' },
    { label: 'Industrial', value: 'Industrial' },
    { label: 'Agricultural', value: 'Agricultural' },
    { label: 'Mixed-Use', value: 'Mixed-Use' },
    { label: 'Vacant Land', value: 'Vacant Land' }
  ];

  const propertySubtypeItems: { [key: string]: Array<{ label: string, value: string }> } = {
    'Residential': [
      { label: 'House', value: 'House' },
      { label: 'Apartment', value: 'Apartment' },
      { label: 'Condo', value: 'Condo' },
      { label: 'Townhouse', value: 'Townhouse' },
      { label: 'Villa', value: 'Villa' },
      { label: 'Studio', value: 'Studio' }
    ],
    'Commercial': [
      { label: 'Office', value: 'Office' },
      { label: 'Retail', value: 'Retail' },
      { label: 'Restaurant', value: 'Restaurant' },
      { label: 'Warehouse', value: 'Warehouse' },
      { label: 'Shopping Center', value: 'Shopping Center' }
    ],
    'Industrial': [
      { label: 'Factory', value: 'Factory' },
      { label: 'Warehouse', value: 'Warehouse' },
      { label: 'Manufacturing', value: 'Manufacturing' },
      { label: 'Distribution Center', value: 'Distribution Center' }
    ],
    'Agricultural': [
      { label: 'Farm', value: 'Farm' },
      { label: 'Ranch', value: 'Ranch' },
      { label: 'Orchard', value: 'Orchard' },
      { label: 'Vineyard', value: 'Vineyard' }
    ],
    'Mixed-Use': [
      { label: 'Residential + Commercial', value: 'Residential + Commercial' },
      { label: 'Office + Retail', value: 'Office + Retail' }
    ],
    'Vacant Land': [
      { label: 'Buildable Lot', value: 'Buildable Lot' },
      { label: 'Agricultural Land', value: 'Agricultural Land' },
      { label: 'Development Site', value: 'Development Site' }
    ]
  };

  const [property, setProperty] = useState<Partial<Property>>({
    name: '',
    type: '',
    subtype: '',
    category: '',
    description: '',
    address: '',
    phoneNumber: '',
    email: '',
    owners: [],
    documents: [],
  });

  const [newOwner, setNewOwner] = useState<PropertyOwner>({
    ownerContact: '',
    ownerName: '',
  });

  const [newDocument, setNewDocument] = useState<PropertyDocument>({
    name: '',
    type: '',
    url: '',
  });

  // Dropdown states for react-native-dropdown-picker
  const [typeOpen, setTypeOpen] = useState(false);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [typeValue, setTypeValue] = useState<string | null>(null);
  const [subtypeValue, setSubtypeValue] = useState<string | null>(null);
  const [typeItems, setTypeItems] = useState(propertyTypeItems);
  const [subtypeItems, setSubtypeItems] = useState<Array<{ label: string, value: string }>>([]);

  // Permission handling function
  const requestContactsPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS permissions are handled by the native module
  };

  const updateProperty = (field: keyof Property, value: string) => {
    setProperty(prev => ({ ...prev, [field]: value }));
    // Reset subtype when type changes and update subtype items
    if (field === 'type') {
      setProperty(prev => ({ ...prev, subtype: '' }));
      setSubtypeValue(null);
      setSubtypeItems(propertySubtypeItems[value] || []);
    }
  };

  // Handle type selection
  const handleTypeChange = (value: string | null | undefined) => {
    if (value) {
      setTypeValue(value);
      updateProperty('type', value);
    }
  };

  // Handle subtype selection
  const handleSubtypeChange = (value: string | null | undefined) => {
    if (value) {
      setSubtypeValue(value);
      updateProperty('subtype', value);
    }
  };

  const addOwnerFromContact = async () => {
    try {
      // Check and request contacts permission
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Contacts permission is required to pick contacts. Please grant permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings', onPress: () => {
                // You could add logic to open device settings here
                Alert.alert('Please go to Settings > Apps > AwesomeProject > Permissions > Contacts and enable access.');
              }
            }
          ]
        );
        return;
      }

      const selectedContact = await ContactModule.openContactPicker();
      if (selectedContact) {
        const newOwner: PropertyOwner = {
          ownerName: selectedContact.name || 'Unknown',
          ownerContact: selectedContact.phoneNumbers?.[0]?.number ||
            selectedContact.emailAddresses?.[0]?.email ||
            'No contact info'
        };

        setProperty(prev => ({
          ...prev,
          owners: [...(prev.owners || []), newOwner],
        }));
      }
    } catch (error: any) {
      console.error('Error selecting contact:', error);
      if (error.code === 'permission_denied') {
        Alert.alert(
          'Permission Denied',
          'Contacts permission is required to access your contacts. Please grant permission and try again.'
        );
      } else if (error.code !== 'cancelled') {
        console.error('Error: Failed to select contact');
      }
    }
  };


  const addDocument = () => {
    if (newDocument.name.trim() && newDocument.type.trim()) {
      setProperty(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument],
      }));
      setNewDocument({ name: '', type: '', url: '' });
    }
  };

  const removeOwner = (index: number) => {
    setProperty(prev => ({
      ...prev,
      owners: prev.owners?.filter((_, i) => i !== index) || [],
    }));
  };

  const removeDocument = (index: number) => {
    setProperty(prev => ({
      ...prev,
      documents: prev.documents?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleCreateProperty = () => {
    if (!property.name?.trim() || !property.type?.trim() || !property.address?.trim()) {
      console.warn('Please fill in required fields: Name, Type, and Address');
      return;
    }

    const newProperty: Property = {
      id: Date.now().toString(),
      name: property.name!,
      type: property.type!,
      subtype: property.subtype || '',
      category: property.category || '',
      description: property.description || '',
      address: property.address!,
      phoneNumber: property.phoneNumber || '',
      email: property.email || '',
      owners: property.owners || [],
      documents: property.documents || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onCreateProperty(newProperty);

    // Reset form
    setProperty({
      name: '',
      type: '',
      subtype: '',
      category: '',
      description: '',
      address: '',
      phoneNumber: '',
      email: '',
      owners: [],
      documents: [],
    });
    setTypeValue(null);
    setSubtypeValue(null);
    setSubtypeItems([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Property</Text>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Text style={styles.label}>Property Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter property name"
          placeholderTextColor="#999"
          value={property.name || ''}
          onChangeText={(value) => updateProperty('name', value)}
        />

        <Text style={styles.label}>Type *</Text>
        <DropDownPicker
          open={typeOpen}
          value={typeValue}
          items={typeItems}
          setOpen={setTypeOpen}
          setValue={setTypeValue}
          setItems={setTypeItems}
          onSelectItem={(item) => handleTypeChange(item.value)}
          placeholder="Select property type"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={styles.dropdownText}
          placeholderStyle={styles.dropdownPlaceholder}
          zIndex={3000}
          zIndexInverse={1000}
          listMode="SCROLLVIEW"
          scrollViewProps={{
            nestedScrollEnabled: true,
          }}
        />

        <Text style={styles.label}>Subtype</Text>
        <DropDownPicker
          open={subtypeOpen}
          value={subtypeValue}
          items={subtypeItems}
          setOpen={setSubtypeOpen}
          setValue={setSubtypeValue}
          setItems={setSubtypeItems}
          onSelectItem={(item) => handleSubtypeChange(item.value)}
          placeholder="Select property subtype"
          disabled={!typeValue || subtypeItems.length === 0}
          style={[styles.dropdown, (!typeValue || subtypeItems.length === 0) && styles.dropdownDisabled]}
          dropDownContainerStyle={styles.dropdownContainer}
          textStyle={styles.dropdownText}
          placeholderStyle={styles.dropdownPlaceholder}
          disabledStyle={styles.dropdownDisabled}
          zIndex={2000}
          zIndexInverse={2000}
          listMode="SCROLLVIEW"
          scrollViewProps={{
            nestedScrollEnabled: true,
          }}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., For Sale, For Rent"
          placeholderTextColor="#999"
          value={property.category || ''}
          onChangeText={(value) => updateProperty('category', value)}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Property description"
          placeholderTextColor="#999"
          value={property.description || ''}
          onChangeText={(value) => updateProperty('description', value)}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="Property address"
          placeholderTextColor="#999"
          value={property.address || ''}
          onChangeText={(value) => updateProperty('address', value)}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Contact phone number"
          placeholderTextColor="#999"
          value={property.phoneNumber || ''}
          onChangeText={(value) => updateProperty('phoneNumber', value)}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Contact email"
          placeholderTextColor="#999"
          value={property.email || ''}
          onChangeText={(value) => updateProperty('email', value)}
          keyboardType="email-address"
        />

        <Text style={styles.sectionTitle}>Owners</Text>
        <View style={styles.addSection}>
          <TouchableOpacity style={styles.contactPickerButton} onPress={addOwnerFromContact}>
            <Text style={styles.contactPickerText}>📱 Pick from Contacts</Text>
          </TouchableOpacity>
        </View>

        {property.owners && property.owners.length > 0 && (
          <View style={styles.listContainer}>
            {property.owners.map((owner, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemText}>
                  {owner.ownerName} - {owner.ownerContact}
                </Text>
                <TouchableOpacity onPress={() => removeOwner(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Documents</Text>
        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="Document name"
            placeholderTextColor="#999"
            value={newDocument.name}
            onChangeText={(value) => setNewDocument(prev => ({ ...prev, name: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Document type"
            placeholderTextColor="#999"
            value={newDocument.type}
            onChangeText={(value) => setNewDocument(prev => ({ ...prev, type: value }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Document URL (optional)"
            placeholderTextColor="#999"
            value={newDocument.url}
            onChangeText={(value) => setNewDocument(prev => ({ ...prev, url: value }))}
          />
          <TouchableOpacity style={styles.addButton} onPress={addDocument}>
            <Text style={styles.addButtonText}>Add Document</Text>
          </TouchableOpacity>
        </View>

        {property.documents && property.documents.length > 0 && (
          <View style={styles.listContainer}>
            {property.documents.map((doc, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listItemText}>
                  {doc.name} ({doc.type})
                </Text>
                <TouchableOpacity onPress={() => removeDocument(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.createButton} onPress={handleCreateProperty}>
          <Text style={styles.createButtonText}>Create Property</Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addSection: {
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  removeText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // React Native Dropdown Picker styles
  dropdown: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  dropdownContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  // Contact picker styles
  contactPickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  contactPickerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
});
export default CreateProperty;