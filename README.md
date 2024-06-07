# Bitespeed Backend Task - Identity Reconciliation

This repository contains the code for a Flask application designed for identity reconciliation. The application is hosted and integrated with mongodb.

## Project Overview

The application is capable of identifying and reconciling user identities based on the provided data. The primary endpoint, `/identify`, processes input to find and reconcile identities.

## Hosted Application

The application is deployed and can be accessed using the following links:
- **Frondend:** [https://frontend-1-hfaz.onrender.com/](https://frontend-1-hfaz.onrender.com/)
- **Identify Endpoint:** [https://render-cp1v.onrender.com/identify](https://render-cp1v.onrender.com/identify)

## Approach

To solve the identity reconciliation problem, the application employs device fingerprinting. Device fingerprinting is a technique that uses information about a user's device (such as browser type, operating system, installed plugins, timezone, screen resolution, and other device-specific settings) to create a unique identifier for that device.

### Steps Involved:

1. **Data Collection:** When a request is made to the `/identify` endpoint, the application collects various attributes from the request header and body. This includes details like IP address, user agent, and any available identifiers (email, phone number, etc.).

2. **Fingerprint Generation:** Using the collected data, the application generates a unique fingerprint for the device. This fingerprint is a hash value derived from the combination of all the collected attributes.

3. **Identity Matching:** The generated fingerprint is compared against existing records in the Mongodb to find a match. If a match is found, the existing identity is retrieved. If no match is found, a new identity is created and stored in the database.

4. **Response:** The application responds with the identified or newly created identity, effectively reconciling the user based on their device fingerprint.

This approach ensures that even if the same user provides different identifiers over time, their identity can still be reconciled based on the consistency of their device fingerprint.


## License

This project is licensed under the MIT License.

## Contact

If you have any questions or suggestions, feel free to contact me at:
- **Email:** balajibj2003@gmail.com
