import { Storage } from './inf/Storage'
import { LoggerFactory } from './inf/Logger'
import { MapFiles } from './inf/MapFiles'

export const MODULE_NAMES = {
    LoggerFactory: 'LoggerFactory',
    Storage: 'Storage',
    MapFiles: 'MapFiles'
}

export const MODULE_ROOT = 'Hermitowski.Infrastructure'

!(function () {
    window[MODULE_ROOT] = window[MODULE_ROOT] || {};
    window[MODULE_ROOT][MODULE_NAMES.LoggerFactory] = LoggerFactory;
    window[MODULE_ROOT][MODULE_NAMES.Storage] = Storage;
    window[MODULE_ROOT][MODULE_NAMES.MapFiles] = MapFiles;
})();
