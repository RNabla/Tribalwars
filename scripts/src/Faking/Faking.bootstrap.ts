import { Faking } from "./Faking";
import { Bootstrap } from "../inf/Bootstrap";
import { MapFilesFactory } from "../inf/MapFiles";
import { DocumentProvider } from "../inf/Document";
import { TribalWarsProvider } from "../inf/TribalWars";
import { DataProvider } from "../inf/DataProvider";

declare const HermitowskieFejki: object;

!(async function () {
    const forum_thread = "https://forum.plemiona.pl/index.php?threads/hermitowskie-fejki.125294/";
    await Bootstrap.run(forum_thread, async () => {
        const namespace = "Hermitowski.Faking";
        const data_provider = new DataProvider();
        const map_files = await MapFilesFactory.create_instance(namespace, data_provider);
        const document = new DocumentProvider();
        const tribalwars = new TribalWarsProvider();
        const script = new Faking(
            namespace,
            data_provider,
            map_files,
            document,
            tribalwars
        );
        return await script.main(typeof (HermitowskieFejki) === "object"
            ? HermitowskieFejki
            : undefined
        );
    });
})();
