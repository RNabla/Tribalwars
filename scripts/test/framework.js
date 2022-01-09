import { ScriptResult } from "../src/inf/Bootstrap";

export const TestRunner = {
    create: function (module_name) {
        const tests = [];
        const pre_actions = [];
        return {
            add_pre_action: async function (pre_action) {
                pre_actions.push(pre_action);
            },
            test: async function (test_name, action) {
                tests.push({ test_name, action });
            },
            run: async function () {
                console.log('Running', tests.length, 'tests for', module_name);
                let failed = 0;
                for (const test_item of tests) {
                    const start = Date.now();
                    let fail = true;
                    let message = '';
                    try {
                        for (let pre_action of pre_actions) {
                            await pre_action();
                        }
                        await test_item.action();
                        fail = false;
                    }
                    catch (ex) {
                        message = '\n' + ex;
                        console.log(ex);
                        failed++;
                    }
                    finally {
                        let output = `Elapsed time: [${(Date.now() - start).toString().padStart(4, ' ')}]ms. `;
                        output += fail ? 'FAIL ' : 'OK   ';
                        output += test_item.test_name;
                        output += message;
                        if (fail) {
                            console.error(output);
                        }
                        else {
                            console.log(output);
                        }
                    }
                }
                if (failed > 0) {
                    console.log(`FAILED: ${failed}`);
                }
                else {
                    console.log("ALL ok");
                }
            }
        }
    }
}

export function assert(action, message) {
    if (!action()) {
        throw message;
    }
}

export async function assertException(action, message) {
    try {
        await action();
    }
    catch (ex) {
        if (ex instanceof (ScriptResult) && ex.message == message) {

        } else {
            throw `Expected: ${message}. Got ${ex} instead`;
        }
    }
    finally {
        for (var i = 0; i < 42; i++) {
            console.groupEnd();
        }
    }
}