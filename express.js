var express = require("express");
let app = express();
const cors = require("cors");
const corsOptions = {
  origin: 'https://sheisdumz.github.io', // Adjust according to your Vue app URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow other headers like 'Authorization' if needed
  credentials: true,  // Allow credentials (cookies, HTTP authentication) if necessary
};
app.use(cors(corsOptions));
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

let db1; // Declare variable

app.use(express.static(path.join(__dirname)));

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });



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

// Endpoint to create a new order
app.post('/collections/orders', async function (req, res, next) {
  try {
    const {name, phone, courses } = req.body; // Extract request data

    // Validate request body
    if (!name || !phone || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid or missing fields in the request body' });
    }

    // Create an order object
    const order = {
      name,
      phone,
      courses,
    };

    // Insert the order into the "Orders" collection
    const results = await db1.collection('Orders').insertOne(order);

    res.status(201).json({
      message: 'Order created successfully',
      orderId: results.insertedId // Return the inserted order's ID
    });
  } catch (err) {
    console.error('Error creating order:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to create order' }); // Return error response
  }
});

// Endpoint to update product availability
app.put('/collections/products/updateSpace', async function (req, res) {
  try {
    const { lessons } = req.body; // Extract product data from request body

    // Validate the request body
    if (!lessons || !Array.isArray(lessons)) {
      return res.status(400).json({ error: 'Invalid or missing products data' });
    }

    // Update availability for each product
    for (const lesson of lessons) {
      if (!lesson.title || !lesson.quantity) {
        return res.status(400).json({ error: 'Each product must have a title and quantity' });
      }

      const result = await db1.collection('courses').updateOne(
        { title: lesson.title },
        { $inc: { spaces: -lesson.quantity } }
      );

      if (result.matchedCount === 0) {
        console.warn(`Lesson with title "${lesson.title}" not found`); // Warn if product not found
      }
    }

    res.status(200).json({ message: 'Product availability updated successfully' });
  } catch (err) {
    console.error('Error updating product availability:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to update product availability' });
  }
});

// Endpoint to search for products
app.get('/collections/courses/search', async function (req, res) {
  try {
    const { search = '', sortKey = 'title', sortOrder = 'asc' } = req.query; // Extract query params

    console.log('Search Query:', search); // Log search query
    console.log('Sort Key:', sortKey, 'Sort Order:', sortOrder); // Log sorting options

    // Build search query
    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const sortOptions = { [sortKey]: sortOrder === 'asc' ? 1 : -1 }; // Determine sort order

    const results = await db1.collection('courses').find(query).sort(sortOptions).toArray();

    console.log('Search Results:', results); // Log search results
    res.status(200).json(results); // Return results to frontend
  } catch (err) {
    console.error('Error fetching products:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});




app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});



// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });