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
import { colors } from "@/constants";
import { useState, useEffect } from "react";

interface Point {
  y: number;
}

interface Series {
  id: string;
  data: Point[];
}

interface DataProps {
  data: Series[];
  duration: "daily" | "weekly" | "monthly";
}

const MOBILE_BREAKPOINT = 768;

const ResponsiveLine = ({ data, duration }: DataProps) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const isMobile = windowWidth < MOBILE_BREAKPOINT;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  interface RechartsDataPoint {
    name: number;
    [key: string]: number | undefined; // For dynamic keys like series.id
  }

  const rechartsData: RechartsDataPoint[] = data
    .map((series) => {
      return series.data.map((point, index) => ({
        name: index,
        [series.id]: point.y,
      }));
    })
    .reduce((acc, curr) => {
      curr.forEach((obj, index) => {
        if (!acc[index]) {
          acc[index] = { name: index };
        }
        acc[index] = { ...acc[index], ...obj };
      });
      return acc;
    }, [] as RechartsDataPoint[]);

  const maxY = Math.max(...data.flatMap((series) => series.data.map((point) => point.y)));

  const getLineStyle = (index: number) => {
    const patterns = [
      { strokeDasharray: "0", pattern: "Solid" },
      { strokeDasharray: "8 4", pattern: "Long dash" },
      { strokeDasharray: "2 2", pattern: "Dot" },
      { strokeDasharray: "6 2 2 2", pattern: "Dash-dot" },
      { strokeDasharray: "12 4", pattern: "Extra long dash" },
      { strokeDasharray: "4 4", pattern: "Medium dash" },
      { strokeDasharray: "8 2 2 2 2 2", pattern: "Dash-dot-dot" },
      { strokeDasharray: "16 2", pattern: "Very long dash" },
      { strokeDasharray: "2 6", pattern: "Sparse dot" },
      { strokeDasharray: "12 2 2 2", pattern: "Long dash-dot" },
      { strokeDasharray: "4 2 4", pattern: "Dash gap dash" },
      { strokeDasharray: "8 2 2 2 2", pattern: "Dash double-dot" },
    ];

    return {
      stroke: colors[index % colors.length],
      strokeDasharray: patterns[index % patterns.length].strokeDasharray,
      pattern: patterns[index % patterns.length].pattern,
    };
  };

  return (
    <div className="flex flex-col w-full h-full">
      <ResponsiveContainer width="100%" height={isMobile ? "85%" : "100%"}>
        <LineChart
          data={rechartsData}
          margin={
            isMobile
              ? { top: 5, right: 10, left: 10, bottom: 5 }
              : { top: 20, right: 20, left: 20, bottom: 20 }
          }
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#282C34",
            color: "#ABB2BF",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3E4451" />
          <XAxis
            dataKey="name"
            type="number"
            domain={[0, Math.max(...xTickValues)]}
            ticks={xTickValues}
            tickFormatter={formatXAxisTick}
            label={
              !isMobile
                ? {
                    value: xAxisLegend,
                    position: "bottom",
                    offset: 20,
                    style: { fill: "#ABB2BF" },
                  }
                : undefined
            }
            padding={{ left: 20, right: 20 }}
            stroke="#ABB2BF"
          />
          <YAxis
            domain={[0, maxY]}
            tickCount={5}
            label={
              !isMobile
                ? {
                    value: "Events",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    dy: 10,
                    style: { fill: "#ABB2BF" },
                  }
                : undefined
            }
            padding={{ top: 20, bottom: 20 }}
            stroke="#ABB2BF"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#21252B",
              border: "1px solid #3E4451",
              color: "#ABB2BF",
            }}
          />
          <Legend
            verticalAlign={isMobile ? "bottom" : "top"}
            height={isMobile ? 120 : 80}
            wrapperStyle={{
              color: "#ABB2BF",
              fontSize: isMobile ? "0.85rem" : "1rem",
              paddingTop: isMobile ? "1rem" : 0,
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
                  stroke: "#282C34",
                }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResponsiveLine;
