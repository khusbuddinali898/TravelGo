require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'media';
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_KEY;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'TravelGoDB';
const COSMOS_CONTAINER = process.env.COSMOS_CONTAINER || 'Media';


app.use(cors({ origin: FRONTEND_URL === '*' ? '*' : FRONTEND_URL }));
app.use(express.json());

if (!AZURE_STORAGE_CONNECTION_STRING || !COSMOS_ENDPOINT || !COSMOS_KEY) {
  console.warn('Missing Azure environment variables. Check .env or Azure App Service Environment variables.');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true');
const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER);

const cosmosClient = new CosmosClient({ endpoint: COSMOS_ENDPOINT || 'https://localhost:8081', key: COSMOS_KEY || 'dummy' });
const database = cosmosClient.database(COSMOS_DATABASE);
const mediaContainer = database.container(COSMOS_CONTAINER);

async function ensureBlobContainer() {
  try {
    await containerClient.createIfNotExists({ access: 'blob' });
  } catch (error) {
    console.error('Blob container setup error:', error.message);
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'TravelGo API is running', endpoints: ['/api/health', '/api/media'] });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'TravelGo API' });
});

app.post('/api/media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use form-data key named file.' });
    }

    const id = uuidv4();
    const userId = req.body.userId || '';
    const description = req.body.description || '';
    const destination = req.body.destination || '';
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const blobName = `${id}-${originalName}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    const mediaItem = {
      id,
      userId,
      description,
      destination,
      fileName: originalName,
      blobName,
      url: blockBlobClient.url,
      contentType: req.file.mimetype,
      uploadDate: new Date().toISOString()
    };

    await mediaContainer.items.create(mediaItem);
    res.status(201).json({ message: 'Media uploaded successfully', media: mediaItem });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});


app.get('/api/media', async (req, res) => {
  try {
    const querySpec = { query: 'SELECT * FROM c ORDER BY c.uploadDate DESC' };
    const { resources } = await mediaContainer.items.query(querySpec).fetchAll();
    res.json(resources);
  } catch (error) {
    console.error('Get all error:', error);
    res.status(500).json({ error: 'Could not retrieve media', details: error.message });
  }
});


app.get('/api/media/:id', async (req, res) => {
  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: req.params.id }]
    };
    const { resources } = await mediaContainer.items.query(querySpec).fetchAll();
    if (resources.length === 0) return res.status(404).json({ error: 'Media not found' });
    res.json(resources[0]);
  } catch (error) {
    console.error('Get one error:', error);
    res.status(500).json({ error: 'Could not retrieve media item', details: error.message });
  }
});


app.put('/api/media/:id', async (req, res) => {
  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: req.params.id }]
    };
    const { resources } = await mediaContainer.items.query(querySpec).fetchAll();
    if (resources.length === 0) return res.status(404).json({ error: 'Media not found' });

    const existing = resources[0];
    const updated = {
      ...existing,
      description: req.body.description ?? existing.description,
      destination: req.body.destination ?? existing.destination,
      updatedDate: new Date().toISOString()
    };

    const { resource } = await mediaContainer.item(existing.id, existing.userId).replace(updated);
    res.json({ message: 'Media updated successfully', media: resource });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
});

app.delete('/api/media/:id', async (req, res) => {
  try {
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: req.params.id }]
    };
    const { resources } = await mediaContainer.items.query(querySpec).fetchAll();
    if (resources.length === 0) return res.status(404).json({ error: 'Media not found' });

    const item = resources[0];
    if (item.blobName) {
      await containerClient.getBlockBlobClient(item.blobName).deleteIfExists();
    }
    await mediaContainer.item(item.id, item.userId).delete();
    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

ensureBlobContainer().then(() => {
  app.listen(PORT, () => console.log(`TravelGo API running on port ${PORT}`));
});
