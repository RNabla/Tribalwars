export async function setCookieAsync(cookie) {
    return await browser.cookies.set(cookie);
}