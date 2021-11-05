import { setCookieAsync } from './cookies'
import { importKeyFromHexAsync, encryptValueAsync, decryptValueAsync } from './crypto'
import { getCurrentSettingsAsync } from './storage'
import { createNotificationAsync } from './notifications'

function getOverviewLink(world, sitter_id) {
    let overviewLink = `https://${world}.plemiona.pl/game.php?screen=welcome&intro&oscreen=overview`;
    if (sitter_id) {
        overviewLink += `&t=${sitter_id}`;
    }
    return overviewLink;
}

async function getSharedStorageLink(container_id, world) {
    const settings = await getCurrentSettingsAsync();
    return settings.serverUrl + `?container=${container_id}&world=${world}`;
}


async function setUpSidCookie(world, sidValue) {
    const sidCookie = {
        httpOnly: true,
        path: '/',
        secure: true,
        name: 'sid',
        value: sidValue,
        url: `https://${world}.plemiona.pl`
    };
    await setCookieAsync(sidCookie);
}

async function tryWithSharedSessionAsync(world, sitter_id) {
    const settingsError = await validateSettings();
    if (settingsError) {
        await createNotificationAsync('Ustawienia', settingsError);
        return { cancel: true };
    }
    const overviewLink = getOverviewLink(world, sitter_id);
    const settings = await getCurrentSettingsAsync();
    const sharedStorageLink = await getSharedStorageLink(settings.container, world);
    const sharedStorageResponse = await fetch(sharedStorageLink, { mode: 'cors' });
    if (sharedStorageResponse.status === 200) {
        const cipheredSid = await sharedStorageResponse.json();
        const sidValue = await unprotectAsync(cipheredSid);
        await setUpSidCookie(world, sidValue);
        const sharedSidResponse = await fetch(overviewLink, { method: 'GET', redirect: 'manual' });
        if (sharedSidResponse.status === 200) {
            let title = 'Logowanie';
            if (sitter_id) {
                title += ' (zastępstwo)';
            }
            await createNotificationAsync(title, 'Zalogowano za pomocą współdzielonej sesji');
            return { redirectUrl: overviewLink }
        }
    }
}

async function createSharedSessionAsync(world, sitter_id, sidValue) {
    const settings = await getCurrentSettingsAsync();

    const payload = await protectAsync(sidValue);
    const sharedStorageLink = await getSharedStorageLink(settings.container, world);
    const publishResponse = await fetch(sharedStorageLink, {
        mode: 'cors', method: 'POST', body: JSON.stringify(payload)
    });

    let title = 'Logowanie';
    if (sitter_id) {
        title += ' (zastępstwo)';
    }
    if (publishResponse.status == 200) {
        await createNotificationAsync(title, 'Stworzono nową współdzieloną sesję');
    } else {
        await createNotificationAsync(title, 'Coś poszło nie tak przy udostępnianiu sesji');
    }
    return { redirectUrl: getOverviewLink(world, sitter_id) };
}

async function onBeforeLoginRequestCallbackAsync(details) {
    const world = details.url.split('/').pop();
    return await tryWithSharedSessionAsync(world);
}

async function onBeforeSitterLoginRequestCallbackAsync(details) {
    const world = details.url.split('/')[2].split('.')[0];
    const sitter_id = new URLSearchParams(details.url).get('player');
    return await tryWithSharedSessionAsync(world, sitter_id);
}

async function onHeadersReceivedCallbackAsync(details) {
    const setCookieHeader = details['responseHeaders'].find(header =>
        header.name.toLowerCase() === 'set-cookie' && header.value.startsWith('sid=')
    );
    const locationHeader = details['responseHeaders'].find(header => header.name.toLowerCase() === 'location');
    if (setCookieHeader) {
        const world = details.url.split('/')[2].split('.')[0];
        const sitter_id = new URLSearchParams(locationHeader.value).get('t');
        const cookieObject = Object.fromEntries(setCookieHeader.value.split('; ').map(x => x.split('=')));
        return await createSharedSessionAsync(world, sitter_id, cookieObject['sid']);
    }
}

async function validateSettings() {
    const settings = await getCurrentSettingsAsync();
    let message = null;
    if (!settings) {
        message = 'Puste ustawienia';
    } else if (!settings.container) {
        message = 'Kontener nie wydaje się być poprawny';
    } else if (!settings.encryptionKey) {
        message = 'Klucz do szyfrowania nie wydaje się być poprawny';
    }
    return message;
}

async function protectAsync(value) {
    const settings = await getCurrentSettingsAsync();
    const encryptionKey = await importKeyFromHexAsync(settings.encryptionKey);
    return await encryptValueAsync(value, encryptionKey);
}

async function unprotectAsync(value) {
    const settings = await getCurrentSettingsAsync();
    const encryptionKey = await importKeyFromHexAsync(settings.encryptionKey);
    return await decryptValueAsync(value, encryptionKey);
}

!(async function () {
    browser.webRequest.onBeforeRequest.addListener(
        onBeforeLoginRequestCallbackAsync,
        { urls: ['*://*.plemiona.pl/page/play*'] },
        ['blocking']
    );

    browser.webRequest.onBeforeRequest.addListener(
        onBeforeSitterLoginRequestCallbackAsync,
        { urls: ['*://*.plemiona.pl/game.php?*action=sitter_login*'] },
        ['blocking']
    );

    browser.webRequest.onHeadersReceived.addListener(
        onHeadersReceivedCallbackAsync,
        { urls: ['*://*.plemiona.pl/login.php*'] },
        ['responseHeaders', 'blocking']
    );
})();