import { Storage } from './inf/Storage'
import { Logger } from './inf/Logger'
import { MapFiles } from './inf/MapFiles'

export const MODULE_NAMES = {
    Logger: 'Logger',
    Storage: 'Storage',
    MapFiles: 'MapFiles'
}

export const MODULE_ROOT = 'Hermitowski.Infrastructure'

!(function () {
    window[MODULE_ROOT] = window[MODULE_ROOT] || {};
    window[MODULE_ROOT][MODULE_NAMES.Logger] = Logger;
    window[MODULE_ROOT][MODULE_NAMES.Storage] = Storage;
    window[MODULE_ROOT][MODULE_NAMES.MapFiles] = MapFiles;
})();
