import { Bootstrap } from "../inf/Bootstrap";
import { DocumentProvider } from "../inf/Document";
import { TribalWarsProvider } from "../inf/TribalWars";
import { PlaceWithdrawUnits } from "./PlaceWithdrawUnits";
import { Resources } from "./PlaceWithdrawUnits.resources";

!(async function () {
    await Bootstrap.run(Resources.FORUM_THREAD_HREF, async () => {
        const namespace = "Hermitowski.PlaceWithdrawUnits";
        const document = new DocumentProvider();
        const tribalwarsProvider = new TribalWarsProvider();
        const script = new PlaceWithdrawUnits(
            namespace,
            document,
            tribalwarsProvider,
        );
        return await script.main();
    });
})();
