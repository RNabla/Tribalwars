export interface IUI {
    get_control(control_name?: string): HTMLElement;

    create_container(elements: HTMLElement[]): void;
    create_control_panel(options: ControlOption[]): HTMLElement;
    create_signature_panel(forum_thread_href: string): HTMLElement;
    create_output_panel(node: NodeDef[], panel_options?: PanelOptions): HTMLElement;

    create_dialog(node_defs: NodeDef[], options?: DialogOptions): void;
    get_selected_label(control_name: string): string;
}

export interface UIResources {
    [key: string]: UIResource
}

export interface UIResource {
    label: string;
    title: string;
}

export interface PanelOptions {
    height?: string;
}
export interface DialogOptions {
    header_name?: string;
    forum_thread_href?: string;
}

export interface NodeDef {
    id?: string;
    type: string;
    classes?: string[];
    styles?: {
        [key: string]: string
    };
    attributes?: {
        [key: string]: string
    };
    childs?: NodeDef[];
    options?: string[] | SelectOptions;
    text?: string;
    handlers?: {
        [key: string]: () => void
    };
}

export interface SelectOptions {
    options: SelectOption[];
    selected_value: string;
}

export interface SelectOption {
    label: string;
    value: string;
}


export interface ControlOption {
    label?: ControlLabel,
    inputs: ControlInput[],
    styles?: {
        [key: string]: string
    },
}

export type ControlLabel = ControlLabelImage | ControlLabelEmpty;

export interface ControlLabelEmpty { type: "empty" }

export interface ControlLabelImage {
    type: "image"
    id: string;
    src: string;
    click?: () => void
}

export type ControlInput = ControlInputText | ControlInputCheckbox | ControlInputSelect | ControlInputButton

export interface ControlInputText {
    type: 'text',
    id: string;
    attributes: {
        size: number,
    },
}

export interface ControlInputCheckbox {
    type: 'checkbox';
    id: string;
    checked?: boolean;
}

export interface ControlInputSelect {
    type: 'select';
    id: string;
    options: string[];
}

export interface ControlInputButton {
    type: 'button';
    id: string;
    click: () => void
}
