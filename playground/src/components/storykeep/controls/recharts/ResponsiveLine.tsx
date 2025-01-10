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
import type { LineDataSeries } from "@/types.ts";

type Duration = "daily" | "weekly" | "monthly";

interface LineProps {
  data: LineDataSeries[];
  duration: Duration;
}

interface DataPoint {
  name: number;
  [key: string]: number;
}

const ResponsiveLine = ({ data, duration }: LineProps) => {
  const { xTickValues, xAxisLegend, formatXAxisTick } = (() => {
    switch (duration) {
      case "daily":
        return {
          xTickValues: [0, 6, 12, 18, 24],
          xAxisLegend: "Hours ago",
          formatXAxisTick: (value: number) => `${value}h`,
        };
      case "weekly":
        return {
          xTickValues: [0, 1, 2, 3, 4, 5, 6, 7],
          xAxisLegend: "Days ago",
          formatXAxisTick: (value: number) => `${value}d`,
        };
      case "monthly":
        return {
          xTickValues: [0, 7, 14, 21, 28],
          xAxisLegend: "Days ago",
          formatXAxisTick: (value: number) => `${value}d`,
        };
      default:
        throw new Error(`Unsupported duration: ${duration}`);
    }
  })();

  // Convert data format for Recharts with proper typing
  const rechartsData: DataPoint[] = data
    .map((series) => {
      return series.data.map((point, index) => ({
        name: index,
        [series.id]: point.y,
      }));
    })
    .reduce((acc: DataPoint[], curr) => {
      curr.forEach((obj, index) => {
        if (!acc[index]) {
          acc[index] = { name: index };
        }
        acc[index] = { ...acc[index], ...obj };
      });
      return acc;
    }, []);

  const maxY = Math.max(...data.flatMap((series) => series.data.map((point) => point.y)));

  // Function to determine line style based on series index with high contrast colors
  const getLineStyle = (index: number) => {
    const styles = [
      { stroke: "#0000FF", strokeDasharray: "0" }, // Blue - solid
      { stroke: "#FF0000", strokeDasharray: "5 5" }, // Red - dashed
      { stroke: "#008000", strokeDasharray: "2 2" }, // Green - dotted
      { stroke: "#FF00FF", strokeDasharray: "5 2 2 2" }, // Magenta - dash-dot
      { stroke: "#FFA500", strokeDasharray: "0" }, // Orange - solid (for more series)
    ];
    return styles[index % styles.length]; // Cycle through styles if there are more series than styles
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rechartsData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          type="number"
          domain={[0, Math.max(...xTickValues)]}
          ticks={xTickValues}
          tickFormatter={formatXAxisTick}
          label={{ value: xAxisLegend, position: "bottom", offset: 20 }}
          padding={{ left: 20, right: 20 }}
        />
        <YAxis
          domain={[0, maxY]}
          tickCount={5}
          label={{
            value: "Events",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            dy: 10,
          }}
          padding={{ top: 20, bottom: 20 }}
        />
        <Tooltip />
        <Legend verticalAlign="top" height={36} />
        {data.map((series, index) => {
          const lineStyle = getLineStyle(index);
          return (
            <Line
              key={series.id}
              type="monotone"
              dataKey={series.id}
              stroke={lineStyle.stroke}
              strokeDasharray={lineStyle.strokeDasharray}
              dot={false}
              activeDot={{ r: 8 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ResponsiveLine;
