const fetch = require('cross-fetch');
const cheerio = require('cheerio');
const sizeOf = require('image-size');
const {performance} = require('perf_hooks');
const url = require('url');

var http = require('http');
var https = require('https');

const result = {};
const redirects = [];

const ERROR_ENUM = {
    MAX_REDIRECT: 'maxRedirect',
    UNKNOWN: 'unknown',
    URL_NOT_FOUND: 'urlNotFound',
    IMPROPER_FORMAT: 'urlImproper'
};
const ERROR_STATEMENT = {
    [ERROR_ENUM.MAX_REDIRECT]: 'Max redirect limit reached',
    [ERROR_ENUM.UNKNOWN]: 'Something went wrong, please contact developer',
    [ERROR_ENUM.URL_NOT_FOUND]: 'Url not found',
    [ERROR_ENUM.IMPROPER_FORMAT]: 'Url must start with http or https'
};
let Debug = false;
const log = function () {
    if (!Debug) {
        return;
    }
    console.log.apply(null, arguments);
};

function error(statement) {
    throw new Error(statement);
}


function getDefaultFaviconUrls(baseUrl) {
    const defaultURL = [combineURLs(baseUrl, '/favicon.ico'), combineURLs(baseUrl, '/apple-touch-icon.png')];
    return defaultURL.map(url => ({url: url, scrapped: false}));
}

function getHTML(url, config) {
    let localStartTime = performance.now();
    let localEndTime;

    return fetch(url, {mode: 'no-cors', redirect: 'manual', timeout: config.timeout}).then(response => {
            // in case of redirect
            if (response.status === 301 || response.status === 302) {
                // adding to redirect
                localEndTime = performance.now();
                const redirectedURL = response.headers.get('location');
                redirects.push({url: redirectedURL, timeTaken: localEndTime - localStartTime});

                const redirectCount = Object.keys(redirects);

                if (redirectCount < config.maxRedirect) {
                    return getHTML(redirectedURL, config);
                } else {
                    error(ERROR_STATEMENT[ERROR_ENUM.MAX_REDIRECT]);
                }
            }

            if (response.ok) {
                result.redirects = redirects;
                return response.text().then(_resp => {
                    return {
                        html: _resp,
                        url: response.url
                    }
                });
            }

            // in case it is not captured by any case above
            if (!response.ok) {
                return error(ERROR_STATEMENT[ERROR_ENUM.UNKNOWN]);
            }
        }
    );
}

const config = {
    maxRedirect: 10,
    timeout: 100000,
    maxSize: 1000000
};


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
        log("isValid", validity);
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
    log("favicon", favicon.length);
    favicon.each((index, $el) => {
        let url = query($el).attr('href');
        const validity = isValidURL(url);
        log("isValid", validity);
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

    log('All urls -> ', filteredUrlInfo);

    if (!config.urlsOnly) {
        return fetchImagesSize(filteredUrlInfo).then(images => {
            result.images = images.filter(image => !(image.error && !image.scrapped));
            return result;
        });
    } else {
        return checkDefaultImages(filteredUrlInfo).then(images => {
            result.images = images.filter(image => image.success);
            return result;
        });
    }
}

function checkDefaultImages(imagesInfo) {
    return new Promise(resolve => {
        let count = 0;

        imagesInfo.forEach(info => {
            if (!info.scrapped) {
                checkImage(info.url).then(response => {
                    log("response", response);
                    Object.assign(info, {success: response});
                    count++;
                    if (count === imagesInfo.length) {
                        log("Result", imagesInfo);
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
                    log("response", response);
                    Object.assign(info, response, {success: true});
                    count++;
                    if (count === imagesInfo.length) {
                        log("Result", imagesInfo);
                        resolve(imagesInfo);
                    }
                }).catch(err => {
                Object.assign(info, {success: false, error: err.message});
                count++;
                if (count === imagesInfo.length) {
                    log("Result", imagesInfo);
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
        return url.parse(urlString);
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
    log("imageURL", imgUrl);

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
        maxRedirect: 10,
        timeout: 100000,
        debug: false,
        urlsOnly: false
    }
}

function init(url, config = {}) {
    Debug = config.debug;
    let globalStartTime = performance.now();

    if (!url) {
        error(ERROR_ENUM.URL_NOT_FOUND);
    }
    config = Object.assign(getDefaultConfig(), config);

    return getHTML(url, config).then(data => {
        const query = cheerio.load(data.html);
        return extractIcons(query, data.url, config).then(result => {
            let globalEndTime = performance.now();
            result.timeTaken = globalEndTime - globalStartTime;
            return result;
        });
    });
}

module.exports = init; 
