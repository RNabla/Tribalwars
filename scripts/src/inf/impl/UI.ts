import { ControlInput, ControlLabel, ControlOption, DialogOptions, IUI, NodeDef, PanelOptions, SelectOptions, UIResources } from "../IUI";
import { Logger, LoggerFactory } from "../Logger";
import { Resources } from "./UI.resources";

declare const image_base: string;
declare const UI: {
    init: () => void
};

export interface JQHtmlElement {
    [0]: HTMLElement
}

declare const document: Document;
declare const Dialog: {
    show(namespace: string, html: string | ((element: JQHtmlElement) => void)): void;
};

export class UIImpl implements IUI {
    private namespace: string;
    private resources: UIResources;
    private logger: Logger;

    constructor(namespace: string, resources: UIResources) {
        this.namespace = namespace;
        this.resources = resources;
        LoggerFactory.create_instance(namespace + ".UI", (logger) => this.logger = logger);
    }

    public create_output_panel(node_defs: NodeDef[], panel_options?: PanelOptions): HTMLElement {
        const panel = document.createElement("div");
        panel.classList.add("vis", "vis_item");
        panel.style.overflowY = "auto";
        panel.style.height = panel_options?.height ?? "200px";
        panel.style.margin = "5px";
        for (const node_def of node_defs) {
            const element = this.create_node(node_def);
            panel.append(element);
        }
        return panel;
    }

    public get_control<T>(control_name: string | undefined): T {
        const id = this.get_id(control_name).replace(/\./g, "\\.");
        return <T><any>document.querySelector(`#${id}`);
    }

    private get_id(control_name: string | undefined): string {
        return control_name
            ? `${this.namespace}.${control_name}`
            : this.namespace;
    }

