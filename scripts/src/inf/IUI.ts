export interface IUI {
    create_container(): HTMLElement;
    create_control_panel(options: ControlOption[]): HTMLElement;
    create_signature_panel(forum_thread_href: string): HTMLElement;
    create_panel(node: PanelNodeDef[], panel_options?: PanelOptions): HTMLElement;
    get_control(control_name?: string): HTMLElement;
    init_select(control_name: string, options: SelectOption[]): void;
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

export interface PanelNodeDef {
    id?: string;
    type: string;
    classes?: string[];
    styles?: {
        [key: string]: string
    }
    childs?: PanelNodeDef[]
}

export interface SelectOption {
    label: string;
    value: string;
    title?: string;
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
