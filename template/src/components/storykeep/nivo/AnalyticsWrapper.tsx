import { useStore } from "@nanostores/react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import { analyticsDuration, showAnalytics } from "../../../store/storykeep";
import { classNames } from "../../../utils/common/helpers";
import type { ProcessedAnalytics } from "../../../types";

const AnalyticsWrapper = (props: { title: string; isPane: boolean; data: ProcessedAnalytics }) => {
  const { title, data, isPane } = props;
  console.log(title, data, isPane);
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  const updateDuration = (newValue: `daily` | `weekly` | `monthly`) => {
    analyticsDuration.set(newValue);
  };
  const toggleAnalytics = () => {
    showAnalytics.set(false);
  };

  return (
    <div
      className="bg-myblack/90 px-3.5 py-1.5 flex flex-wrap items-start"
      style={{
        backgroundImage:
          "repeating-linear-gradient( 45deg, transparent, transparent 10px, rgba(0,0,0, 0.1) 10px, rgba(0,0,0, 0.1) 20px )",
      }}
    >
      <div className="rounded-xl w-64 flex-shrink-0 text-pretty bg-mywhite h-fit mr-4 mb-4 shadow">
        <div className="p-3.5 text-xl space-y-4">
          <p>
            {isPane && <ArrowUpIcon className="h-5 w-5 inline" />} {title}
          </p>
          <div className="flex flex-wrap gap-x-2 text-md">
            <span className="font-action">Stats for past:</span>
            {["daily", "weekly", "monthly"].map((period) => (
              <button
                key={period}
                onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
                className={classNames(
                  duration === period ? "font-bold" : "underline",
                  "text-mydarkgrey/80 hover:text-myorange"
                )}
              >
                {period === `daily` ? `24 hours` : period === `weekly` ? `7 days` : `4 weeks`}
              </button>
            ))}
            <button
              onClick={() => toggleAnalytics()}
              className="underline
                  text-mydarkgrey/80 hover:text-myorange"
            >
              hide
            </button>
          </div>
        </div>
      </div>
      {data?.pie?.length > 0 && (
        <div
          className="rounded-xl bg-mywhite shadow-inner flex-shrink-0 mr-4 mb-4"
          style={{ width: "400px", height: "200px" }}
        >
          Pie
        </div>
      )}
      {data?.line?.length > 0 && (
        <div
          className="rounded-xl bg-mywhite shadow-inner flex-grow mb-4"
          style={{ minWidth: "400px", height: "256px" }}
        >
          Line
        </div>
      )}
    </div>
  );
};

export default AnalyticsWrapper;
