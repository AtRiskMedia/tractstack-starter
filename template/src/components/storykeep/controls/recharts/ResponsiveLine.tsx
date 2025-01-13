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

  // Function to determine line style based on series index
  // Combines OneDark-inspired colors with distinct patterns for accessibility
  const getLineStyle = (index: number) => {
    // OneDark-inspired color palette with vibrant, pleasing colors
    const colors = [
      "#61AFEF", // Bright blue
      "#98C379", // Green
      "#C678DD", // Purple
      "#E06C75", // Soft red
      "#56B6C2", // Cyan
      "#D19A66", // Orange
      "#BE5046", // Deep red
      "#98C379", // Light green
      "#E5C07B", // Yellow
      "#528BFF", // Royal blue
      "#FF6B6B", // Coral
      "#4EC9B0", // Seafoam
    ];

    const patterns = [
      { strokeDasharray: "0", pattern: "Solid" }, // ________
      { strokeDasharray: "8 4", pattern: "Long dash" }, // __ __ __
      { strokeDasharray: "2 2", pattern: "Dot" }, // . . . .
      { strokeDasharray: "6 2 2 2", pattern: "Dash-dot" }, // _._._._
      { strokeDasharray: "12 4", pattern: "Extra long dash" }, // ___ ___
      { strokeDasharray: "4 4", pattern: "Medium dash" }, // _ _ _ _
      { strokeDasharray: "8 2 2 2 2 2", pattern: "Dash-dot-dot" }, // _.._..
      { strokeDasharray: "16 2", pattern: "Very long dash" }, // ____ ____
      { strokeDasharray: "2 6", pattern: "Sparse dot" }, // .   .   .
      { strokeDasharray: "12 2 2 2", pattern: "Long dash-dot" }, // ___.___.
      { strokeDasharray: "4 2 4", pattern: "Dash gap dash" }, // _  _  _
      { strokeDasharray: "8 2 2 2 2", pattern: "Dash double-dot" }, // __..__.
    ];

    return {
      stroke: colors[index % colors.length],
      strokeDasharray: patterns[index % patterns.length].strokeDasharray,
      pattern: patterns[index % patterns.length].pattern,
    };
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={rechartsData}
        style={{
          backgroundColor: "#282C34", // OneDark background
          color: "#ABB2BF", // OneDark text color
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#3E4451" // OneDark grid lines
        />
        <XAxis
          dataKey="name"
          type="number"
          domain={[0, Math.max(...xTickValues)]}
          ticks={xTickValues}
          tickFormatter={formatXAxisTick}
          label={{
            value: xAxisLegend,
            position: "bottom",
            offset: 20,
            style: { fill: "#ABB2BF" }, // OneDark text color
          }}
          padding={{ left: 20, right: 20 }}
          stroke="#ABB2BF" // OneDark axis color
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
            style: { fill: "#ABB2BF" }, // OneDark text color
          }}
          padding={{ top: 20, bottom: 20 }}
          stroke="#ABB2BF" // OneDark axis color
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#21252B", // OneDark tooltip background
            border: "1px solid #3E4451", // OneDark border
            color: "#ABB2BF", // OneDark text
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          wrapperStyle={{
            color: "#ABB2BF", // OneDark text color
          }}
        />
        {data.map((series, index) => {
          const lineStyle = getLineStyle(index);
          return (
            <Line
              key={series.id}
              type="monotone"
              dataKey={series.id}
              name={`${series.id} (${lineStyle.pattern})`}
              stroke={lineStyle.stroke}
              strokeDasharray={lineStyle.strokeDasharray}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 8,
                strokeWidth: 2,
                fill: lineStyle.stroke,
                stroke: "#282C34", // OneDark background for contrast
              }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ResponsiveLine;
