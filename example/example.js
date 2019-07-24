const scrapFavicon = require('..');

// fetching favicon urls and its meta information like width, height, type, etc.
scrapFavicon('https://akansh.com', { urlsOnly: false}).then(resp => console.log(resp), err => console.log(err));

// fetching only the urls of the favicons
// scrapFavicon('https://akansh.com', { urlsOnly: true}).then(resp => console.log(resp), err => console.log(err));
