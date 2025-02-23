import { contentMap } from "@/store/events";
import { storyfragmentAnalyticsStore } from "@/store/storykeep";

const FeaturedContentSetup = ({ params }: { params: Record<string, string> }) => {
  const fullContentMap = contentMap.get();
  console.log(params, fullContentMap);
  console.log(storyfragmentAnalyticsStore.get());
  return (
    <div className="w-full p-6 my-4bg-gray-50">
      <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-6 bg-slate-50">
        <h3 className="text-lg text-gray-700">FeaturedContentSetup in the making</h3>
      </div>
      {params && (
        <div className="space-y-2">
          {Object.entries(params).map(
            ([key, value]) =>
              value && (
                <div key={key} className="flex items-start">
                  <span className="font-bold text-gray-600 min-w-24">{key}:</span>
                  <span className="text-gray-800 ml-2">{value}</span>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
};

export default FeaturedContentSetup;
