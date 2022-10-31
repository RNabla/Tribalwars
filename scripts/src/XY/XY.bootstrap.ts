import { Bootstrap } from "../inf/Bootstrap";
import { DocumentProvider } from "../inf/Document";
import { TribalWarsProvider } from "../inf/TribalWars";
import { TWMapProvider } from "../inf/impl/ITWMap";
import { UI } from "../inf/impl/UI";
import { XY } from "./XY";
import { Resources } from "./XY.resources";

!(async function () {
    await Bootstrap.run(Resources.FORUM_THREAD_HREF, async () => {
        const namespace = "Hermitowski.XY";
        const map = new TWMapProvider();
        const document = new DocumentProvider();
        const tribalwarsProvider = new TribalWarsProvider();
        const ui = new UI(namespace, Resources.UI);
        const script = new XY(
            namespace,
            document,
            tribalwarsProvider,
            map,
            ui
        );
        return await script.main();
    });
})();
