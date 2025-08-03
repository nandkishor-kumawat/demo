export interface PropertyOwner {
  ownerContact: string;
  ownerName: string;
}

export interface PropertyDocument {
  name: string;
  type: string;
  url: string;
}

export interface Property {
  id?: string;
  name: string;
  type: string;
  subtype: string;
  category: string;
  description: string;
  address: string;
  phoneNumber: string;
  email: string;
  owners: PropertyOwner[];
  createdAt: Date;
  updatedAt: Date;
  documents: PropertyDocument[];
}

export interface PropertyFilter {
  name?: string;
  type?: string;
  subtype?: string;
  category?: string;
  address?: string;
}
