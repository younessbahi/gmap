const axios = require('axios');
const cheerio = require('cheerio');
const {URL} = require('url');


function crawlAndExtractEmails(websiteURL) {
    const baseDomain = new URL(websiteURL).hostname;

    function isSameBaseDomain(link) {
        try {
            const url = new URL(link);
            return url.hostname === baseDomain;
        } catch (error) {
            return false;
        }
    }

    function isTelLink(link) {
        return link && link.startsWith('tel:');
    }

    function extractEmailsFromText(text) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];
        return [...new Set(emails)];
    }

    async function retryAxiosGet(url, config, maxRetries, retryDelay) {
        let retries = 0;
        const url_ = url.replace(/^http:/i, 'https:');
        while (retries < maxRetries) {
            try {

                const response = await axios.get(url_, config);
                return response.data;
            } catch (error) {
                //console.error(`Error fetching ${url_}. Retrying...`);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
        }
        throw new Error(`Max retries reached. Failed to fetch ${url_}.`);
    }

    async function extractEmailsFromPage(url) {
        try {
            const config = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
                },
            };

            const html = await retryAxiosGet(url, config, 5, 2000);

            const $ = cheerio.load(html);

            const emailsFromLinks = [];

            // Extract emails from "mailto:" links and email addresses in href
            $('a[href^="mailto:"], a[href*="@"]').each((index, element) => {
                const link = $(element).attr('href').toString();
                const decodedLink = decodeURIComponent(link); // Decode the email href to avoid extracting symbols like [space]
                const emailMatches = decodedLink.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
                if (emailMatches) {
                    emailMatches.forEach((email) => {
                        // Check if the email ends with an image extension
                        const isImageExtension = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(email);
                        if (!isImageExtension) {
                            emailsFromLinks.push(email);
                        }
                    });
                }
            });

            const textContent = $('body').html();
            const emailsFromText = extractEmailsFromText(textContent).filter((email) => {
                // Check if the email ends with an image extension
                const isImageExtension = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(email);
                return !isImageExtension;
            }).map((email) => email.toLowerCase());

            return [...emailsFromLinks, ...emailsFromText];
        } catch (error) {
            //console.error('Error extracting emails from', url, ':', error.message);
            return [];
        }
    }

    async function crawlWebsite(url) {
        try {
            const [emails, links] = await Promise.all([extractEmailsFromPage(url), extractLinks(url)]);

            const filteredLinks = links.filter((link) => !link.startsWith('#') && !isTelLink(link) && isSameBaseDomain(link) && !link.includes('wp-content'));

            const emailsFromLinks = await Promise.all(filteredLinks.map(extractEmailsFromPage));
            const allEmails = [...emails, ...emailsFromLinks.flat()];

            return {
                emails: [...new Set(allEmails)],
                links: filteredLinks
            };
        } catch (error) {
            //console.error('Error crawling', url, ':', error.message);
            return {emails: []};
        }
    }

    async function extractLinks(url) {
        try {
            const config = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
                },
            };

            const html = await retryAxiosGet(url, config, 5, 1000); // Retry up to 5 times with a 1-second delay between retries

            const $ = cheerio.load(html);
            const links = [];

            // Extract links from <li><a> tags
            $('li a').each((index, element) => {
                const link = $(element).attr('href');
                if (link) {
                    const urlObj = new URL(link, url);
                    const absoluteUrl = urlObj.href;
                    if (absoluteUrl.includes(urlObj.hostname)) {
                        links.push(absoluteUrl);
                    } else {
                        links.push(link);
                    }
                }
            });

            return links;
        } catch (error) {
            //console.error('Error extracting links from', url, ':', error.message);
            return [];
        }
    }

    // Start crawling the website and extracting emails for the initial page and Level 1 links
    return crawlWebsite(websiteURL)
        .then(({emails, links}) => {
            return {
                // websiteURL,
                emails
                // links
            };
        })
        .catch((error) => {
            // console.error('Error crawling', websiteURL, ':', error.message);
            return {
                // websiteURL,
                emails: []
                // links: []
            };
        });
}

async function crawlWebsitesData(data) {
    // Function to check if a URL is a social media link
    function isSocialMediaLink(link) {
        const socialMediaDomains = [
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'linkedin.com',
            'pinterest.com',
            'youtube.com',
            'google.com',
            // Add more social media domains..
        ];
        const url = new URL(link);
        return socialMediaDomains.some(domain => url.hostname.includes(domain));
    }

    try {
        return await Promise.all(
            data.map(async (entity) => {
                if (entity.website && !isSocialMediaLink(entity.website)) {
                    const emails = await crawlAndExtractEmails(entity.website);
                    return {...entity, email: emails}; // Add email property to the entity
                } else {
                    return entity; // If website is empty or a social media link, return the entity as is
                }
            })
        );
    } catch (error) {
        //console.error('Error crawling websites data:', error);
        return data; // Return the original data if there was an error
    }
}

module.exports = {crawlWebsitesData, crawlAndExtractEmails}