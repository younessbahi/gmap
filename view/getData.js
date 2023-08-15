const {Cluster} = require("puppeteer-cluster");
//const fs = require("fs/promises");
// const {userAgents, getRandomUserAgent} = require('./ua');
const getLinks = require("./getLinks");
const {parseCSVFile} = require('./geoDataParser');
const {adminData} = require('../config');


async function runScraper(category, countryISO, city, par) {
    let par_ = parseInt(par)
    let links = [];
    let anySuburbs;

    if (par === undefined || par === null) {
        par = 5; // Assign default value
    }

    if (category === undefined || category === null) {
        category = 'Dentist'; // Assign default value
    } else {
        category = encodeURIComponent(category)
    }

    if (city === undefined || city === null) {
        city = 'Casablanca'; // Assign default value
    } else {
        city = encodeURIComponent(city)
    }
    //###########
    // Function to fetch links for each 'maxLevel' in the array
    async function fetchLinksForMaxLevel(maxLevelArray, category, city, anySuburbs) {

        if (anySuburbs === true) {
            const url_ = maxLevelArray.map((suburb) => {
                const suburbs = encodeURIComponent(suburb);
                return `https://www.google.com/maps/search/${category}%20near%20${suburbs}%2C%20${city}`;
            });
            // const url__ = Array.from(url_).slice(0,4)
            return await getLinks(url_, par_);

            //#############


            // Convert linksSet back to an array to get the final result without duplicates
            //return [...linksSet];
        } else {
            const url_ = `https://www.google.com/maps/search/${category}%20near%20${city}`;
            return await getLinks(url_);
        }
    }

    const maxLevelArray = await parseCSVFile(adminData, city, countryISO);

    if (maxLevelArray.length > 0) {
        anySuburbs = true
        links = await fetchLinksForMaxLevel(maxLevelArray, category, city, anySuburbs);

    } else {
        //console.log(`No entry found for NAME_2: ${city} and ISO: ${countryISO}`);
        anySuburbs = false
        links = await fetchLinksForMaxLevel(null, category, city, anySuburbs);
    }

    //###########


    //todo:why it took time here?;
    let tick = performance.now()
    links = links.flat();
    let tock = performance.now()
    let res = tock - tick
    console.log(res)


    let invalidLinks = 0;
    let linkLen = links.length;
    console.log('total links - flat: ' + linkLen); //todo:tmp

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: par_,
        timeout: 1000000,
        //monitor: true,
        skipDuplicateUrls: true,
        retryLimit: 5,
        puppeteerOptions: {
            executablePath: '/usr/bin/chromium',
            headless: true,
            defaultViewport: null,
            userDataDir: "./tmp2",
            args: [
                '--disable-gpu',
                //'--disable-setuid-sandbox', //optional
                //'--disable-dev-shm-usage', //optional
                //'--disable-setuid-sandbox', //optional
                //'--no-first-run', //optional
                '--no-sandbox',
                //'--no-zygote', //optional
                //'--single-process' //optional
            ]
        }
    });

    let data = [];
    let index_ = 0;//todo:tmp
    const timeout = 300000;
    await cluster.task(async ({page, data: url}) => {

//**************************************************************************

// Set a random user agent for the page
        // const randomUserAgent = getRandomUserAgent(userAgents);
        // await page.setUserAgent(randomUserAgent);

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: timeout,
        });

        try {
            await page.waitForSelector('.CsEnBe', {timeout: timeout});
        } catch (error) {
            //todo:count invalid links (to be subtracted from total links after tasks completion)
            invalidLinks++;
            console.error('Not an entity, url:', url);
            return;
        }
        const addressElement = await page.$('.CsEnBe[data-item-id="address"]');
        const websiteElement = await page.$('.CsEnBe[data-item-id="authority"]');
        const phoneElement = await page.$('.CsEnBe[data-tooltip="Copy phone number"], .CsEnBe[data-tooltip="Copier le numéro de téléphone"]');

        const typeElement = await page.$('.DkEaL');
        const nameElement = await page.$('h1');
        const reviewCountElement = await page.$('.HHrUdb.fontTitleSmall.rqjGif');
        const ratingElement = await page.$('.Bd93Zb > .jANrlb > div');
        const locationElement = url.split("!3d")[1].split("!");


        let address, website, phone, type_, name, reviewCount, rating, lat, long = '';

        if (addressElement) {
            address = await page.evaluate((el) => el.innerText, addressElement);
        } else {
            address = '';
        }

        if (websiteElement) {
            website = await page.evaluate((el) => el.href, websiteElement);
        } else {
            website = '';
        }

        if (phoneElement) {
            //phone = await page.evaluate((el) => el.getAttribute('aria-label'), phoneElement);
            phone = await page.evaluate((el) => el.innerText, phoneElement);
        } else {
            phone = '';
        }

        if (typeElement) {
            type_ = await page.evaluate((el) => el.innerText, typeElement);
        } else {
            type_ = '';
        }
        if (nameElement) {
            name = await page.evaluate((el) => el.innerText, nameElement);
        } else {
            name = '';
        }


        if (reviewCountElement) {
            reviewCount = await page.evaluate((el) => el.innerText.match(/\d+/)[0], reviewCountElement);
        } else {
            reviewCount = '';
        }

        if (ratingElement) {
            rating = await page.evaluate((el) => el.innerText, ratingElement);
        } else {
            rating = '';
        }

        lat = Number(await locationElement[0]);
        long = Number(await locationElement[1].split("4d")[1]);

        console.log(`${index_++}: ${name}`); //todo:tmp

        data.push({
            type: type_,
            name: name,
            address: address,
            website: website,
            phone: phone,
            rating: rating,
            reviewCount: reviewCount,
            lat: lat.toString(),
            long: long.toString(),
            url: url,
        });

    });
//Parallel execution of tasks
    for (let url of links) {
        await cluster.queue(url);
    }
    await cluster.idle();
    await cluster.close();

    const jsonContent = JSON.stringify(data);
    let len = JSON.parse(jsonContent).length;

    let message;
    let actualLen = linkLen - invalidLinks;
    if (actualLen === len) {
        message = `Data successfully retrieved`;
    } else {
        let incomplete = actualLen - len;
        let form;
        if (incomplete > 1) {
            form = "entities";
        } else {
            form = "entity";
        }
        message = `Data partially retrieved, **${incomplete}** ${form} failed`;
    }

    return {
        count: len,
        message: message,
        data: JSON.parse(jsonContent),
    }

}

module.exports = {runScraper};