import { DocumentProvider } from "../../mocks/Document";

export class FakingDocumentProvider extends DocumentProvider {
    constructor(name: string) {
        let document_raw = null;
        switch (name) {
            case 'place':
                document_raw = require('../resources/place.html');
                break;
        }
        super(document_raw);
    }
}