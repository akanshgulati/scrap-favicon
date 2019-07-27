Get favicons list from a website
# scrap-favicon [![Build Status](https://travis-ci.org/akanshgulati/scrap-favicon.svg?branch=master)](https://travis-ci.org/akanshgulati/scrap-favicon) [![npm version](https://badge.fury.io/js/scrap-favicon.svg)](https://badge.fury.io/js/scrap-favicon)

> Get favicon urls without downloading it along with its meta information using [`scrap-favicon`](https://github.com/akanshgulati/scrap-favicon)

## Introduction
The main aim of this package is to greedily fetch/scrap all the favicons and their dimensions without downloading it completely. (a few chunks can give correct dimensions).

1. This package scraps/fetch the favicon from the website in two steps: 
    1. Check the meta information declared.
    2. Add default favicon url (`/favicon.ico` & `/apple-touch-icon.png`) and check if resource present.
2. Download each url in chunks just to obtain favicon dimensions information using `image-size` package. 

## Install

```
$ npm install scrap-favicon
```


## Usage

```js
const scrapFavicon = require('scrap-favicon');

// Fetching all meta information of favicon
scrapFavicon('https://akansh.com').then(resp => console.log(resp), err => console.error(err));

// Fetching only urls of favicon
scrapFavicon('https://akansh.com', {
    urlsOnly: true
}).then(resp => console.log(resp), err => console.error(err));

// Setting timeout(ms) and number of redirects for website url
scrapFavicon('https://akansh.com', {
    timeout: 10000,
    maxRedirect: 2
}).then(resp => console.log(resp), err => console.error(err));
```
You can check examples [here](https://github.com/akanshgulati/scrap-favicon/blob/master/example/example.js).

## API

### scrapFavicon(url, config?)

#### url

Type: `string`

A url of the website whose favicon details needs to be scrapped

#### config

Type: `object`

##### urlsOnly

Type: `Boolean`<br>
Default: `false`

Returns only the list of the urls without meta information of favicon

##### timeout

Type: `Number`<br>
Default: `100000`

Number of milliseconds before waiting for website url to be fetched
PS: In case of redirect, each redirected url will have its own timeout

##### maxRedirects

Type: `Number`<br>
Default: `10`

Max number of redirects allowed before reaching to website url due to 301 or 302 redirects

## Example

```js
const scrapFavicon = require('scrap-favicon');

// Fetching all meta information of favicon
scrapFavicon('https://akansh.com').then(resp => console.log(resp), err => console.error(err));
/*
Result -> 
{   
    redirects: 
     [{ url: 'https://www.akansh.com/',
         timeTaken: 1140.6958409547806      // ms taken to redirect  
      }],
    images: 
     [ { url: 'https://www.akansh.com/icons/icon-48x48.png',
         scrapped: true,        // true means it has been scrapped from the website
         width: 48,             // width of the favicon image
         height: 48,            // height of the favicon image
         type: 'png',           // type of the favicon e.g. jpg, png, ico
         chunkSize: 1447,       // the size downloaded to find the meta information of the image 
         success: true },     
       { url: 'https://www.akansh.com/favicon.ico',
         scrapped: false,       // false means it was not declared on website but still available
         width: 439,
         height: 439,
         type: 'svg',
         chunkSize: 81676,
         success: true },
       { url: 'https://www.akansh.com/apple-touch-icon.png',
         scrapped: false,
         width: 439,
         height: 439,
         type: 'svg',
         chunkSize: 81676,
         success: true } ],
    timeTaken: 2341.6667330265045 
}

*/
```
