export async function get_digest(message: string | object) {
    if (typeof (message) != "string") {
        message = JSON.stringify(message);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

export function two_digit_number(number: number) {
    return number < 10
        ? `0${number}`
        : `${number}`;
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// export function get_timestamp_ms() {
//     return Date.now();
// }

export function get_timestamp_s(date: Date) {
    return Math.floor(date.getTime() / 1000);
}



export function random_int(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

export class Exception extends Error {
    message: string;
    location?: string;
}