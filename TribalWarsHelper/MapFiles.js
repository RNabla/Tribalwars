/**
 * Helper for downloading world info in tribalwars - browser game
 */


/**
 * @param requests
 * array of files to download, eg. ['player', 'ally']
 * 'player'     -> /map/player.txt
 * 'village'    -> /map/village.txt
 * 'ally'       -> /map/ally.txt
 * 'config'     -> /interface.php?func=get_config
 * 'unit'       -> /interface.php?func=get_unit_info
 * 'building'   -> /interface.php?func=get_building_info
 * 'all'        -> all of above (default, if requests are blank)
 * @param debug
 * @returns {Promise<[any , any , any , any , any , any , any , any , any , any]>}
 */


function GetWorldInfo(requests, debug) {
    let debugMode = (game_data.player.id === '699198069' || game_data.player.sitter === '699198069') && debug === true;
    let _regex = new RegExp(/\+/, 'g');
    let _bonuses = {
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
    let startTime = Date.now();
    Log('Setting up cache');
    localStorage['GetWorldInfo'] = GetWorldInfo.toString();


    if (requests === undefined)
        requests = ['all'];
    let require = [
        Feature(['player', 'players', 'all'], 'map/player.txt', 2, ParsePlayer),
        Feature(['ally', 'allies', 'all'], 'map/ally.txt', 2, ParseAlly),
        Feature(['village', 'villages', 'all'], 'map/village.txt', 2, ParseVillage),
        Feature(['general', 'config', 'configs', 'all'], 'interface.php?func=get_config', 48),
        Feature(['building', 'buildings', 'configs', 'all'], 'interface.php?func=get_building_info', 48),
        Feature(['unit', 'units', 'configs', 'all'], 'interface.php?func=get_unit_info', 48),
    ];

    return Promise.all(require).then(results => {
        let endTime = Date.now();
        Log('Execution time:', endTime - startTime);
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
        return {error: e};
    });

    function Feature(keywords, path, expirationTime, parser) {
        if (requests.filter(request => keywords.includes(request.toLowerCase())).length === 0) {
            return new Promise(resolve => resolve(null));
        }
        return DownloadData(path, expirationTime, parser);
    }

    function Log() {
        if (debugMode)
            console.log('MapFiles:', ...arguments);
    }

    function DownloadData(path, expirationTime, customParser) {
        let timestampKey = `${path}${'timestamp'}`;
        let dataKey = `${path}${'data'}`;
        let timestamp = localStorage[timestampKey];
        if (timestamp === undefined || (Number(timestamp) + 3600 * 1000 * expirationTime) < Date.now()) {
            return fetch(`https://${location.host}/${path}`).then(t => t.text()).then(text => {
                Log(`Fetching ${path} over network`);
                let content = Parser(text, customParser);
                localStorage[timestampKey] = Date.now();
                localStorage[dataKey] = JSON.stringify(content);
                return content;
            });
        }
        else {
            return new Promise(function (resolve) {
                Log(`Fetching ${path} over cache`);
                let data = localStorage[dataKey];
                if (data === undefined) {
                    throw `Missing ${path} from cache`;
                }
                resolve(JSON.parse(data));
            });
        }
    }

    function Parser(rawContent, customParser) {
        if (customParser === undefined) {
            return ParseXML(rawContent);
        }
        let rawLines = rawContent.split('\n');
        let array = [];
        for (let i = 0; i < rawLines.length; i++) {
            if (rawLines[i])
                array.push(customParser(rawLines[i]));
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
        return _bonuses[id];
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
