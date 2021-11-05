export function toHex(buffer) {
    return [...buffer].map(Number).map(x => {
        return x < 16
            ? `0${x.toString(16)}`
            : x.toString(16);
    }).join('');
}


export function fromHex(hex) {
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) {
        buffer.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(buffer);
}
