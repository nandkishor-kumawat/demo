import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import ContactModule, { type Contact } from './ContactModule';

const ContactDemo: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const loadContacts = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Contacts permission is required.');
        return;
      }

      const contactsList = await ContactModule.getContacts();
      setContacts(contactsList);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const searchContacts = async () => {
    if (!searchTerm.trim()) {
      loadContacts();
      return;
    }

    setLoading(true);
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Contacts permission is required.');
        return;
      }

      const searchResults = await ContactModule.searchContacts(searchTerm);
      setContacts(searchResults);
    } catch (error) {
      console.error('Error searching contacts:', error);
      Alert.alert('Error', 'Failed to search contacts');
    } finally {
      setLoading(false);
    }
  };

  const createContact = async () => {
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Contacts permissions are required to create a contact.');
        return;
      }

      // Open the native contact creation form
      await ContactModule.createContact({});
    } catch (error: any) {
      console.error('Error creating contact:', error);
      if (error.code !== 'cancelled') {
        Alert.alert('Error', 'Failed to open contact creation form');
      }
    }
  };

  const openContactPicker = async () => {
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Contacts permission is required.');
        return;
      }

      const selectedContact = await ContactModule.openContactPicker();
      if (selectedContact) {
        // Display the selected contact as a single item
        setContacts([selectedContact]);
      }
    } catch (error: any) {
      console.error('Error opening contact picker:', error);
      if (error.code !== 'cancelled') {
        Alert.alert('Error', 'Failed to open contact picker');
      }
    }
  };

  const renderContact = (contact: Contact) => (
    <View key={contact.id} style={styles.contactItem}>
      <View style={styles.contactHeader}>
        {contact.thumbnailPath && (
          <Image
            source={{ uri: `file://${contact.thumbnailPath}` }}
            style={styles.thumbnail}
          />
        )}
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>
            {contact.name || 'Unnamed Contact'}
          </Text>
          <Text style={styles.contactId}>ID: {contact.id}</Text>
        </View>
      </View>

      {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Phone Numbers:</Text>
          {contact.phoneNumbers.map((phone, index) => (
            <Text key={index} style={styles.contactDetail}>
              {phone.label}: {phone.number}
            </Text>
          ))}
        </View>
      )}

      {contact.emailAddresses && contact.emailAddresses.length > 0 && (
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Email Addresses:</Text>
          {contact.emailAddresses.map((email, index) => (
            <Text key={index} style={styles.contactDetail}>
              {email.label}: {email.email}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Manager</Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={loadContacts}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Load All'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={openContactPicker}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Pick Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createButton}
          onPress={createContact}
        >
          <Text style={styles.buttonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={searchContacts}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchContacts}
        >
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.contactCount}>
        Found {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
      </Text>

      <ScrollView style={styles.contactsList}>
        {contacts.map(renderContact)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  pickerButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  createButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  contactCount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  contactId: {
    fontSize: 12,
    color: '#666',
  },
  contactSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
    color: '#777',
    marginLeft: 10,
  },
});

export default ContactDemo;
