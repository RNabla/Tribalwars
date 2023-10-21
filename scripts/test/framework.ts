import { ScriptResult } from "../src/inf/Bootstrap";

export const TestRunner = {
    create: function (module_name: string) {
        const tests = [];
        return {
            test: async function (test_name: string, action: () => any) {
                tests.push({ test_name, action });
            },
            run: async function () {
                console.log('Running', tests.length, 'tests for', module_name);
                let failed = [];
                for (const test_item of tests) {
                    const start = Date.now();
                    let fail = true;
                    let message = '';
                    try {
                        await test_item.action();
                        fail = false;
                    }
                    catch (ex) {
                        message = '\n' + ex;
                        console.log(ex);
                        failed.push(test_item.test_name);
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
                if (failed.length > 0) {
                    console.log(`FAILED TESTS: ${failed.length}`);
                    for (const test_name of failed) {
                        console.log(`- ${test_name}`);
                    }
                }
                else {
                    console.log("ALL ok");
                }
            }
        }
    }
}

export function assert(action: () => boolean, message?: string) {
    if (!action()) {
        throw message;
    }
}

export async function assertException(action: () => any, message?: string) {
    try {
        await action();
    }
    catch (ex) {
        if (ex instanceof (ScriptResult) && ex.message == message) {

        } else {
            // console.log(ex);
            throw `Expected: ${message}. Got ${ex} instead`;
        }
    }
    finally {
        for (var i = 0; i < 42; i++) {
            console.groupEnd();
        }
    }
}