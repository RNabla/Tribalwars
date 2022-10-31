import { ControlInput, ControlInputCheckbox, ControlLabel, ControlOption, IUI, PanelNodeDef, PanelOptions, SelectOption, UIResources } from "../IUI";
import { Resources } from "./UI.resources";

declare const document: Document;

export class UI implements IUI {
    private namespace: string;
    private resources: UIResources;

    constructor(namespace: string, resources: UIResources) {
        this.namespace = namespace;
        this.resources = resources;
    }

    create_panel(node_defs: PanelNodeDef[], panel_options?: PanelOptions): HTMLElement {
        const panel = document.createElement('div');
        panel.classList.add('vis', 'vis_item');
        panel.style.overflowY = 'auto';
        panel.style.height = panel_options?.height ?? '200px';
        panel.style.margin = '5px';
        for (const node_def of node_defs) {
            const element = this.create_node(node_def);
            panel.append(element);
        }
        return panel;
    }

    create_node(node_def: PanelNodeDef): HTMLElement {
        const element = document.createElement(node_def.type);
        if (node_def.id !== undefined) {
            element.id = this.get_id(node_def.id);
        }
        if (node_def.classes !== undefined) {
            for (const c of node_def.classes) {
                element.classList.add(c);
            }
        }
        if (node_def.styles !== undefined) {
            for (const style_name in node_def.styles) {
                element.style.setProperty(style_name, node_def.styles[style_name]);
            }
        }
        if (node_def.childs !== undefined) {
            for (const child_node_def of node_def.childs) {
                const child_node = this.create_node(child_node_def);
                element.append(child_node);
            }
        }
        return element;
    }

    public get_control(control_name: string | undefined): HTMLElement {
        const id = this.get_id(control_name).replace(/\./g, '\\.');
        return document.querySelector(`#${id}`)
    }

    private get_id(control_name: string | undefined): string {
        return control_name
            ? `${this.namespace}.${control_name}`
            : this.namespace;
    }

    private create_option_label(label: ControlLabel, input: ControlInput) {
        const option_cell = document.createElement('th');
        if (label === undefined) {
            const option_label = document.createElement('label');
            option_label.classList.add('center');
            option_label.setAttribute('for', this.get_id(input.id));
            const resource = this.resources[input.id];
            option_label.textContent = resource.label;
            option_label.title = resource.title;
            option_cell.append(option_label)
        }
        else if (label.type === "image") {
            const image = document.createElement('img');
            image.setAttribute('id', this.get_id(label.id));
            image.setAttribute('src', label.src);
            image.setAttribute('alt', label.id);
            image.style.margin = 'auto';
            image.style.display = 'block';
            option_cell.append(image);
        }
        return option_cell;
    }

    private create_element(control_definition: ControlInput): HTMLButtonElement | HTMLSelectElement | HTMLInputElement {
        if (control_definition.type == "text" || control_definition.type == "checkbox") {
            const element = document.createElement("input");
            element.type = control_definition.type;
            return element;
        }
        return document.createElement(control_definition.type);
    }

    private create_option_input(option: ControlOption) {
        const option_cell = document.createElement('td');
        const option_span = document.createElement('span');
        option_span.style.display = 'flex';
        for (const control_definition of option.inputs) {
            const option_control = this.create_element(control_definition);
            option_control.id = this.get_id(control_definition.id);
            if (control_definition.type === 'checkbox') {
                option_control.style.display = 'block';
                option_control.style.margin = 'auto';
                (<HTMLInputElement>option_control).checked = control_definition.checked;
            }
            else if (control_definition.type === "button") {
                option_control.textContent = this.resources[control_definition.id].label;
                option_control.style.marginTop = '2px';
                option_control.classList.add('btn');
                option_control.addEventListener('click', control_definition.click);
            }
            else if (control_definition.type === "select") {
                for (const option_value of control_definition.options) {
                    const element = document.createElement('option');
                    const ui_resource = this.resources[control_definition.id + "_" + option_value];
                    element.title = ui_resource.title;
                    element.text = ui_resource.label;
                    element.value = option_value;
                    option_control.append(element);
                }
            }
            option_control.disabled = false;
            option_span.append(option_control);
        }
        if (option.styles !== undefined) {
            for (const style_name in option.styles) {
                option_cell.style.setProperty(style_name, option.styles[style_name]);
            }
        }
        option_cell.append(option_span);
        return option_cell;
    }

    public create_control_panel(options: ControlOption[]): HTMLElement {
        const option_labels_row = document.createElement('tr');
        const option_inputs_row = document.createElement('tr');

        for (const option of options) {
            option_labels_row.append(this.create_option_label(option.label, option.inputs[0]));
            option_inputs_row.append(this.create_option_input(option));
        }

        const panel = document.createElement('div');
        const table = document.createElement('table');
        panel.classList.add('vis', 'vis_item');
        panel.style.margin = '5px';
        panel.append(table);
        table.style.width = '100%';
        table.append(option_labels_row);
        table.append(option_inputs_row);
        return panel;
    }

    public create_signature_span(forum_thread_href: string): HTMLElement {
        const span = document.createElement('span');
        span.style.display = 'flex';
        span.style.float = 'left';
        const a = document.createElement('a');
        a.setAttribute('href', forum_thread_href);
        a.textContent = Resources.FORUM_THREAD;
        span.append(a);
        return span;
    }

    public create_signature_panel(forum_thread_href: string) {
        const panel = document.createElement('div');
        panel.classList.add('vis_item');
        panel.style.margin = '5px';
        const panel_table = document.createElement('table');
        panel_table.style.width = '100%';
        const panel_tr = document.createElement('tr');
        const panel_td = document.createElement('td');
        panel_table.append(panel_tr);
        panel_tr.append(panel_td);
        panel_td.append(this.create_signature_span(forum_thread_href));
        panel.append(panel_table);
        return panel;
    }

    public create_container(): HTMLElement {
        const div = document.createElement('div');
        div.style.padding = '0px';
        div.style.margin = '0px 0px 5px 0px';
        div.setAttribute('id', this.namespace);
        div.classList.add('vis', 'vis_item');
        return div;
    }

    public init_select(control_name: string, options: SelectOption[]) {
        const control = this.get_control(control_name);
        for (const option of options) {
            const element = document.createElement('option');
            element.title = option.title;
            element.text = option.label;
            element.value = option.value;
            control.append(element);
        }
    }
}

