import { IDocument } from "../../src/inf/Document";

export abstract class DocumentProvider implements IDocument {
    public document: HTMLElement;
    document_raw: any;
    constructor(document_raw: string) {
        this.document_raw = document_raw;
        // require(document_path);
        this.document = document.createElement('document');
        this.document.innerHTML = this.document_raw;
    }

    createElement(_: string): HTMLElement {
        throw new Error("Method not implemented.");
    }

    querySelector<E extends Element = Element>(selectors: string): E {
        return this.document.querySelector(selectors);
    }
    querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> {
        return this.document.querySelectorAll(selectors);
    }
}