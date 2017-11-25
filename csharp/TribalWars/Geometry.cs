using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TribalWars
{
    public static class Geometry
    {
        public static double Distance(Point p1, Point p2)
        {
            var dx = p1.X - p2.X;
            var dy = p1.Y - p2.Y;
            return Math.Sqrt(dx * dx + dy * dy);
        }

        public static bool OnRectangle(Point p1, Point p2, Point p)
        {
            return Math.Min(p1.X, p2.X) <= p.X && p.X <= Math.Max(p1.X, p2.X) && Math.Min(p1.Y, p2.Y) <= p.Y &&
                   p.Y <= Math.Max(p1.Y, p2.Y);
        }

        public static bool IsInsidePolygon(List<Point> polygon, Point point)
        {
            if (polygon == null) return true;
            var segment = new Segment(point, new Point(-1, -1));
            var segments = polygon.Zip(new[] { polygon[polygon.Count - 1] }.Concat(polygon.Take(polygon.Count - 1)),
                (p1, p2) => new Segment(p1, p2));
            // 1 point.X point.Y
            // 1 s.P1.X  s.P1.Y
            // 1 s.P2.X  s.P2.Y
            if (segments.Any(s =>
                point.X * (s.P1.Y - s.P2.Y) + s.P1.X * (s.P2.Y - point.Y) + s.P2.X * (point.Y - s.P1.Y) == 0 &&
                OnRectangle(s.P1, s.P2, point)))
                return true;
            return segments.Count(s => AreIntersected(s, segment)) % 2 == 1;
        }

        public static int CrossProduct(Point p1, Point p2)
        {
            return p1.X * p2.Y - p1.Y * p2.X;
        }

        public static bool AreIntersected(Segment s1, Segment s2)
        {
            return AreIntersected(s1.P1, s1.P2, s2.P1, s2.P2);
        }

        public static bool AreIntersected(Point p1, Point p2, Point p3, Point p4)
        {
            var d1 = CrossProduct(p4 - p3, p1 - p3);
            var d2 = CrossProduct(p4 - p3, p2 - p3);
            var d3 = CrossProduct(p2 - p1, p3 - p1);
            var d4 = CrossProduct(p2 - p1, p4 - p1);
            var d12 = d1 * d2;
            var d34 = d3 * d4;
            if (d12 > 0 || d34 > 0) return false;
            if (d12 < 0 || d34 < 0) return true;
            return OnRectangle(p1, p3, p4) || OnRectangle(p2, p3, p4) || OnRectangle(p3, p1, p2) ||
                   OnRectangle(p4, p1, p2);
        }
    }

    public class Segment
    {
        public Point P1;
        public Point P2;

        public Segment(Tuple<int, int> p1, Tuple<int, int> p2)
        {
            this.P1 = new Point(p1);
            this.P2 = new Point(p2);
        }
        public Segment(Point p1, Point p2)
        {
            P1 = p1;
            P2 = p2;
        }

    }

    public struct Point
    {
        public int X;
        public int Y;

        public Point(Tuple<int, int> tuple)
        {
            X = tuple.Item1;
            Y = tuple.Item2;
        }

        public Point(int x, int y)
        {
            X = x;
            Y = y;
        }

        public static Point operator +(Point p1, Point p2) => new Point(p1.X + p2.X, p1.Y + p2.Y);
        public static Point operator -(Point p1, Point p2) => new Point(p1.X - p2.X, p1.Y - p2.Y);
        public static bool operator ==(Point p1, Point p2) => p1.X == p2.X && p1.Y == p2.Y;
        public static bool operator !=(Point p1, Point p2) => !(p1 == p2);

        public override string ToString() => $"{X}|{Y}";

        public bool Equals(Point other)
        {
            return X == other.X && Y == other.Y;
        }

        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj)) return false;
            return obj is Point && Equals((Point)obj);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                return (X * 397) ^ Y;
            }
        }
    }
}
