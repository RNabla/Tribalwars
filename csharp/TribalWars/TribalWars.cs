using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace TribalWars
{
    public static class TribalWars
    {
        private static readonly Dictionary<string, World> Worlds = new Dictionary<string, World>();

        public static World World(int server)
        {
            if (Worlds.TryGetValue("pl" + server, out World result))
                return result;
            result = new World("pl" + server);
            Worlds.Add("pl" + server, result);
            return result;
        }

        public static World World(string server)
        {
            if (Worlds.TryGetValue(server, out World result))
                return result;
            result = new World(server);
            Worlds.Add(server, result);
            return result;
        }
    }

    public class World : IEnumerable<Ally>, IEnumerable<Player>, IEnumerable<Village>
    {
        public World(string server)
        {
            Server = server;
            var tasks = new[]
            {
                DownloadData("/map/player.txt"),
                DownloadData("/map/village.txt"),
                DownloadData("/map/ally.txt")
            };
            Task.WaitAll(tasks);

            var playersRaw = tasks[0].Result.Split('\n');
            var villagesRaw = tasks[1].Result.Split('\n');
            var alliesRaw = tasks[2].Result.Split('\n');
            foreach (var playerRaw in playersRaw)
            {
                if (string.IsNullOrEmpty(playerRaw)) continue;
                var player = new Player(playerRaw);
                Player.Add(player.Id, player);
            }
            foreach (var villageRaw in villagesRaw)
            {
                if (string.IsNullOrEmpty(villageRaw)) continue;
                var village = new Village(villageRaw);
                Village.Add(village.Id, village);
            }
            foreach (var allyRaw in alliesRaw)
            {
                if (string.IsNullOrWhiteSpace(allyRaw)) continue;
                var ally = new Ally(allyRaw);
                Ally.Add(ally.Id, ally);
            }
        }

        public string Server { get; }

        public SortedDictionary<int, Player> Player { get; } = new SortedDictionary<int, Player>();
        public SortedDictionary<int, Village> Village { get; } = new SortedDictionary<int, Village>();
        public SortedDictionary<int, Ally> Ally { get; } = new SortedDictionary<int, Ally>();

        public IEnumerable<Village> Villages => Village.Values;
        public IEnumerable<Player> Players => Player.Values;

        public IEnumerable<Ally> Allies => Ally.Values;

        IEnumerator<Ally> IEnumerable<Ally>.GetEnumerator()
        {
            return Allies.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            throw new NotImplementedException("Specify what kind of collection you want");
        }

        IEnumerator<Player> IEnumerable<Player>.GetEnumerator()
        {
            return Players.GetEnumerator();
        }

        IEnumerator<Village> IEnumerable<Village>.GetEnumerator()
        {
            return Villages.GetEnumerator();
        }

        public async Task<string> DownloadData(string what)
        {
            var file = $@"../../../{Server}{what}".Replace("?", "/").Replace("&", "/");
            if (file.EndsWith(".txt") == false)
                file += ".txt";

            if (File.Exists(file))
                if (File.GetLastWriteTime(file).AddHours(3.0).CompareTo(DateTime.Now) > 0)
                    using (var reader = File.OpenText(file))
                    {
                        return await reader.ReadToEndAsync();
                    }
            using (var client = new WebClient())
            {
                client.DownloadStringCompleted += (sender, args) =>
                {
                    if (args.Error != null) return;
                    Directory.CreateDirectory(string.Join("/",
                        file.Split('/').TakeWhile(text => !text.Contains(".txt"))));
                    using (var fs = File.Create(file))
                    {
                        using (var sw = new StreamWriter(fs))
                        {
                            sw.Write(args.Result);
                            sw.Flush();
                        }
                    }
                };

                return await client.DownloadStringTaskAsync($"https://{Server}.plemiona.pl{what}");
            }
        }
    }

    public static class WorldExtender
    {
        public static ICollection<Village> GenerateSecondLine(this World world, ICollection<int> allies,
            ICollection<int> enemies,
            double maximumInnerDistance, int neighborInnerVillages, double maximumOuterDistance,
            int neighborOuterVillages)
        {
            var inner = world.GenerateFront(allies, enemies, maximumInnerDistance, neighborInnerVillages);
            var outer = world.GenerateFront(allies, enemies, maximumOuterDistance, neighborOuterVillages);
            foreach (var village in inner)
                outer.Remove(village);
            return outer;
        }

        public static ICollection<Village> GenerateFront(this World world, ICollection<int> allies,
            ICollection<int> enemies, double maximumDistance, int neighborVillages)
        {
            // TODO: morale na podstawie punktów
            List<Point> polygon = null;
            var allyPlayers =
                new SortedSet<Player>(world.Players.Where(player => allies.Contains(player.AllyId)));
            var enemyPlayers =
                new SortedSet<Player>(world.Players.Where(player => enemies.Contains(player.AllyId)));
            var alliesVillages =
                new List<Village>(world.Villages.Where(
                    village => allyPlayers.Count(player => player.Id == village.PlayerId) != 0));
            var enemiesVillages =
                new List<Village>(world.Villages.Where(
                    village => enemyPlayers.Count(player => player.Id == village.PlayerId) != 0));
            var output = new List<Village>();

            output.AddRange(enemiesVillages.Where(enemyVillage => alliesVillages.Count(allyVillage =>
            {
                if (allyVillage.Distance(enemyVillage) <= maximumDistance)
                    return Geometry.IsInsidePolygon(polygon, enemyVillage.Coords);
                return false;
            }) >= neighborVillages));
            return output;
        }

        public static ICollection<Village> GenerateFakes(this World world, ICollection<int> allyAllies,
            ICollection<int> allyPlayers, ICollection<int> allyVillages, ICollection<int> enemyAllies,
            ICollection<int> enemyPlayers, ICollection<int> enemyVillages, double maximumDistance)
        {
            var aPlayers = new SortedSet<int>(allyPlayers ?? new int[0]);
            var ePlayers = new SortedSet<int>(enemyPlayers ?? new int[0]);
            if (allyAllies != null)
                aPlayers.AddRange(world.Players.Where(player => allyAllies.Contains(player.AllyId))
                    .Select(player => player.Id));
            if (enemyAllies != null)
                ePlayers.AddRange(world.Players.Where(player => enemyAllies.Contains(player.AllyId))
                    .Select(player => player.Id));

            var aVillages = new SortedSet<Village>();

            aVillages.AddRange(world.Villages.Where(village => aPlayers.Contains(village.PlayerId) ||
                                                               allyVillages != null &&
                                                               allyVillages.Contains(village.Id)));

            var output = new List<Village>();

            output.AddRange(world.Villages.Where(village =>
            {

                return ePlayers.Contains(village.PlayerId) &&
                       aVillages.Any(allyVillage => Geometry.Distance(village.Coords, allyVillage.Coords) <=
                                                    maximumDistance)
                       || enemyVillages != null && enemyVillages.Contains(village.Id) &&
                       aVillages.Any(allyVillage => Geometry.Distance(allyVillage.Coords, village.Coords) <=
                                                    maximumDistance);
            }));
            return output;
        }

        public static ICollection<Village> FetchBarbarianVillages(this World world, int village, double maximumDistance,
            double? minimumPoints = null, double? maximumPoints = null)
        {
            var minPoints = minimumPoints ?? 0;
            var maxPoints = maximumPoints ?? 20000;
            var coords = world.Village[village].Coords;
            var barbarians = world.Villages.Where(v => v.PlayerId == 0)
                .Where(v => minPoints <= v.Points && v.Points <= maxPoints)
                .Select(v => new {Village = v, Distance = Geometry.Distance(v.Coords, coords)})
                .Where(v2 => v2.Distance <= maximumDistance)
                .OrderBy(v3 => v3.Distance).Select(v4 => v4.Village)
                .ToList();

            return barbarians;
        }
    }

    internal static class CollectionExtender
    {
        public static void SaveToFile<T>(this ICollection<T> collection, string fileName, string seperator)
        {
            using (var fs = new FileStream(fileName, FileMode.Create))
            {
                using (var sw = new StreamWriter(fs))
                {
                    sw.Write(string.Join(seperator, collection));
                }
            }
            Console.WriteLine($"Saved {collection.Count} elements to {fileName}");
        }

        public static void AddRange<T>(this ICollection<T> destination, IEnumerable<T> source)
        {
            var list = destination as List<T>;
            if (list == null)
                foreach (var item in source)
                    destination.Add(item);
            else
                list.AddRange(source);
        }
    }

    public static class Sniffer
    {
        public static void SniffVacations(this World world)
        {
            var players = new SortedSet<int>(world.Players.Select(player => player.Id));
            var lookupVillages = new List<int>(players.Count);
            foreach (var village in world.Villages)
                if (players.Contains(village.PlayerId))
                {
                    lookupVillages.Add(village.Id);
                    players.Remove(village.PlayerId);
                }
            var vacations = new List<Tuple<int, int, int>>();
            var maxFailures = 10;
            
            foreach (var villageId in lookupVillages)
            {
                Console.Write("\r{0,5}", villageId);
                var failures = 0;    
                tryagain:
                try
                {
                    var request = $"/guest.php?screen=info_village&id={villageId}";
                    var response = world.DownloadData(request).Result;
                    var player = Convert.ToInt32(Regex.Match(Regex.Match(response, "player_id\":\"\\d+").Value, "\\d+")
                        .Value);
                    if (player == 0)
                        continue;
                    var sitter =
                        Convert.ToInt32(Regex.Match(Regex.Match(response, "sitter_id\":\"\\d+").Value, "\\d+").Value);
                    if (sitter != 0)
                        vacations.Add(new Tuple<int, int, int>(player, sitter, villageId));
                }
                catch
                {
                    Thread.Sleep(20);
                    failures++;
                    if (failures == maxFailures)
                        Console.WriteLine("UPS Something broke");
                    goto tryagain;
                }
            }
            Console.Write("\r");
            vacations.Select(
                    vacation =>
                        $"{vacation.Item3} : {world.Player[vacation.Item1].Name} -> {world.Player[vacation.Item2].Name}")
                .Concat(
                    (from vacation in vacations
                        let conflict = vacations.Where(v => vacation.Item1 == v.Item2).Select(v => v.Item1).ToList()
                        where conflict.Count != 0
                        select new List<int>(new[] {vacation.Item1, vacation.Item2}.Concat(conflict))).Select(
                        conflict =>
                            $"{world.Player[conflict[0]]} has vacation on: [{string.Join(", ", conflict.Skip(2).Select(c => world.Player[c]))}] but on his/her accounst sits {world.Player[conflict[1]]}"))
                .ToList().SaveToFile($"Vacations {world.Server}", "\n");
        }
    }
}

