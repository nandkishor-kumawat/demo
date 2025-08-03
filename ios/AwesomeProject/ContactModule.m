#import "ContactModule.h"
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <Contacts/Contacts.h>
#import <ContactsUI/ContactsUI.h>

@interface ContactModule () <CNContactPickerDelegate>
@property (nonatomic, st    });
}

RCT_EXPORT_METHOD(createContact:(NSDictionary *)contactData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        CNContactStore *store = [[CNContactStore alloc] init];
        CNAuthorizationStatus status = [CNContactStore authorizationStatusForEntityType:CNEntityTypeContacts];
        
        if (status == CNAuthorizationStatusDenied || status == CNAuthorizationStatusRestricted) {
            reject(@"permission_denied", @"Contacts permission not granted", nil);
            return;
        }
        
        // Create a mutable contact
        CNMutableContact *contact = [[CNMutableContact alloc] init];
        
        // Set name if provided
        NSString *name = contactData[@"name"];
        if (name && name.length > 0) {
            NSArray *nameComponents = [name componentsSeparatedByString:@" "];
            if (nameComponents.count > 0) {
                contact.givenName = nameComponents[0];
                if (nameComponents.count > 1) {
                    contact.familyName = [[nameComponents subarrayWithRange:NSMakeRange(1, nameComponents.count - 1)] componentsJoinedByString:@" "];
                }
            }
        }
        
        // Set phone number if provided
        NSString *phoneNumber = contactData[@"phoneNumber"];
        if (phoneNumber && phoneNumber.length > 0) {
            CNPhoneNumber *phone = [CNPhoneNumber phoneNumberWithStringValue:phoneNumber];
            CNLabeledValue *phoneNumberLabeledValue = [CNLabeledValue labeledValueWithLabel:CNLabelPhoneNumberMain value:phone];
            contact.phoneNumbers = @[phoneNumberLabeledValue];
        }
        
        // Set email if provided
        NSString *email = contactData[@"email"];
        if (email && email.length > 0) {
            CNLabeledValue *emailLabeledValue = [CNLabeledValue labeledValueWithLabel:CNLabelHome value:email];
            contact.emailAddresses = @[emailLabeledValue];
        }
        
        // Create save request
        CNSaveRequest *saveRequest = [[CNSaveRequest alloc] init];
        [saveRequest addContact:contact toContainerWithIdentifier:nil];
        
        // Save the contact
        NSError *error;
        BOOL success = [store executeSaveRequest:saveRequest error:&error];
        
        if (success) {
            NSDictionary *contactDict = [self contactToDictionary:contact];
            resolve(contactDict);
        } else {
            reject(@"save_error", @"Failed to save contact", error);
        }
    });
}

RCT_EXPORT_METHOD(getDebugInfo:(RCTPromiseResolveBlock)resolve) RCTPromiseResolveBlock contactPickerResolve;
@property (nonatomic, strong) RCTPromiseRejectBlock contactPickerReject;
@end

@implementation ContactModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (NSDictionary *)contactToDictionary:(CNContact *)contact {
    NSMutableDictionary *contactDict = [[NSMutableDictionary alloc] init];
    
    // Basic info
    contactDict[@"id"] = contact.identifier;
    
    // Name
    if (contact.givenName.length > 0 || contact.familyName.length > 0) {
        NSString *fullName = [NSString stringWithFormat:@"%@ %@", 
                             contact.givenName ?: @"", 
                             contact.familyName ?: @""].stringByTrimmingCharactersInSet([NSCharacterSet whitespaceCharacterSet]);
        if (fullName.length > 0) {
            contactDict[@"name"] = fullName;
        }
    }
    
    // Phone numbers
    if (contact.phoneNumbers.count > 0) {
        NSMutableArray *phoneNumbers = [[NSMutableArray alloc] init];
        for (CNLabeledValue *labeledValue in contact.phoneNumbers) {
            CNPhoneNumber *phoneNumber = labeledValue.value;
            NSMutableDictionary *phoneDict = [[NSMutableDictionary alloc] init];
            phoneDict[@"number"] = phoneNumber.stringValue;
            if (labeledValue.label) {
                phoneDict[@"label"] = [CNLabeledValue localizedStringForLabel:labeledValue.label];
            }
            [phoneNumbers addObject:phoneDict];
        }
        contactDict[@"phoneNumbers"] = phoneNumbers;
    }
    
    // Email addresses
    if (contact.emailAddresses.count > 0) {
        NSMutableArray *emailAddresses = [[NSMutableArray alloc] init];
        for (CNLabeledValue *labeledValue in contact.emailAddresses) {
            NSString *email = labeledValue.value;
            NSMutableDictionary *emailDict = [[NSMutableDictionary alloc] init];
            emailDict[@"email"] = email;
            if (labeledValue.label) {
                emailDict[@"label"] = [CNLabeledValue localizedStringForLabel:labeledValue.label];
            }
            [emailAddresses addObject:emailDict];
        }
        contactDict[@"emailAddresses"] = emailAddresses;
    }
    
    // Thumbnail
    if (contact.thumbnailImageData) {
        // Save thumbnail to temp directory and return path
        NSString *fileName = [NSString stringWithFormat:@"contact_thumbnail_%@.jpg", contact.identifier];
        NSString *tempDir = NSTemporaryDirectory();
        NSString *filePath = [tempDir stringByAppendingPathComponent:fileName];
        
        if ([contact.thumbnailImageData writeToFile:filePath atomically:YES]) {
            contactDict[@"thumbnailPath"] = filePath;
        }
    }
    
    return contactDict;
}

#pragma mark - CNContactPickerDelegate

