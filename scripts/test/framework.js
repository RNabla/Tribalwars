
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
                console.log('Running', tests.length, 'tests for', module_name)
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
                        message = ex;
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
            }
        }
    }
}

export function assert(action, message) {
    if (!action()) {
        throw message;
    }
}