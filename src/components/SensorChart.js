// src/components/SensorChart.js
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SensorChart = ({ data, lines }) => {
  // Convert ts string into a short time label
  const chartData = (data || []).map((d) => ({
    ...d,
    timeLabel: d.ts ? new Date(d.ts).toLocaleTimeString() : "",
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timeLabel" fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip />
          <Legend />

          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              dot={false}
              strokeWidth={2}
              // Recharts needs a stroke color; we just pick from a small list
              stroke={line.stroke || undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;
