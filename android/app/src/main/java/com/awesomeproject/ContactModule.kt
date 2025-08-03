package com.awesomeproject

import android.app.Activity
import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class ContactModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val MODULE_NAME = "ContactModule"
        private const val TAG = "ContactModule"
        private const val CONTACT_PICKER_REQUEST = 1001
    }

    private var contactPickerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == CONTACT_PICKER_REQUEST) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val contactUri = data.data
                if (contactUri != null) {
                    handleContactPickerResult(contactUri)
                } else {
                    contactPickerPromise?.reject("no_contact", "No contact was selected")
                    contactPickerPromise = null
                }
            } else {
                contactPickerPromise?.reject("cancelled", "Contact picker was cancelled")
                contactPickerPromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not needed for contact picker
    }

    private fun handleContactPickerResult(contactUri: Uri) {
        try {
            val contactId = getContactIdFromUri(contactUri)
            if (contactId != null) {
                val contact = getContactById(contactId)
                contactPickerPromise?.resolve(contact)
            } else {
                contactPickerPromise?.reject("invalid_contact", "Could not retrieve contact information")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling contact picker result: ${e.message}")
            contactPickerPromise?.reject("picker_error", "Error processing selected contact", e)
        } finally {
            contactPickerPromise = null
        }
    }

    private fun getContactIdFromUri(contactUri: Uri): String? {
        val contentResolver = reactApplicationContext.contentResolver
        val projection = arrayOf(ContactsContract.Contacts._ID)
        
        contentResolver.query(contactUri, projection, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idIndex = cursor.getColumnIndex(ContactsContract.Contacts._ID)
                if (idIndex >= 0) {
                    return cursor.getString(idIndex)
                }
            }
        }
        return null
    }

    private fun hasContactsPermission(): Boolean {
        return reactApplicationContext.checkSelfPermission(android.Manifest.permission.READ_CONTACTS) == 
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun getContactById(contactId: String): WritableMap? {
        if (!hasContactsPermission()) {
            return null
        }

        val contentResolver = reactApplicationContext.contentResolver
        val contact = Arguments.createMap()
        contact.putString("id", contactId)

        // Get basic contact info
        val contactProjection = arrayOf(
            ContactsContract.Contacts._ID,
            ContactsContract.Contacts.DISPLAY_NAME,
            ContactsContract.Contacts.HAS_PHONE_NUMBER,
            ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
        )

        val contactCursor = contentResolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            contactProjection,
            "${ContactsContract.Contacts._ID} = ?",
            arrayOf(contactId),
            null
        )

        contactCursor?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)
                val hasPhoneIndex = cursor.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER)
                val photoIndex = cursor.getColumnIndex(ContactsContract.Contacts.PHOTO_THUMBNAIL_URI)

                val name = if (nameIndex >= 0) cursor.getString(nameIndex) else null
                val hasPhone = if (hasPhoneIndex >= 0) cursor.getInt(hasPhoneIndex) > 0 else false
                val photoUri = if (photoIndex >= 0) cursor.getString(photoIndex) else null

                name?.let { contact.putString("name", it) }

                // Get phone numbers
                if (hasPhone) {
                    val phoneNumbers = getPhoneNumbers(contactId, contentResolver)
                    if (phoneNumbers.size() > 0) {
                        contact.putArray("phoneNumbers", phoneNumbers)
                    }
                }

                // Get email addresses
                val emailAddresses = getEmailAddresses(contactId, contentResolver)
                if (emailAddresses.size() > 0) {
                    contact.putArray("emailAddresses", emailAddresses)
                }

                // Handle thumbnail
                photoUri?.let { uri ->
                    val thumbnailPath = saveThumbnailToTemp(uri, contactId)
                    thumbnailPath?.let { contact.putString("thumbnailPath", it) }
                }

                return contact
            }
        }

        return null
    }

    private fun getPhoneNumbers(contactId: String, contentResolver: ContentResolver): WritableArray {
        val phoneNumbers = Arguments.createArray()
        
        val phoneProjection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
            ContactsContract.CommonDataKinds.Phone.LABEL
        )

        val phoneCursor = contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            phoneProjection,
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
        )

        phoneCursor?.use { cursor ->
            while (cursor.moveToNext()) {
                val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val typeIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.TYPE)
                val labelIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.LABEL)

                val number = if (numberIndex >= 0) cursor.getString(numberIndex) else ""
                val type = if (typeIndex >= 0) cursor.getInt(typeIndex) else 0
                val customLabel = if (labelIndex >= 0) cursor.getString(labelIndex) else null

                val phoneNumber = Arguments.createMap()
                phoneNumber.putString("number", number)
                
                val label = when (type) {
                    ContactsContract.CommonDataKinds.Phone.TYPE_HOME -> "Home"
                    ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE -> "Mobile"
                    ContactsContract.CommonDataKinds.Phone.TYPE_WORK -> "Work"
                    ContactsContract.CommonDataKinds.Phone.TYPE_FAX_HOME -> "Home Fax"
                    ContactsContract.CommonDataKinds.Phone.TYPE_FAX_WORK -> "Work Fax"
                    ContactsContract.CommonDataKinds.Phone.TYPE_PAGER -> "Pager"
                    ContactsContract.CommonDataKinds.Phone.TYPE_OTHER -> "Other"
                    ContactsContract.CommonDataKinds.Phone.TYPE_CUSTOM -> customLabel ?: "Custom"
                    else -> "Other"
                }
                phoneNumber.putString("label", label)
                
                phoneNumbers.pushMap(phoneNumber)
            }
        }

        return phoneNumbers
    }

    private fun getEmailAddresses(contactId: String, contentResolver: ContentResolver): WritableArray {
        val emailAddresses = Arguments.createArray()
        
        val emailProjection = arrayOf(
            ContactsContract.CommonDataKinds.Email.ADDRESS,
            ContactsContract.CommonDataKinds.Email.TYPE,
            ContactsContract.CommonDataKinds.Email.LABEL
        )

        val emailCursor = contentResolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            emailProjection,
            "${ContactsContract.CommonDataKinds.Email.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
        )

        emailCursor?.use { cursor ->
            while (cursor.moveToNext()) {
                val addressIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Email.ADDRESS)
                val typeIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Email.TYPE)
                val labelIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Email.LABEL)

                val address = if (addressIndex >= 0) cursor.getString(addressIndex) else ""
                val type = if (typeIndex >= 0) cursor.getInt(typeIndex) else 0
                val customLabel = if (labelIndex >= 0) cursor.getString(labelIndex) else null

                val emailAddress = Arguments.createMap()
                emailAddress.putString("email", address)
                
                val label = when (type) {
                    ContactsContract.CommonDataKinds.Email.TYPE_HOME -> "Home"
                    ContactsContract.CommonDataKinds.Email.TYPE_WORK -> "Work"
                    ContactsContract.CommonDataKinds.Email.TYPE_OTHER -> "Other"
                    ContactsContract.CommonDataKinds.Email.TYPE_CUSTOM -> customLabel ?: "Custom"
                    else -> "Other"
                }
                emailAddress.putString("label", label)
                
                emailAddresses.pushMap(emailAddress)
            }
        }

        return emailAddresses
    }

    private fun saveThumbnailToTemp(photoUri: String, contactId: String): String? {
        try {
            val uri = Uri.parse(photoUri)
            val inputStream: InputStream? = reactApplicationContext.contentResolver.openInputStream(uri)
            
            inputStream?.use { input ->
                val fileName = "contact_thumbnail_$contactId.jpg"
                val tempFile = File(reactApplicationContext.cacheDir, fileName)
                
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
                
                return tempFile.absolutePath
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving thumbnail: ${e.message}")
        }
        
        return null
    }

    @ReactMethod
    fun getContacts(promise: Promise) {
        try {
            if (!hasContactsPermission()) {
                promise.reject("permission_denied", "Contacts permission not granted")
                return
            }

            val contentResolver = reactApplicationContext.contentResolver
            val contacts = Arguments.createArray()

            val projection = arrayOf(
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.HAS_PHONE_NUMBER,
                ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
            )

            val cursor = contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                null,
                null,
                ContactsContract.Contacts.DISPLAY_NAME + " ASC"
            )

            cursor?.use { c ->
                while (c.moveToNext()) {
                    val idIndex = c.getColumnIndex(ContactsContract.Contacts._ID)
                    val contactId = if (idIndex >= 0) c.getString(idIndex) else continue
                    
                    val contact = getContactById(contactId)
                    contact?.let { contacts.pushMap(it) }
                }
            }

            promise.resolve(contacts)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting contacts: ${e.message}")
            promise.reject("fetch_error", "Failed to fetch contacts", e)
        }
    }

    @ReactMethod
    fun getContactById(contactId: String, promise: Promise) {
        try {
            if (!hasContactsPermission()) {
                promise.reject("permission_denied", "Contacts permission not granted")
                return
            }

            val contact = getContactById(contactId)
            promise.resolve(contact)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting contact by ID: ${e.message}")
            promise.reject("fetch_error", "Failed to fetch contact", e)
        }
    }

    @ReactMethod
    fun searchContacts(searchTerm: String, promise: Promise) {
        try {
            if (!hasContactsPermission()) {
                promise.reject("permission_denied", "Contacts permission not granted")
                return
            }

            val contentResolver = reactApplicationContext.contentResolver
            val contacts = Arguments.createArray()

            val projection = arrayOf(
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.HAS_PHONE_NUMBER,
                ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
            )

            val selection = "${ContactsContract.Contacts.DISPLAY_NAME} LIKE ?"
            val selectionArgs = arrayOf("%$searchTerm%")

            val cursor = contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                selection,
                selectionArgs,
                ContactsContract.Contacts.DISPLAY_NAME + " ASC"
            )

            cursor?.use { c ->
                while (c.moveToNext()) {
                    val idIndex = c.getColumnIndex(ContactsContract.Contacts._ID)
                    val contactId = if (idIndex >= 0) c.getString(idIndex) else continue
                    
                    val contact = getContactById(contactId)
                    contact?.let { contacts.pushMap(it) }
                }
            }

            promise.resolve(contacts)
        } catch (e: Exception) {
            Log.e(TAG, "Error searching contacts: ${e.message}")
            promise.reject("search_error", "Failed to search contacts", e)
        }
    }

    @ReactMethod
    fun openContactPicker(promise: Promise) {
        try {
            if (!hasContactsPermission()) {
                promise.reject("permission_denied", "Contacts permission not granted")
                return
            }

            val activity = currentActivity
            if (activity == null) {
                promise.reject("no_activity", "Activity not available")
                return
            }

            if (contactPickerPromise != null) {
                promise.reject("picker_active", "Contact picker is already active")
                return
            }

            contactPickerPromise = promise

            val intent = Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI)
            activity.startActivityForResult(intent, CONTACT_PICKER_REQUEST)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening contact picker: ${e.message}")
            contactPickerPromise = null
            promise.reject("picker_error", "Failed to open contact picker", e)
        }
    }

    @ReactMethod
    fun createContact(contactData: ReadableMap, promise: Promise) {
        try {
            if (!hasContactsPermission()) {
                promise.reject("permission_denied", "Contacts permission not granted")
                return
            }

            val activity = currentActivity
            if (activity == null) {
                promise.reject("no_activity", "Activity not available")
                return
            }

            // Create an intent to add a contact
            val intent = Intent(ContactsContract.Intents.Insert.ACTION).apply {
                type = ContactsContract.RawContacts.CONTENT_TYPE
                
                // Add name if provided
                if (contactData.hasKey("name")) {
                    putExtra(ContactsContract.Intents.Insert.NAME, contactData.getString("name"))
                }
                
                // Add phone number if provided
                if (contactData.hasKey("phoneNumber")) {
                    putExtra(ContactsContract.Intents.Insert.PHONE, contactData.getString("phoneNumber"))
                }
                
                // Add email if provided
                if (contactData.hasKey("email")) {
                    putExtra(ContactsContract.Intents.Insert.EMAIL, contactData.getString("email"))
                }
            }

            activity.startActivity(intent)
            promise.resolve(null) // We can't get the created contact immediately
        } catch (e: Exception) {
            Log.e(TAG, "Error creating contact: ${e.message}")
            promise.reject("create_error", "Failed to create contact", e)
        }
    }

    @ReactMethod
    fun requestContactsPermission(promise: Promise) {
        try {
            if (hasContactsPermission()) {
                promise.resolve(true)
                return
            }

            val activity = currentActivity
            if (activity == null) {
                promise.reject("no_activity", "Activity not available")
                return
            }

            // For now, we'll just check permission and inform the user
            // In a production app, you might want to use a more sophisticated permission library
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting contacts permission: ${e.message}")
            promise.reject("permission_error", "Failed to request contacts permission", e)
        }
    }

    @ReactMethod
    fun getDebugInfo(promise: Promise) {
        try {
            val hasPermission = hasContactsPermission()
            val debugInfo = "ContactModule Android - Contacts Permission: $hasPermission"
            promise.resolve(debugInfo)
        } catch (e: Exception) {
            promise.reject("debug_error", "Failed to get debug info", e)
        }
    }
}
