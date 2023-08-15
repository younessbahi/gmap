const {Cluster} = require('puppeteer-cluster');

async function removeDuplicates(data) {
    let newData = [];
    const notBar = [
        "nail",
        "beauty",
        "salon",
        "blow",
        "lash",
        "training",
        "tan",
        "nails",
        "maarif"
    ];

    for (let i = 0; i < data.length; i++) {
        let notBarFound = false;
        const name = data[i].name.split(" ");
        await Promise.all(
            name.map(async (word) => {
                await Promise.all(
                    notBar.map((j) => {
                        if (j === word.toLowerCase()) {
                            notBarFound = true;
                        }
                    })
                );
            })
        );

        if (notBarFound) {
            continue;
        }

        if (
            newData.every(
                (obj) =>
                    obj.name !== data[i].name ||
                    (obj.lat !== data[i].lat && obj.long !== data[i].long)
            )
        ) {
            newData = [...newData, data[i]];
        }
    }

    return newData;
}

async function getLinks(url_, par) {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: parseInt(par),
        timeout: 1000000,
        //monitor: true,
        skipDuplicateUrls: true,
        retryLimit: 5,
        puppeteerOptions: {
            executablePath: '/usr/bin/chromium',
            headless: 'old',
            defaultViewport: null,
            userDataDir: "./tmp",
            args: [
                '--disable-gpu',
                '--no-sandbox',
                '--unlimited-storage'
            ]
        }
    });

    //try {
    let index = 0;
    const uniqueUrls = new Set();
    await cluster.task(async ({page, data: url}) => {

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 300000
            });
            if (page.isClosed()) {
                return; // Check if the page is not open before interaction
            }

            const data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const className = "m6QErb DxyBCb kA9KIf dS8AEf ecceSd";
                    const container = document.getElementsByClassName(className)[1];
                    const scrollDistance = 1200;
                    let scrollTimeout;

                    function scrollContainer() {
                        const currentScroll = container.scrollTop;
                        const newScroll = currentScroll + scrollDistance;

                        container.scrollTo({
                            top: newScroll,
                            behavior: 'smooth'
                        });

                        scrollTimeout = setTimeout(scrollContainer, 1000);
                    }

                    function stopScrolling() {
                        clearTimeout(scrollTimeout);
                    }

                    let collection = document.getElementsByClassName("Nv2PK");
                    let list = [];
                    let intervalObj;
                    let count;

                    function scrapeData() {
                        if (count === collection.length) {
                            collection[collection.length - 1].getElementsByTagName('a')[0].click();
                        }
                        if (document.getElementsByClassName('PbZDve').length > 0) {
                            clearInterval(intervalObj);
                            stopScrolling();
                            for (let i = 0; i < collection.length; i++) {
                                const url = collection[i].innerHTML.split("href=")[1];
                                if (!!url.length) {
                                    const name = url
                                        .split("/place")[1]
                                        .split("/")[1]
                                        .replace(/[^\s, a-zA-Z]+/gi, " ");
                                    let detailExpand;
                                    try {
                                        detailExpand = collection[i].querySelector('a').href;
                                    } catch (e) {
                                        detailExpand = '';
                                    }

                                    list.push({
                                        name,
                                        detailExpand
                                    });
                                }
                            }
                            resolve(list);

                        } else {
                            scrollContainer();
                            count = collection.length;
                        }
                    }

                    intervalObj = setInterval(scrapeData, 7000);

                });
            });
            const newData = await removeDuplicates(data);
            const jsonData = JSON.stringify(newData, null, 2);
            const parsedData = JSON.parse(jsonData);
            const urlsArray = parsedData.map(obj => obj.detailExpand);
            urlsArray.forEach(obj => uniqueUrls.add(obj));

            // console.log(index++, `| len: ${uniqueUrls.size}`)
        } catch (e) {
            if (page.isClosed()) {
                return; // Check if the page is not open before interaction
            }
            console.log('Error getting links', e);

        }

    });

    for (let url of url_) {
        await cluster.queue(url);
    }
    await cluster.idle();
    await cluster.close();
    return Array.from(uniqueUrls);

}

module.exports = getLinks;