const cheerio = require('cheerio');
const sizeOf = require('image-size');
const {performance} = require('perf_hooks');
const Url = require('url');
const followRedirects = require('follow-redirects');
const { http, https } = require('follow-redirects');

const ERROR_ENUM = {
    UNKNOWN: 'unknown',
    URL_NOT_FOUND: 'urlNotFound',
    IMPROPER_FORMAT: 'urlImproper',
    TIMEOUT: 'timeout'
};
const ERROR_STATEMENT = {
    [ERROR_ENUM.UNKNOWN]: 'Something went wrong, please contact developer',
    [ERROR_ENUM.URL_NOT_FOUND]: 'Url not found',
    [ERROR_ENUM.IMPROPER_FORMAT]: 'Url must start with http or https',
    [ERROR_ENUM.TIMEOUT]: 'Request timeout'
};

function error(statement) {
    return new Error(statement);
}

function getDefaultFaviconUrls(baseUrl) {
    const defaultURL = [combineURLs(baseUrl, '/favicon.ico'), combineURLs(baseUrl, '/apple-touch-icon.png')];
    return defaultURL.map(url => ({url: url, scrapped: false}));
}

function scrapWebsite(url, config) {
    let localStartTime = performance.now();
    let localEndTime;
    const parsedUrl = parseUrl(url);
    let isTimeout = false;
    // parsedUrl.rejectUnauthorized = false;
    const Client = getClient(parsedUrl.protocol);
    return new Promise((resolve, reject) => {

        const req = Client.get(parsedUrl, resp => {
            let responseData = '';
            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                responseData += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                resolve({
                    html: responseData,
                    url: url
                })
            });
        });

        req.on('error', e => {
            if (isTimeout) {
                reject(error(ERROR_STATEMENT[ERROR_ENUM.TIMEOUT]));
                return;
            }
            reject(e);
        });
        // Handling timeout of the request
        req.setTimeout(config.timeout, () => {
            isTimeout = true;
            req.destroy();
        });
    });
}


function isValidURL(string) {
    const isValid = string.match(/(https?:\/\/)?[a-zA-z\d].+(png|ico|jpeg|jpg|webp|gif)$/i);
    return {
        isValid: !!isValid,
        isAbsolute: isValid && !!isValid[1]
    }
}

function combineURLs(baseURL, relativeURL) {
    return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
}

function extractFavicons(query, baseUrl) {
    const urls = [];
    const favicon = query("link[rel='shortcut icon']");
    favicon.each((index, $el) => {
        let url = query($el).attr('href');
        const validity = isValidURL(url);
        if (validity.isValid) {
            if (!validity.isAbsolute) {
                url = combineURLs(baseUrl, url)
            }
            urls.push({url, scrapped: true});
        }
    });
    return urls;
}

function extractAppleIcons(query, baseUrl) {
    const urls = [];
    const favicon = query("link[rel='apple-touch-icon']");
    favicon.each((index, $el) => {
        let url = query($el).attr('href');
        const validity = isValidURL(url);
        if (validity.isValid) {
            if (!validity.isAbsolute) {
                url = combineURLs(baseUrl, url)
            }
            urls.push({url, scrapped: true});
        }
    });
    return urls;
}


function extractIcons(query, baseUrl, config) {
    const defaultFavicons = getDefaultFaviconUrls(baseUrl);
    const urlsInfo = [...extractAppleIcons(query, baseUrl), ...extractFavicons(query, baseUrl), ...defaultFavicons];
    const filteredUrlInfo = urlsInfo.filter((info, index) => urlsInfo.findIndex(_info => _info.url === info.url) === index);

    if (!config.urlsOnly) {
        return fetchImagesSize(filteredUrlInfo).then(images => {
            return images.filter(image => !(image.error && !image.scrapped));
        });
    } else {
        return checkDefaultImages(filteredUrlInfo).then(images => {
            return images.filter(image => image.success);
        });
    }
}

function checkDefaultImages(imagesInfo) {
    return new Promise(resolve => {
        let count = 0;

        imagesInfo.forEach(info => {
            if (!info.scrapped) {
                checkImage(info.url).then(response => {
                    Object.assign(info, {success: response});
                    count++;
                    if (count === imagesInfo.length) {
                        resolve(imagesInfo);
                    }
                });
            } else {
                info.success = true;
                count++;
                if (count === imagesInfo.length) {
                    resolve(imagesInfo);
                }
            }
        });
    });
}

function fetchImagesSize(imagesInfo) {

    return new Promise((resolve, reject) => {
        let count = 0;
        imagesInfo.forEach(info => {
            getImageSizeFromChunk(info.url)
                .then(response => {
                    Object.assign(info, response, {success: true});
                    count++;
                    if (count === imagesInfo.length) {
                        resolve(imagesInfo);
                    }
                }).catch(err => {
                Object.assign(info, {success: false, error: err.message});
                count++;
                if (count === imagesInfo.length) {
                    resolve(imagesInfo);
                }
            });
        });
    });
}

function getClient(protocol) {
    if (protocol === 'https:') {
        return https;
    } else {
        return http;
    }
}

function parseUrl(urlString) {
    try {
        return Url.parse(urlString);
    } catch (error) {
        throw error;
    }
}

function checkImage(imgUrl) {
    return new Promise((resolve) => {

        const parsedUrl = parseUrl(imgUrl);
        const Client = getClient(parsedUrl.protocol);

        const request = Client.get(parsedUrl, response => {

            response
                .on('data', ()=> {
                    request.abort();
                    resolve(true);
                })
                .on('error', (err) => {
                    resolve(false);
                })
                .on('end', () => {
                    resolve(true);
                });
        });
    });
}

function getImageSizeFromChunk(imgUrl) {

    return new Promise((resolve, reject) => {

        const parsedUrl = parseUrl(imgUrl);
        const Client = getClient(parsedUrl.protocol);

        const request = Client.get(parsedUrl, response => {
            let buffer = Buffer.from([]);
            let dimensions;
            let imageTypeDetectionError;

            response
                .on('data', (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                    try {
                        dimensions = sizeOf(buffer);
                    } catch (e) {
                        imageTypeDetectionError = e;
                        return;
                    }
                    request.abort();
                })
                .on('error', (err) => {
                    reject(err);
                })
                .on('end', () => {
                    if (!dimensions) {
                        reject(imageTypeDetectionError);
                        return;
                    }
                    resolve({
                        width: dimensions.width,
                        height: dimensions.height,
                        type: dimensions.type,
                        chunkSize: buffer.length
                    });
                });
        });
    });
}

function getDefaultConfig() {
    return {
        maxRedirects: 10,
        timeout: 100000,
        urlsOnly: false
    }
}

function init(url, config = {}) {
    const result = {};
    let globalStartTime = performance.now();

    if (!url) {
        error(ERROR_STATEMENT[ERROR_ENUM.URL_NOT_FOUND]);
    }
    config = Object.assign(getDefaultConfig(), config);
    followRedirects.maxRedirects = config.maxRedirects;

    return scrapWebsite(url, config).then(scrapInfo => {

        const query = cheerio.load(scrapInfo.html);

        return extractIcons(query, scrapInfo.url, config).then(images => {
            const globalEndTime = performance.now();

            result.timeTaken = globalEndTime - globalStartTime;
            result.images = images;
            return result;
        });
    });
}

module.exports = init;
