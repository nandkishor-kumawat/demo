import { NativeModules } from 'react-native';

export interface Contact {
  id: string;
  name?: string;
  phoneNumbers?: Array<{
    label?: string;
    number: string;
  }>;
  emailAddresses?: Array<{
    label?: string;
    email: string;
  }>;
  thumbnailPath?: string;
}

interface IContactModule {
  getContacts(): Promise<Array<Contact>>;
  getContactById(contactId: string): Promise<Contact | null>;
  searchContacts(searchTerm: string): Promise<Array<Contact>>;
  openContactPicker(): Promise<Contact | null>;
  createContact(contact: { name?: string; phoneNumber?: string; email?: string }): Promise<Contact | null>;
  requestContactsPermission(): Promise<boolean>;
  getDebugInfo(): Promise<string>;
}

const { ContactModule } = NativeModules;

const fallbackModule: IContactModule = {
  getContacts: () => Promise.resolve([]),
  getContactById: () => Promise.resolve(null),
  searchContacts: () => Promise.resolve([]),
  openContactPicker: () => Promise.resolve(null),
  createContact: () => Promise.resolve(null),
  requestContactsPermission: () => Promise.resolve(false),
  getDebugInfo: () => Promise.resolve('Contact module not available'),
};

export default (ContactModule || fallbackModule) as IContactModule;
