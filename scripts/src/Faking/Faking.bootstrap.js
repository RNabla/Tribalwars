import { Faking } from './Faking'
import { Bootstrap } from '../inf/Bootstrap'

!(async function () {
    const namespace = 'Hermitowski.Faking';
    const forum_thread = 'https://forum.plemiona.pl/index.php?threads/hermitowskie-fejki.125294/';
    await Bootstrap.run(forum_thread, async function () {
        await Faking.main(
            namespace,
            typeof (HermitowskieFejki) === 'object'
                ? HermitowskieFejki
                : undefined
        );
    });
})();
