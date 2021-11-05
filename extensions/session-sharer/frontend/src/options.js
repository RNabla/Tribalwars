import { exportKeyAsHexAsync, generateEncryptionKeyAsync } from './crypto';
import { getCurrentSettingsAsync, setItemAsync } from './storage';

(function () {
    async function saveOptions(e) {
        e.preventDefault();
        await setItemAsync({
            settings: {
                container: document.querySelector('#container').value || "",
                encryptionKey: document.querySelector('#encryptionKey').value || "",
                serverUrl: document.querySelector('#serverUrl').value || ""
            }
        });
    }

    async function restoreOptionsAsync() {
        const settings = await getCurrentSettingsAsync();
        document.querySelector('#container').value = settings.container;
        document.querySelector('#encryptionKey').value = settings.encryptionKey;
        document.querySelector('#serverUrl').value = settings.serverUrl;
    }

    async function generateEncryptionKey() {
        const encryptionKey = await generateEncryptionKeyAsync();
        const exportedKeyHex = await exportKeyAsHexAsync(encryptionKey);
        document.querySelector('#encryptionKey').value = exportedKeyHex;
    }

    document.addEventListener('DOMContentLoaded', restoreOptionsAsync);
    document.querySelector('form').addEventListener('submit', saveOptions);
    document.querySelector('#generateEncryptionKey').addEventListener('click', generateEncryptionKey);
    document.querySelector('#container').addEventListener('paste', event => {
        event.preventDefault();
        event.target.value = event.clipboardData.getData('text').replace(/-/g, '');
    });

})();