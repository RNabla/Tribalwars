import { Logger, LoggerFactory } from "./Logger";

export async function get_digest(message: string | object) {
    if (typeof (message) != "string") {
        message = JSON.stringify(message);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

export function two_digit_number(number: number) {
    return number < 10
        ? `0${number}`
        : `${number}`;
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function get_timestamp_s(date: Date) {
    return Math.floor(date.getTime() / 1000);
}

export function random_int(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

export class Throttler {
    private concurrent_tasks: number;
    private failure_sleep: number;
    private logger: Logger;

    constructor(concurrent_tasks: number) {
        this.concurrent_tasks = concurrent_tasks;
        this.failure_sleep = 1000;
        LoggerFactory.create_instance("Throttler", (logger) => this.logger = logger);
    }

    private async wrap_task<TInput, TOutput>(task_def: Task<TInput, TOutput>): Promise<[TInput, TOutput]> {
        const task = await task_def.activator(task_def.input);
        return [task_def.input, task];
    }

    public async await_all<TInput, TOutput>(tasks: Task<TInput, TOutput>[], progress_callback?: (pending_tasks: number, total_tasks: number) => void) {
        const task_queue = [...tasks];
        const active_tasks: Promise<[TInput, TOutput]>[] = [];
        const task_ids: Task<TInput, TOutput>[] = [];

        const output: TOutput[] = new Array(tasks.length).fill(null);

        while (task_queue.length || active_tasks.length) {
            this.logger.log("Task queue", task_queue, "active queue", active_tasks);
            if (progress_callback !== undefined) {
                progress_callback(task_queue.length + active_tasks.length, tasks.length);
            }
            while (task_queue.length && active_tasks.length < this.concurrent_tasks) {
                const task_def = task_queue.pop();
                const task = this.wrap_task(task_def);
                task_ids.push(task_def);
                active_tasks.push(task);
            }

            const winner = await Promise.race(active_tasks);

            this.logger.log("Winner", winner);

            for (let i = 0; i < task_ids.length; i++) {
                if (winner[0] == task_ids[i].input) {
                    for (let j = 0; j < tasks.length; j++) {
                        if (tasks[j] == task_ids[i]) {
                            const task_def = tasks[j];
                            if (winner[1] !== null) {
                                output[j] = winner[1];
                            } else {
                                await sleep(this.failure_sleep);
                                task_queue.push(task_def);
                            }
                            task_ids.splice(i, 1);
                            active_tasks.splice(i, 1);
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return output;
    }
}

export interface Task<TInput, TOutput> {
    input: TInput;
    activator: (input: TInput) => Promise<TOutput>;
}