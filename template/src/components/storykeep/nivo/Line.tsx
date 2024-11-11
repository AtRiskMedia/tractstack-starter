import { useState, useEffect, useRef, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { theme, oneDarkTheme } from "../../../assets/nivo";
import type { LineDataSeries } from "../../../types";

type Duration = "daily" | "weekly" | "monthly";

const Line = ({ data, duration }: { data: LineDataSeries[]; duration: Duration }) => {
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [key, setKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width !== dimensions.width || height !== dimensions.height) {
          setDimensions({ width, height });
          setKey((prevKey) => prevKey + 1);
        }
      }
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { xTickValues, xScaleMax, xAxisLegend, formatXAxisTick } = useMemo(() => {
    switch (duration) {
      case "daily":
        return {
          xTickValues: [0, 6, 12, 18, 24],
          xScaleMax: 24,
          xAxisLegend: "Hours ago",
          formatXAxisTick: (value: number) => `${value}h`,
        };
      case "weekly":
        return {
          xTickValues: [0, 1, 2, 3, 4, 5, 6, 7],
          xScaleMax: 7,
          xAxisLegend: "Days ago",
          formatXAxisTick: (value: number) => `${value}d`,
        };
      case "monthly":
        return {
          xTickValues: [0, 7, 14, 21, 28],
          xScaleMax: 28,
          xAxisLegend: "Days ago",
          formatXAxisTick: (value: number) => `${value}d`,
        };
      default:
        throw new Error(`Unsupported duration: ${duration}`);
    }
  }, [duration]);

  const maxY = Math.max(...data.flatMap((series) => series.data.map((point) => point.y)));

  const yTickValues = useMemo(() => {
    const tickCount = 5; // Number of ticks including 0 and maxY
    const step = Math.ceil(maxY / (tickCount - 1));
    return Array.from({ length: tickCount }, (_, i) => i * step);
  }, [maxY]);

  if (!isClient) return null;

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <ResponsiveLine
        key={key}
        data={data}
        theme={theme}
        colors={oneDarkTheme}
        margin={{ top: 50, right: 140, bottom: 50, left: 60 }}
        xScale={{
          type: "linear",
          min: 0,
          max: xScaleMax,
        }}
        yScale={{
          type: "linear",
          min: 0,
          max: maxY,
          stacked: false,
          reverse: false,
        }}
        yFormat=" >-.0f"
        curve="monotoneX"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: xAxisLegend,
          legendOffset: 36,
          legendPosition: "middle",
          tickValues: xTickValues,
          format: formatXAxisTick,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: "Events",
          legendOffset: -40,
          legendPosition: "middle",
          tickValues: yTickValues,
          format: (value) => Math.round(value).toString(),
        }}
        pointSize={8}
        pointColor={{ theme: "background" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: "left-to-right",
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)",
            effects: [
              {
                on: "hover",
                style: {
                  itemBackground: "rgba(0, 0, 0, .03)",
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export default Line;
