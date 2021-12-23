export interface IDocument {
    querySelector<E extends Element = Element>(selectors: string): E | null;
    querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
}

declare const document: Document;

export class DocumentProvider implements IDocument {
    querySelector<E extends Element = Element>(selectors: string): E {
        return document.querySelector(selectors);
    }
    querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> {
        return document.querySelectorAll(selectors);
    }

}