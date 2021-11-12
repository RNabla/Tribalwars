const resources = require('./Bootstrap.resources.json')

function handle_error(error, forum_thread_href) {
    if (typeof (error) === 'string') {
        UI.ErrorMessage(error);
        return;
    }

    const gui =
        `<h2>${resources["HEADER"]}</h2>
        <p>
            ${resources["DESCRIPTION"]}
            <textarea rows='12' cols='80'>${error}\n\n${error.stack}</textarea><br/>
            <a href='${forum_thread_href}'>${resources["FORUM_THREAD"]}</a>
        </p>`;
    Dialog.show('Hermitowski.Bootstrap', gui);
}

export const Bootstrap = {
    run: async function (forum_thread, entry_point) {
        try {
            await entry_point();
        }
        catch (ex) {
            handle_error(ex, forum_thread);
        }
    }
}