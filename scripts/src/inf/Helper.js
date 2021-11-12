
export function build_key(item_name) {
    return '.' + item_name;
};


export async function get_digest(message) {
    if (typeof (message) != "string") {
        message = JSON.stringify(message);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

export function two_digit_number(number) {
    return number < 10
        ? `0${number}`
        : `${number}`;
};

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function get_timestamp_ms() {
    return Date.now();
}

export function get_timestamp_s(date) {
    return parseInt((date !== undefined ? date.getTime() : Date.now()) / 1000);
}

export async function promisify(object) {
    const promise = new Promise((resolve, reject) => {
        object.onsuccess = function (event) { resolve(event.target.result); };
        object.onerror = function (event) { reject(event); };
    });
    return await promise;
}

export function random_int(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}