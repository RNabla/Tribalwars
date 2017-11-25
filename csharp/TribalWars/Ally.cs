using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TribalWars
{
    public struct Ally : IComparable
    {
        public bool Equals(Ally other)
        {
            return Id == other.Id;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj)) return false;
            return obj is Ally ally && Equals(ally);
        }

        public override int GetHashCode()
        {
            return Id;
        }

        public readonly int Id;
        public string Name;
        public string Tag;
        public int PlayersCount;
        public int VillagesCount;
        public int Top40Points;
        public int Points;
        public int Ranking;

        public Ally(string rawLine)
        {
            var raw = rawLine.Split(',');
            Id = Convert.ToInt32(raw[0]);
            Name = Uri.UnescapeDataString(raw[1].Replace('+', ' '));
            Tag = Uri.UnescapeDataString(raw[2].Replace('+', ' '));
            PlayersCount = Convert.ToInt32(raw[3]);
            VillagesCount = Convert.ToInt32(raw[4]);
            Top40Points = Convert.ToInt32(raw[5]);
            Points = Convert.ToInt32(raw[6]);
            Ranking = Convert.ToInt32(raw[7]);
        }

        public override string ToString()
        {
            return Name;
        }

        public int CompareTo(object obj)
        {
            return Id.CompareTo(((Ally)obj).Id);
        }

        public string ToShortString()
        {
            return Tag;
        }
        public static bool operator ==(Ally a1, Ally a2)
        {
            return a1.Id == a2.Id;
        }
        public static bool operator !=(Ally a1, Ally a2)
        {
            return !(a1 == a2);
        }
    }
}
