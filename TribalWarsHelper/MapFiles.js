/**
 * Helper for downloading world info in TribalWars
 * Created by: Hermitowski
 * Modified on: 14/02/2018 - version 1.0
 * Modified on: 26/09/2018 - version 1.1 - adding mandatory caching
 * Modified on: 14/10/2018 - version 1.2 - caching options
 */

/**
 * This function takes object in which key should map to one of this entities, each entity should contain preferred
 * settings. (for now it's only caching option, maybe there will be more option in the feature)
 *
 * Sample config:
 * let config = {
 *     entity: {
 *         caching: CACHE_OPTION
 *     },
 *     entity: {
 *         caching: CACHE_OPTION
 *     },
 * };
 *
 * where entity is one of the following:
 *  'player'        /map/player.txt
 *  'village'       /map/village.txt
 *  'ally'          /map/ally.txt
 *  'config'        /interface.php?func=get_config
 *  'unit_info'     /interface.php?func=get_unit_info
 *  'building_info' /interface.php?func=get_building_info
 *
 * where CACHE_OPTION is one of the following:
 *  'None'          data will be downloaded, but it won't be saved in localStorage
 *  'Preferred'     data will be downloaded, and script will try to save it in localStorage
 *  'Mandatory'     data will be downloaded, and saved in localStorage, if that's not possible, e.g. quota
 *                  script will throw an exception (default)
 */

function GetWorldInfo(config) {
    let _cache_key = 'MapFiles_CacheControl';
    let _regex = new RegExp(/\+/, 'g');
    let _bonuses = {
        0: 'none',
        1: 'wood',
        2: 'stone',
        3: 'iron',
        4: 'farm',
        5: 'barracks',
        6: 'stable',
        7: 'garage',
        8: 'all',
        9: 'storage',
    };
    let _feature2path = {
        player: 'map/player.txt',
        village: 'map/village.txt',
        ally: 'map/ally.txt',
        config: 'interface.php?func=get_config',
        building_info: 'interface.php?func=get_building_info',
        unit_info: 'interface.php?func=get_unit_info'
    };
    let _feature2expirationTime = {
        player: 2 * 60 * 60 * 1000,
        village: 2 * 60 * 60 * 1000,
        ally: 2 * 60 * 60 * 1000,
        config: 24 * 60 * 60 * 1000,
        building_info: 24 * 60 * 60 * 1000,
        unit_info: 24 * 60 * 60 * 1000
    };
    let _feature2parser = {
        player: ParsePlayer,
        village: ParseVillage,
        ally: ParseAlly,
    };

    function MapFeatureToPath(feature) {
        if (_feature2path.hasOwnProperty(feature)) {
            return _feature2path[feature];
        }
    }

    function MapFeatureToExpirationTime(feature) {
        if (_feature2expirationTime.hasOwnProperty(feature)) {
            return _feature2expirationTime[feature];
        }
    }

    function MapFeatureToParser(feature) {
        if (_feature2parser.hasOwnProperty(feature)) {
            return _feature2parser[feature];
        }
        return undefined;
    }

    function SaveToLocalStorage(key, item, caching) {
        try {
            localStorage.setItem(key, item);
            return true;
        }
        catch (e) {
            if (caching !== 'Preferred') {
                throw e;
            }
        }
        return false;
    }

    function GetFeatureIfRequested(feature) {
        let featureConfig = config[feature];
        if (featureConfig === undefined) {
            return new Promise(resolve => resolve(null));
        }
        let path = MapFeatureToPath(feature);
        let expirationTime = MapFeatureToExpirationTime(feature);
        let parser = MapFeatureToParser(feature);
        return GetData(path, expirationTime, featureConfig.caching, parser);
    }

    function GetDataFromLocalStorage(key) {
        return new Promise(resolve => resolve(JSON.parse(localStorage[key])))
    }

    function GetDataFromServer(key, path, expirationTime, caching, parser) {
        return fetch(`https://${location.host}/${path}`).then(t => t.text()).then(rawData => {
            let data = Parser(rawData, parser);
            if (caching !== 'None' && SaveToLocalStorage(key, JSON.stringify(data), caching)) {
                SetupCacheControl(key, expirationTime);
            }
            return data;
        });
    }

    function GetData(path, expirationTime, caching, parser) {
        let key = `MapFiles_${path}`;
        return IsCacheValid(key)
            ? GetDataFromLocalStorage(key)
            : GetDataFromServer(key, path, expirationTime, caching, parser);
    }

    function GetCacheControl() {
        let cacheControl = localStorage.getItem(_cache_key);
        if (cacheControl == null) {
            return {};
        }
        return JSON.parse(cacheControl);
    }

    function IsCacheValid(key) {
        let cacheControl = GetCacheControl();
        return cacheControl.hasOwnProperty(key)
            && Number(cacheControl[key]) >= Date.now();
    }

    function InvalidateCache() {
        let cacheControl = GetCacheControl();
        for (const key in cacheControl) {
            if (cacheControl.hasOwnProperty(key)
                && !IsCacheValid(key)) {
                localStorage.removeItem(key);
            }
        }
    }

    function SetupCacheControl(dataKey, expirationTime) {
        let cacheControl = GetCacheControl();
        cacheControl[dataKey] = Date.now() + expirationTime;
        localStorage[_cache_key] = JSON.stringify(cacheControl);
    }

    function SetupScriptCache() {
        if (localStorage.getItem('GetWorldInfo') === null) {
            if (SaveToLocalStorage('GetWorldInfo', GetWorldInfo.toString(), true)) {
                SetupCacheControl('GetWorldInfo', 24 * 60 * 60 * 1000);
            }
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
            bonus: _bonuses[(Number(raw[6]))]
        };
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


    SetupScriptCache();
    InvalidateCache();
    let requests = [
        GetFeatureIfRequested('player'),
        GetFeatureIfRequested('ally'),
        GetFeatureIfRequested('village'),
        GetFeatureIfRequested('config'),
        GetFeatureIfRequested('building_info'),
        GetFeatureIfRequested('unit_info')
    ];
    return Promise.all(requests).then(results => {
        return {
            player: results[0],
            ally: results[1],
            village: results[2],
            config: results[3],
            building_info: results[4],
            unit_info: results[5]
        }
    }).catch(e => {
        return {error: e};
    });

}