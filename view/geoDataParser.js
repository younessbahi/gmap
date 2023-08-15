const fs = require('fs');
const csvParser = require('csv-parser');

function searchForMaxLevel(csvData, city, countryISO) {
    const results = csvData.filter(
        (entry) => entry.city === city && entry.iso === countryISO 
    );

    return results.map((entry) => entry.maxLevel);
}

function parseCSVFile(filePath, city, countryISO) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                const maxLevelArray = searchForMaxLevel(results, city, countryISO);
                resolve(maxLevelArray);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

module.exports = {
    parseCSVFile,
};