    private create_option_label(label: ControlLabel, input: ControlInput) {
        const option_cell = document.createElement("th");
        if (label === undefined) {
            const option_label = document.createElement("label");
            option_label.classList.add("center");
            option_label.setAttribute("for", this.get_id(input.id));
            const resource = this.resources[input.id];
            option_label.textContent = resource.label;
            option_label.title = resource.title;
            option_cell.append(option_label);
        }
        else if (label.type === "image") {
            const image = document.createElement("img");
            image.setAttribute("id", this.get_id(label.id));
            image.setAttribute("src", image_base + label.src);
            image.setAttribute("alt", label.id);
            image.style.margin = "auto";
            image.style.display = "block";
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
        const option_cell = document.createElement("td");
        const option_span = document.createElement("span");
        option_span.style.display = "flex";
        for (const control_definition of option.inputs) {
            const option_control = this.create_element(control_definition);
            option_control.id = this.get_id(control_definition.id);
            if (control_definition.type === "checkbox") {
                option_control.style.display = "block";
                option_control.style.margin = "auto";
                (<HTMLInputElement>option_control).checked = control_definition.checked;
            }
            else if (control_definition.type === "button") {
                const resource = this.resources[control_definition.id];
                option_control.textContent = resource.label;
                option_control.title = resource.title;
                option_control.style.marginTop = "2px";
                option_control.classList.add("btn");
                option_control.addEventListener("click", control_definition.click);
            }
            else if (control_definition.type === "select") {
                this.populate_options(<HTMLSelectElement>option_control, control_definition.id, control_definition.options);
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
        const option_labels_row = document.createElement("tr");
        const option_inputs_row = document.createElement("tr");

        for (const option of options) {
            option_labels_row.append(this.create_option_label(option.label, option.inputs[0]));
            option_inputs_row.append(this.create_option_input(option));
        }

        const panel = document.createElement("div");
        const table = document.createElement("table");
        panel.classList.add("vis", "vis_item");
        panel.style.margin = "5px";
        panel.append(table);
        table.style.width = "100%";
        table.append(option_labels_row);
        table.append(option_inputs_row);
        return panel;
    }

    public create_signature_span(forum_thread_href: string): HTMLElement {
        const span = document.createElement("span");
        const a = document.createElement("a");
        a.setAttribute("href", forum_thread_href);
        a.textContent = Resources.FORUM_THREAD;
        span.append(a);
        return span;
    }

    public create_signature_panel(forum_thread_href: string) {
        const panel = document.createElement("div");
        panel.classList.add("vis_item");
        panel.style.margin = "5px";
        const panel_table = document.createElement("table");
        panel_table.style.width = "100%";
        const panel_tr = document.createElement("tr");
        const panel_td = document.createElement("td");
        panel_table.append(panel_tr);
        panel_tr.append(panel_td);
        panel_td.append(this.create_signature_span(forum_thread_href));
        panel.append(panel_table);
        return panel;
    }

    public create_container(elements: HTMLElement[]): void {
        const container = document.createElement("div");
        container.style.padding = "0px";
        container.style.margin = "0px 0px 5px 0px";
        container.setAttribute("id", this.namespace);
        container.classList.add("vis", "vis_item");
        for (const element of elements) {
            container.append(element);
        }
        document.querySelector("#contentContainer").prepend(container);
        this.workaround_intialize_titles();
    }

    public create_dialog(node_defs: NodeDef[], options?: DialogOptions) {
        const nodes = [];
        if (options !== undefined && options.header_name !== undefined) {
            nodes.push(this.create_node({ type: "h2", text: options.header_name }));
        }
        for (const node_def of node_defs) {
            nodes.push(this.create_node(node_def));
        }
        if (options !== undefined && options.forum_thread_href !== undefined) {
            nodes.push(this.create_signature_span(options.forum_thread_href));
        }

        Dialog.show(this.namespace, ((jq_container: JQHtmlElement) => {
            for (const node of nodes) {
                this.logger.log(node.outerHTML);
                jq_container[0].append(node);
            }
        }).bind(this));
    }

    public get_selected_label(control_name: string): string {
        const select = <HTMLSelectElement>this.get_control(control_name);
        const value = select.value;
        for (const option of select.options) {
            if (option.value == value) {
                return option.label;
            }
        }
    }

    private create_node(node_def: NodeDef): HTMLElement {
        const element = document.createElement(node_def.type);
        if (node_def.id !== undefined) {
            element.id = this.get_id(node_def.id);
        }
        if (node_def.classes !== undefined) {
            for (const class_name of node_def.classes) {
                element.classList.add(class_name);
            }
        }
        if (node_def.styles !== undefined) {
            for (const style_name in node_def.styles) {
                element.style.setProperty(style_name, node_def.styles[style_name]);
            }
        }
        if (node_def.attributes !== undefined) {
            for (const attribute_name in node_def.attributes) {
                const attribute_value = node_def.attributes[attribute_name];
                if (attribute_name == "for") {
                    element.textContent = this.resources[node_def.attributes[attribute_name]].label;
                    element.title = this.resources[node_def.attributes[attribute_name]].title;
                    element.setAttribute(attribute_name, this.get_id(node_def.attributes[attribute_name]));
                }
                else if (attribute_name == "src") {
                    element.setAttribute("src", image_base + attribute_value);
                } else {
                    element.setAttribute(attribute_name, attribute_value);
                }
            }
        }
        if (node_def.text !== undefined) {
            element.textContent = node_def.text;
        }
        if (node_def.childs !== undefined) {
            for (const child_node_def of node_def.childs) {
                const child_node = this.create_node(child_node_def);
                element.append(child_node);
            }
        }
        if (node_def.type == "button") {
            const resource = this.resources[node_def.id];
            element.textContent = resource.label;
            element.title = resource.title;
            element.classList.add("btn");
        }
        if (node_def.type == "select") {
            this.populate_options(<HTMLSelectElement>element, node_def.id, node_def.options);
        }
        if (node_def.handlers !== undefined) {
            for (const key in node_def.handlers) {
                element.addEventListener(key, node_def.handlers[key]);
            }
        }
        return element;
    }

    private populate_options(select: HTMLSelectElement, id: string, values_or_options: string[] | SelectOptions) {
        if (Array.isArray(values_or_options)) {
            const values = values_or_options;
            select.title = this.resources[id + "_" + values[0]].title;
            select.addEventListener("change", this.workaround_sync_titles.bind(this));
            for (const value of values) {
                const element = document.createElement("option");
                const ui_resource = this.resources[id + "_" + value];
                element.title = ui_resource.title;
                element.text = ui_resource.label;
                element.value = value;
                select.append(element);
            }
        } else {
            const options = values_or_options;
            for (const option_def of options.options) {
                const element = document.createElement("option");
                element.text = option_def.label;
                element.value = option_def.value;
                if (options.selected_value == option_def.value) {
                    element.selected = true;
                }
                select.append(element);
            }
        }
    }

    private workaround_intialize_titles() {
        this.logger.entry();
        UI.init();
        this.logger.exit();
    }

    private workaround_sync_titles(event: Event) {
        // TribalWars are overriding title attribute in favor of data-title and are using mouseover/out events to display information
        // this does not work for option elements...
        // as a workaround let's display title on the select element
        this.logger.entry(arguments);
        const select = <HTMLSelectElement>event.target;
        for (const child of select.children) {
            if ((<HTMLOptionElement>child).value == select.value) {
                select.setAttribute("title", child.getAttribute("data-title"));
                select.dispatchEvent(new Event("tooltip_change"));
                break;
            }
        }
        this.logger.exit();
    }

}