- (void)contactPicker:(CNContactPickerViewController *)picker didSelectContact:(CNContact *)contact {
    NSDictionary *contactDict = [self contactToDictionary:contact];
    if (self.contactPickerResolve) {
        self.contactPickerResolve(contactDict);
        self.contactPickerResolve = nil;
        self.contactPickerReject = nil;
    }
}

- (void)contactPickerDidCancel:(CNContactPickerViewController *)picker {
    if (self.contactPickerReject) {
        self.contactPickerReject(@"cancelled", @"Contact picker was cancelled", nil);
        self.contactPickerResolve = nil;
        self.contactPickerReject = nil;
    }
}

RCT_EXPORT_METHOD(openContactPicker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        CNContactStore *store = [[CNContactStore alloc] init];
        CNAuthorizationStatus status = [CNContactStore authorizationStatusForEntityType:CNEntityTypeContacts];
        
        if (status == CNAuthorizationStatusDenied || status == CNAuthorizationStatusRestricted) {
            reject(@"permission_denied", @"Contacts permission not granted", nil);
            return;
        }
        
        if (self.contactPickerResolve != nil) {
            reject(@"picker_active", @"Contact picker is already active", nil);
            return;
        }
        
        self.contactPickerResolve = resolve;
        self.contactPickerReject = reject;
        
        CNContactPickerViewController *picker = [[CNContactPickerViewController alloc] init];
        picker.delegate = self;
        
        UIViewController *rootViewController = RCTKeyWindow().rootViewController;
        while (rootViewController.presentedViewController) {
            rootViewController = rootViewController.presentedViewController;
        }
        
        if (rootViewController) {
            [rootViewController presentViewController:picker animated:YES completion:nil];
        } else {
            self.contactPickerReject(@"no_controller", @"Could not find root view controller", nil);
            self.contactPickerResolve = nil;
            self.contactPickerReject = nil;
        }
    });
}

RCT_EXPORT_METHOD(getContacts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    CNContactStore *store = [[CNContactStore alloc] init];
    
    [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (!granted) {
            reject(@"permission_denied", @"Contacts permission not granted", error);
            return;
        }
        
        NSArray *keys = @[CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey, CNContactEmailAddressesKey, CNContactThumbnailImageDataKey, CNContactIdentifierKey];
        
        CNContactFetchRequest *request = [[CNContactFetchRequest alloc] initWithKeysToFetch:keys];
        
        NSMutableArray *contacts = [[NSMutableArray alloc] init];
        NSError *fetchError;
        
        BOOL success = [store enumerateContactsWithFetchRequest:request error:&fetchError usingBlock:^(CNContact * _Nonnull contact, BOOL * _Nonnull stop) {
            NSDictionary *contactDict = [self contactToDictionary:contact];
            [contacts addObject:contactDict];
        }];
        
        if (success) {
            resolve(contacts);
        } else {
            reject(@"fetch_error", @"Failed to fetch contacts", fetchError);
        }
    }];
}

RCT_EXPORT_METHOD(getContactById:(NSString *)contactId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    CNContactStore *store = [[CNContactStore alloc] init];
    
    [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (!granted) {
            reject(@"permission_denied", @"Contacts permission not granted", error);
            return;
        }
        
        NSArray *keys = @[CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey, CNContactEmailAddressesKey, CNContactThumbnailImageDataKey, CNContactIdentifierKey];
        
        NSError *fetchError;
        CNContact *contact = [store unifiedContactWithIdentifier:contactId keysToFetch:keys error:&fetchError];
        
        if (contact) {
            NSDictionary *contactDict = [self contactToDictionary:contact];
            resolve(contactDict);
        } else if (fetchError) {
            reject(@"fetch_error", @"Failed to fetch contact", fetchError);
        } else {
            resolve([NSNull null]);
        }
    }];
}

RCT_EXPORT_METHOD(searchContacts:(NSString *)searchTerm
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    CNContactStore *store = [[CNContactStore alloc] init];
    
    [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (!granted) {
            reject(@"permission_denied", @"Contacts permission not granted", error);
            return;
        }
        
        NSArray *keys = @[CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey, CNContactEmailAddressesKey, CNContactThumbnailImageDataKey, CNContactIdentifierKey];
        
        NSPredicate *predicate = [CNContact predicateForContactsMatchingName:searchTerm];
        
        NSError *fetchError;
        NSArray<CNContact *> *contacts = [store unifiedContactsMatchingPredicate:predicate keysToFetch:keys error:&fetchError];
        
        if (contacts) {
            NSMutableArray *contactsArray = [[NSMutableArray alloc] init];
            for (CNContact *contact in contacts) {
                NSDictionary *contactDict = [self contactToDictionary:contact];
                [contactsArray addObject:contactDict];
            }
            resolve(contactsArray);
        } else {
            reject(@"search_error", @"Failed to search contacts", fetchError);
        }
    }];
}

RCT_EXPORT_METHOD(getDebugInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    CNContactStore *store = [[CNContactStore alloc] init];
    CNAuthorizationStatus status = [CNContactStore authorizationStatusForEntityType:CNEntityTypeContacts];
    
    NSString *statusString;
    switch (status) {
        case CNAuthorizationStatusNotDetermined:
            statusString = @"Not Determined";
            break;
        case CNAuthorizationStatusRestricted:
            statusString = @"Restricted";
            break;
        case CNAuthorizationStatusDenied:
            statusString = @"Denied";
            break;
        case CNAuthorizationStatusAuthorized:
            statusString = @"Authorized";
            break;
        default:
            statusString = @"Unknown";
            break;
    }
    
    NSString *debugInfo = [NSString stringWithFormat:@"ContactModule iOS - Authorization Status: %@", statusString];
    resolve(debugInfo);
}

@end
