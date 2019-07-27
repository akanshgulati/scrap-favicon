const scrapFavicon = require('..');
// fetching favicon urls and its meta information like width, height, type, etc.
scrapFavicon('http://akansh.com').then(resp => console.log("resp", resp), err => console.log("E", err));

// fetching only the urls of the favicons
scrapFavicon('http://akansh.com', {urlsOnly: true}).then(resp => console.log("resp", resp), err => console.log("E", err));

// trying to fetch from not a url, gives error
scrapFavicon('http://a.com/').then(resp => console.log(resp), err => console.log("E", err));
