import { IDataProvider } from "../../../src/inf/DataProvider";
import { MapFiles } from "../../mocks/MapFiles";

export class FakingMapFiles extends MapFiles {
    constructor(
        data_provider: IDataProvider,
        config_name: string = null
    ) {
        let config = null;
        switch (config_name) {
            case 'config_169':
                config = require('../resources/wi1/config_169.xml');
                break;
            default:
                config = require('../resources/wi1/config_168.xml');
                break;
        }
        super(
            data_provider,
            require('../resources/wi1/player.txt'),
            require('../resources/wi1/village.txt'),
            require('../resources/wi1/ally.txt'),
            config,
            require('../resources/wi1/unit_info.xml'),
            require('../resources/wi1/building_info.xml'),
        )
    }
}

