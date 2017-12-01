using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TribalWars
{
    public struct Village : IComparable
    {
        public bool Equals(Village other)
        {
            return Id == other.Id;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj)) return false;
            return obj is Village && Equals((Village)obj);
        }

        public override int GetHashCode()
        {
            return Id;
        }

        public Point Coords;
        public readonly int Id;
        public string Name;
        public int PlayerId;
        public int Points;
        public enum Modifier
        {
            Normal = 0,
            Wood = 1,
            Stone = 2,
            Iron = 3,
            Farm = 4,
            Barracks = 5,
            Stable = 6,
            Workshop = 7,
            Eko = 8,
            Market = 9
        }
        public Modifier Bonus;

        public Village(string rawLine)
        {
            var raw = rawLine.Split(',');
            Id = Convert.ToInt32(raw[0]);
            Name = Uri.UnescapeDataString(raw[1].Replace('+', ' '));
            Coords = new Point(Convert.ToInt32(raw[2]), Convert.ToInt32(raw[3]));
            PlayerId = Convert.ToInt32(raw[4]);
            Points = Convert.ToInt32(raw[5]);
            Bonus = (Modifier)Convert.ToInt32(raw[6]);
        }

        public double Distance(Village village)
        {
            return Geometry.Distance(Coords, village.Coords);
        }

        public override string ToString()
        {
            return Coords.ToString();
        }

        public int CompareTo(object obj)
        {
            return Id.CompareTo(((Village)obj).Id);
        }

        public static bool operator ==(Village v1, Village v2)
        {
            return v1.Id == v2.Id;
        }
        public static bool operator !=(Village v1, Village v2)
        {
            return !(v1 == v2);
        }
    }
}
