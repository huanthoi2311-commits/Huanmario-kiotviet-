import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function formatMillions(value) {
  return `${(value / 1_000_000).toLocaleString("vi-VN")} tr`;
}

export default function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e3e8ef" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7686" }} axisLine={{ stroke: "#e3e8ef" }} />
        <YAxis tickFormatter={formatMillions} tick={{ fontSize: 12, fill: "#6b7686" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => value.toLocaleString("vi-VN") + "đ"} labelStyle={{ color: "#1c2733" }} />
        <Bar dataKey="revenue" fill="#1967d2" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
