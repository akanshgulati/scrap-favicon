import test from 'ava';
import scrapFavicon from '..';

test('basic', async function (t) {
    const value = await scrapFavicon('https://www.google.com');
    t.is(value.images.length, 1);
});

test('with redirects 1', function (t) {
    return scrapFavicon('https://akansh.com', {maxRedirect: 1}).then(result =>{
        t.is(result.redirects.length, 1);
    });
});

test('with redirects 3', function (t) {
    return scrapFavicon('http://akansh.com', {maxRedirect: 2}).then(response => {
        t.is(response.redirects.length, 2, "with redirects 3 failed");
    });
});

test('with redirects 0', function (t) {
    return scrapFavicon('https://www.akansh.com', {maxRedirect: 0}).then(response => {
        t.is(response.redirects.length, 0, "with redirects 0 failed");
    });
});

test('only urls as configuration', async (t)=>{
    const result = await scrapFavicon('https://www.akansh.com/', {urlsOnly: true});
    t.true(typeof result.images[0].width === 'undefined');
});

test('max redirects error', async function (t) {
    return scrapFavicon('https://akansh.com', {maxRedirect: 0}).catch((err) => {
        console.log("Here");
        t.is(err.message, 'Max redirect limit reached');
    });
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
