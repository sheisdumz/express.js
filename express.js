const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion } = require("mongodb");
const bodyParser = require("body-parser");

let app = express();

// CORS Configuration
const corsOptions = {
  origin: 'https://sheisdumz.github.io', // Ad
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow other headers like 'Authorization' if needed
  credentials: true,  // Allow credentials (cookies, HTTP authentication) 
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json()); // Add this line to parse JSON request bodies
app.set('json spaces', 3);

// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get('db.prefix');   // Should be 'mongodb+srv://'
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbHost = properties.get('db.host');      
const dbName = properties.get('db.name');       
const dbParams = properties.get('db.params');   

// Correctly format the MongoDB URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}@${dbHost}/${dbName}?${dbParams}`;

// Declare variable for database
let db1;

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

// Serve static files
app.use(express.static(path.join(__dirname)));

// Middleware to set collection
app.param('collectionName', async function(req, res, next, collectionName) { 
  req.collection = db1.collection(collectionName);
  console.log('Middleware set collection:', req.collection.collectionName);
  next();
});

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

/// Endpoint to create an order
app.post('/collections/Orders', async function (req, res, next) {
  try {
    console.log('Request body:', req.body);

    const { name, phone, courses } = req.body;

    // Validate request body
    if (!name || !phone || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: "Invalid or missing fields in the request body" });
    }

    // Transform the courses array to the desired format
    const validatedCourses = courses.reduce((acc, course) => {
      // Ensure course has valid properties
      if (course.id && typeof course.id === 'number') {
        const existingCourse = acc.find(item => item.id === course.id);
        if (existingCourse) {
          existingCourse.count += 1; // Increment count if the course exists
        } else {
          acc.push({ id: course.id, count: 1 }); // Add a new course with count = 1
        }
      }
      return acc;
    }, []);

    // Create an order object in the desired format
    const order = {
      name,
      phone,
      courses: validatedCourses,
    };

    // Insert the order into MongoDB
    const result = await db1.collection('Orders').insertOne(order);

    // Respond with success message and inserted ID
    res.status(201).json({
      message: "Order created successfully",
      orderId: result.insertedId,
    });

  } catch (err) {
    console.error("Error creating order:", err.message);
    next(err); // Pass the error to the next middleware
  }
});
// Endpoint to update product availability
app.put('/collections/products', async function (req, res) {
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
            { location: { $regex: search, $options: 'i' } },
            { subject: { $regex: search, $options: 'i' } }
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'An error occurred' });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});