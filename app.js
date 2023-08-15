// Import required modules
const express = require('express');
const cors = require('cors');
const {runScraper} = require('./view/getData');
const categories = require('./static/data/cat');
const {crawlWebsitesData, crawlAndExtractEmails} = require('./view/getEmails');
const path = require("path");

// Create an instance of Express
const app = express();

app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(express.json());

app.get('/data', async (req, res) => {
        try {
            const {category, countryISO, city, par, email} = req.body;
            // Call the runScraper function with the provided input data and additional parameter
            const result = await runScraper(category, countryISO, city, par);

            if (email === 'true') {
                crawlWebsitesData(result.data)
                    .then((updatedData) => {
                        result.data = updatedData;
                        //console.log(JSON.stringify(result, null, 2));
                        res.status(200).json({result})
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            } else {
                // Send the response with the scraped data
                res.status(200).json({result})
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({error: 'Error occurred while running the scraper.'});
        }

    }
);

app.get('/categories', (req, res) => {
    res.status(200).json({'categories': categories})

});

// Handle requests to the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

// Simple health check route
app.get('/health', (req, res) => {
    res.sendStatus(200);
});

module.exports = app;