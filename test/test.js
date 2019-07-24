import test from 'ava';
import scrapFavicon from '..';

test('basic', async function (t) {
    const value = await scrapFavicon('https://www.google.com');
    t.is(value.images.length, 1);
    t.true(value.redirects.length > 0);
});

test('with redirects', async function (t) {
    const result = await scrapFavicon('https://www.github.com');

    t.true(result.redirects.length > 0);
});

test('only urls as configuration', async (t)=>{
    const result = await scrapFavicon('https://www.akansh.com', {urlsOnly: true});
    t.true(typeof result.images[0].width === 'undefined');
});

test('max redirects', async t => {
    try {
        await scrapFavicon('https://akansh.com', {maxRedirect: 0});
    } catch(err) {
        t.is(err.message, 'Max redirect limit reached');
    }
    // t.is(error.message, 'Max redirect limit reached');
});
