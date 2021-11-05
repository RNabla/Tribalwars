export async function createNotificationAsync(title, message) {
    const manifest = await browser.runtime.getManifest();
    browser.notifications.create({
        'type': 'basic',
        'title': `${manifest.name} - ${title}`,
        'message': message,
    });
}