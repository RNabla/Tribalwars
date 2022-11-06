import { Bootstrap } from "../inf/Bootstrap";
import { DocumentProvider } from "../inf/Document";
import { TribalWarsProvider } from "../inf/TribalWars";
import { UIImpl } from "../inf/impl/UI";
import { AllyMembers } from "./AllyMembers";
import { Resources } from "./AllyMembers.resources";

!(async function () {
    await Bootstrap.run(Resources.FORUM_THREAD_HREF, async () => {
        const namespace = "Hermitowski.AllyMembers";
        const document = new DocumentProvider();
        const tribalwarsProvider = new TribalWarsProvider();
        const ui = new UIImpl(namespace, Resources.UI);
        const script = new AllyMembers(
            namespace,
            document,
            tribalwarsProvider,
            ui
        );
        return await script.main();
    });
})();
