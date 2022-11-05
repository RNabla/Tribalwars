import { Bootstrap } from "../inf/Bootstrap";
import { TribalWarsProvider } from "../inf/TribalWars";
import { UIImpl } from "../inf/impl/UI";
import { TroopsCounter } from "./TroopsCounter";
import { Resources } from "./TroopsCounter.resources";

!(async function () {
    await Bootstrap.run(Resources.FORUM_THREAD_HREF, async () => {
        const namespace = "Hermitowski.TroopsCounter";
        const tribalwarsProvider = new TribalWarsProvider();
        const ui = new UIImpl(namespace, Resources.UI);
        const script = new TroopsCounter(
            namespace,
            tribalwarsProvider,
            ui
        );
        return await script.main();
    });
})();
