const test = require('ava');
const scrapFavicon = require('..');

test('basic', async function (t) {
    const value = await scrapFavicon('https://www.google.com');
    t.is(value.images.length, 1);
});

test('only urls as configuration', async (t)=>{
    const result = await scrapFavicon('https://www.akansh.com/', {urlsOnly: true});
    t.true(typeof result.images[0].width === 'undefined');
});

test('http url does not exists', (t)=> {
    return scrapFavicon('http://a.com').then(()=>{}, (err) => {
        t.true(!!err);
    });
});

test('https url does not exists', (t)=> {
    return scrapFavicon('http://a.com').then(()=>{}, (err) => {
        t.true(!!err);
    });
});
