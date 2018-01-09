/**
 * Helper for downloading world info in tribalwars - browser game
 */


function GetWorldInfo() {
    let debugMode = game_data.player.id === '699198069';
    let _regex = new RegExp(/\+/, 'g');
    let world = game_data.world;
    let startTime = Date.now();
    if (debugMode)
        console.log("Start time:", startTime);
    return Promise.all([
        DownloadData(world, 'map/player.txt', 6).then(text => {
            return Parser(text, ParsePlayer);
        }),
        DownloadData(world, 'map/ally.txt', 6).then(text => {
            return Parser(text, ParseAlly);
        }),
        DownloadData(world, 'map/village.txt', 6).then(text => {
            return Parser(text, ParseVillage);
        }),
        DownloadData(world, 'interface.php?func=get_config', 48).then(text => {
            return Parser(text);
        }),
        DownloadData(world, 'interface.php?func=get_building_info', 48).then(text => {
            return Parser(text);
        }),
        DownloadData(world, 'interface.php?func=get_unit_info', 48).then(text => {
            return Parser(text);
        })

    ]).then(results => {
        let endTime = Date.now();
        if (debugMode) {
            console.log("End time:", endTime);
            console.log("Execution time:", endTime - startTime);
        }
        return {
            'player': results[0],
            'ally': results[1],
            'village': results[2],
            'config': {
                'general': results[3],
                'building': results[4],
                'unit': results[5]
            }
        };
    }).catch(e => {
        Dialog.show('scriptError', `<h2>B\u0142\u0105d podczas wykonywania skryptu</h2><p>Komunikat o b\u0142\u0119dzie: <br/><textarea>${e}</textarea></p>`)
    });

    function DownloadData(server, path, expirationTime) {
        let timestampKey = `${server}${path}${'timestamp'}`;
        let dataKey = `${server}${path}${'data'}`;
        let timestamp = localStorage[timestampKey];
        if (timestamp === undefined || (timestamp + 3600 * 1000 * expirationTime) < Date.now()) {
            return fetch(`https://${server}.plemiona.pl/${path}`).then(t => t.text()).then(text => {
                if (debugMode)
                    console.log('fetching over network');
                let content = text;
                localStorage[timestampKey] = Date.now();
                localStorage[dataKey] = content;
                return content;
            });
        }
        else {
            return new Promise(function (resolve) {
                if (debugMode)
                    console.log('fetching over cache');
                let data = localStorage[dataKey];
                if (data === undefined) {
                    localStorage.removeItem(dataKey);
                    localStorage.removeItem(timestampKey);
                    return resolve(DownloadData(server, path));
                }
                resolve(data);
            });
        }
    }

    function Parser(rawContent, constructor) {
        if (constructor === undefined) {
            return ParseXML(rawContent);
        }
        let rawLines = rawContent.split("\n");
        let array = [];
        for (let i = 0; i < rawLines.length; i++) {
            if (rawLines[i])
                array.push(constructor(rawLines[i]));
        }
        return array;
    }

    function ParsePlayer(rawLine) {
        let raw = rawLine.split(',');
        return {
            id: Number(raw[0]),
            name: _decode(raw[1]),
            allyId: Number(raw[2]),
            villages: Number(raw[3]),
            points: Number(raw[4]),
            ranking: Number(raw[5])
        };
    }

    function ParseAlly(rawLine) {
        let raw = rawLine.split(',');
        return {
            id: Number(raw[0]),
            name: _decode(raw[1]),
            tag: _decode(raw[2]),
            playersCount: Number(raw[3]),
            villagesCount: Number(raw[4]),
            top40Points: Number(raw[5]),
            points: Number(raw[6]),
            ranking: Number(raw[7])
        };
    }

    function ParseVillage(rawLine) {
        let raw = rawLine.split(',');
        return {
            id: Number(raw[0]),
            name: _decode(raw[1]),
            x: Number(raw[2]),
            y: Number(raw[3]),
            coords: `${Number(raw[2])}|${Number(raw[3])}`,
            playerId: Number(raw[4]),
            points: Number(raw[5]),
            bonus: ParseBonus(Number(raw[6]))
        };
    }

    function ParseBonus(id) {
        let bonuses = {
            0: 'none',
            1: 'wood',
            2: 'stone',
            3: 'iron',
            4: 'farm',
            5: 'barracks',
            6: 'stable',
            7: 'barracks',
            8: 'eco',
            9: 'market',
        };
        return bonuses[id];
    }

    function ParseXML(xmlString) {
        let xml = $.parseXML(xmlString);
        if (xml.childElementCount !== 1 || xml.children[0].nodeName !== 'config')
            throw 'seems like invalid config';
        return _recursiveXMLNodeParser(xml.children[0]);
    }

    function _recursiveXMLNodeParser(root) {
        let obj = {};
        if (root.childElementCount === 0) {
            return root.textContent;
        }
        for (const node of root.children)
            obj[node.nodeName] = _recursiveXMLNodeParser(node);
        return obj;
    }

    function _decode(encodedString) {
        return decodeURIComponent(encodedString.replace(_regex, ' '));
    }
}
