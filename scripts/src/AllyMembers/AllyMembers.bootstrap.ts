import { Bootstrap } from "../inf/Bootstrap";
import { DocumentProvider } from "../inf/Document";
import { TribalWarsProvider } from "../inf/TribalWars";
import { TWMapProvider } from "../inf/impl/ITWMap";
import { UIImpl } from "../inf/impl/UI";
import { AllyMembers } from "./AllyMembers";
import { Resources } from "./AllyMembers.resources";
import { Storage, StorageFactory } from "../inf/Storage";
import { DataProvider } from "../inf/DataProvider";

!(async function () {
    await Bootstrap.run(Resources.FORUM_THREAD_HREF, async () => {
        const namespace = "Hermitowski.AllyMembers";
        const document = new DocumentProvider();
        const tribalwarsProvider = new TribalWarsProvider();
        const ui = new UIImpl(namespace, Resources.UI);
        const data_provider = new DataProvider();
        const storage = StorageFactory.create_instance(data_provider);
        const script = new AllyMembers(
            namespace,
            document,
            tribalwarsProvider,
            ui
        );
        return await script.main();
    });
})();
