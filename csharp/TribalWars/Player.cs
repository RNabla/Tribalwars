using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TribalWars
{
    public struct Player : IComparable
    {
        public bool Equals(Player other)
        {
            return Id == other.Id;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj)) return false;
            return obj is Player player && Equals(player);
        }

        public override int GetHashCode()
        {
            return Id;
        }

        public readonly int Id;
        public int AllyId;
        public int Villages;
        public int Points;
        public int Ranking;
        public string Name;

        public Player(string rawLine)
        {
            var raw = rawLine.Split(',');
            Id = Convert.ToInt32(raw[0]);
            Name = Uri.UnescapeDataString(raw[1]).Replace('+', ' ');
            AllyId = Convert.ToInt32(raw[2]);
            Villages = Convert.ToInt32(raw[3]);
            Points = Convert.ToInt32(raw[4]);
            Ranking = Convert.ToInt32(raw[5]);
        }
        public override string ToString()
        {
            return Name;
        }

        public int CompareTo(object obj)
        {
            return Id.CompareTo(((Player)obj).Id);
        }

        public static bool operator ==(Player p1, Player p2)
        {
            return p1.Id == p2.Id;
        }

        public static bool operator !=(Player p1, Player p2)
        {
            return !(p1 == p2);
        }
    }
}
