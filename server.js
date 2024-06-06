const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { FingerprintJsServerApiClient, Region } = require('@fingerprintjs/fingerprintjs-pro');

const app = express();
const port = process.env.PORT || 4000;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/contacts';
const dbName = process.env.DB_NAME || 'contacts';
const collectionName = process.env.COLLECTION_NAME || 'contacts';
const fingerprintApiKey = process.env.FINGERPRINTJS_API_KEY || 'your-secret-api-key';
const fingerprintRegion = process.env.FINGERPRINTJS_REGION || 'ap';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '')));

let client;
let db;

async function connectToMongo() {
  client = new MongoClient(mongoUrl, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    throw err;
  }
}

connectToMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start the server:', err);
  });

// Initialize FingerprintJsServerApiClient with your secret API key
const fingerprintClient = new FingerprintJsServerApiClient({
  apiKey: fingerprintApiKey,
  region: Region[fingerprintRegion.toUpperCase()],
});

async function findContactByFingerprint(fingerprint) {
  if (!db) {
    console.error('MongoDB connection not established');
    return Promise.reject(new Error('MongoDB connection not established'));
  }

  return db.collection(collectionName).findOne({ fingerprint: fingerprint });
}

async function createPrimaryContact(fingerprint, email, phoneNumber) {
  const contact = {
    _id: uuidv4(),
    fingerprint,
    email,
    phoneNumber,
    linkPrecedence: 'primary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collectionName).insertOne(contact);
  return contact;
}

async function createSecondaryContact(primaryContactId, fingerprint, email, phoneNumber) {
  const contact = {
    _id: uuidv4(),
    linkedId: primaryContactId,
    fingerprint,
    email,
    phoneNumber,
    linkPrecedence: 'secondary',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collectionName).insertOne(contact);
  return contact;
}

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;

  // Generate fingerprint using FingerprintJsServerApiClient
  const fingerprintResponse = await fingerprintClient.getVisitorId({ email, phoneNumber });

  if (!fingerprintResponse || !fingerprintResponse.visitorId) {
    return res.status(400).json({ error: 'Unable to generate fingerprint' });
  }

  const existingContact = await findContactByFingerprint(fingerprintResponse.visitorId);

  if (!existingContact) {
    const newContact = await createPrimaryContact(fingerprintResponse.visitorId, email, phoneNumber);
    console.log('New Primary Contact Created:', newContact);
    res.status(200).json({
      contact: {
        primaryContactId: newContact._id,
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: [],
      }
    });
  } else {
    const newSecondaryContact = await createSecondaryContact(existingContact._id, fingerprintResponse.visitorId, email, phoneNumber);
    const secondaryContacts = await db.collection(collectionName)
      .find({ linkedId: existingContact._id, linkPrecedence: 'secondary' })
      .toArray();

    const secondaryContactIds = secondaryContacts.map(contact => contact._id || '');
    const emails = [existingContact.email, newSecondaryContact.email];
    const phoneNumbers = [existingContact.phoneNumber, newSecondaryContact.phoneNumber];

    res.status(200).json({
      contact: {
        primaryContactId: existingContact._id,
        emails,
        phoneNumbers,
        secondaryContactIds: [newSecondaryContact._id, ...secondaryContactIds],
      }
    });
  }
});

process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit();
});
