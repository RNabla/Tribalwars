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
                        let result = test_item.test_name;
                        result += ' ';
                        result += ex;
                        failed.push(result);
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
                    for (const result of failed) {
                        console.log(`- ${result}`);
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
    let exception = null;

    try {
        await action();
    }
    catch (ex) {
        exception = ex;
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

    if (!exception) {
        throw `Expected: ${message}. Got no exception instead`
    }
}