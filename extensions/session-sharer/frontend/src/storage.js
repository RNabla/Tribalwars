export async function setItemAsync(item) {
    return await browser.storage.local.set(item);
}

export async function getItemAsync(key) {
    return browser.storage.local.get(key);
}

export async function getCurrentSettingsAsync() {
    let storage = await getItemAsync('settings');

    if (!storage || !storage.settings) {
        await setItemAsync({
            settings: {
                container: '',
                encryptionKey: ''
            }
        });
        storage = await getItemAsync('settings');
    }
    return storage.settings;
};