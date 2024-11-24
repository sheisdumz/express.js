var express = require("express");
let app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());
app.set('json spaces', 3);
const path = require('path');
let PropertiesReader = require("properties-reader");
// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get('db.prefix');   // Should be 'mongodb+srv://'
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbHost = properties.get('db.host');       // This should be the cluster URL (e.g., cluster0.goepg.mongodb.net)
const dbName = properties.get('db.name');       // Database name (e.g., 'website')
const dbParams = properties.get('db.params');   // Any query params like 'retryWrites=true&w=majority'

// Correctly format the MongoDB URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}@${dbHost}/${dbName}?${dbParams}`;

// Import MongoDB client
const { MongoClient, ServerApiVersion } = require("mongodb");
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Declare variable

// Function to connect to the MongoDB database
async function connectDB() {
  try {
    await client.connect();  // Use await here
    console.log('Connected to MongoDB');
    db1 = client.db(dbName);  // Connect to the specific database
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

connectDB();

//Optional if you want the get the collection name from the Fetch API in test3.html then
app.param('collectionName', async function(req, res, next, collectionName) { 
    req.collection = db1.collection(collectionName);
    /*Check the collection name for debugging if error */
    console.log('Middleware set collection:', req.collection.collectionName);
    next();
});

// Ensure this route is defined after the middleware app.param
// get all data from our collection in Mongodb
// Endpoint to fetch all products from the "Products" collection
app.get('/collections/courses', async function (req, res, next) {
  try {
    const results = await db1.collection('courses').find({}).toArray(); // Fetch all documents
    console.log('Retrieved data:', results); // Log retrieved data
    res.json(results); // Send the data as a JSON response
  } catch (err) {
    console.error('Error fetching docs', err.message); // Log errors
    res.status(500).json({ error: 'Failed to fetch products' }); // Return error response
  }
});

app.post('/collections/:collectionName', async function(req, res, next) {
    
});

app.put('/collections/:collectionName/:id', async function(req, res, next) {

});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });