const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const ProductTransaction = require('./models/productTransaction');
const cors = require('cors'); // Import cors


dotenv.config(); // For environment variables

const app = express();
app.use(express.json()); // To parse JSON request bodies

// Add CORS middleware with the specific frontend URL
app.use(cors({
    origin: 'http://localhost:3000' // Replace with your actual frontend URL
}));

const PORT = process.env.PORT || 5000;

// MongoDB connection using Mongoose
mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected...');
}).catch((error) => {
    console.log('MongoDB connection error:', error);
});

// Route to fetch data from third-party API and seed the database
app.get('/api/seed-database', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const productTransactions = response.data;

        // Remove existing data to avoid duplicates
        await ProductTransaction.deleteMany({});

        // Insert fetched data into the database
        await ProductTransaction.insertMany(productTransactions);

        res.status(201).send({ message: 'Database initialized with seed data' });
    } catch (error) {
        res.status(500).send({ message: 'Error initializing database', error });
    }
});

// Route to fetch transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const { page = 1, perPage = 10, search = '' } = req.query;

    const query = {
        $or: [
            { title: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') },
            { price: new RegExp(search, 'i') }
        ]
    };

    try {
        const transactions = await ProductTransaction.find(query)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));

        const total = await ProductTransaction.countDocuments(query);

        res.json({ transactions, total, page: Number(page), perPage: Number(perPage) });
    } catch (error) {
        res.status(500).send({ message: 'Error fetching transactions', error });
    }
});



// Basic route to check server is running
app.get('/', (req, res) => {
    res.send('API is running...');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
