import { useState, useMemo } from "react";
import type { ReactNode } from "react";

// Define interfaces for Story and Analytics
interface Story {
  id: string;
  title: string;
  description: string;
  slug: string;
  changed: string;
  topics?: string[];
}

interface Analytics {
  id: string;
  total_actions: number;
}

// Fake data for stories
const fakeStories: Story[] = Array.from({ length: 12 }, (_, i) => ({
  id: `story-${i + 1}`,
  title: `Sample Story ${i + 1}`,
  description: `Description for sample story ${i + 1}.`,
  slug: `sample-story-${i + 1}`,
  changed: new Date(2023, 0, i + 1).toISOString(),
  topics: i % 2 === 0 ? ["topic1", "topic2"] : ["topic3"],
}));

// Fake analytics data for sorting by popularity
const fakeAnalytics: Analytics[] = fakeStories.map((story) => ({
  id: story.id,
  total_actions: Math.floor(Math.random() * 100),
}));

// Utility function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

// StoryItem component for reusable story rendering
const StoryItem = ({
  story,
  showTopics = false,
}: {
  story: Story;
  showTopics?: boolean;
}): ReactNode => (
  <div className="flex items-start space-x-4 p-2 rounded-md">
    {/* Placeholder for story image */}
    <div
      style={{ width: "100px", height: "100px", backgroundColor: "#d0d0d0" }}
      className="rounded-md"
    />
    <div className="flex-1">
      <h3 className="text-lg font-bold text-black">{story.title}</h3>
      {story.description && (
        <p className="text-myblack text-sm line-clamp-2">{story.description}</p>
      )}
      {showTopics && story.topics && story.topics.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {story.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
      <p className="text-mydarkgrey text-xs mt-1">{formatDate(story.changed)}</p>
    </div>
  </div>
);

// Component definition
const ListContentPreview = ({ bgColour = "#ffffff" }: { bgColour: string }): ReactNode => {
  const [currentMode, setCurrentMode] = useState<"recent" | "popular">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sort stories based on mode
  const sortedStories = useMemo(() => {
    if (currentMode === "recent") {
      return [...fakeStories].sort(
        (a, b) => new Date(b.changed).getTime() - new Date(a.changed).getTime()
      );
    } else {
      return [...fakeStories].sort((a, b) => {
        const aViews = fakeAnalytics.find((anal) => anal.id === a.id)?.total_actions || 0;
        const bViews = fakeAnalytics.find((anal) => anal.id === b.id)?.total_actions || 0;
        if (bViews === aViews) {
          return new Date(b.changed).getTime() - new Date(a.changed).getTime();
        }
        return bViews - aViews;
      });
    }
  }, [currentMode]);

  // Pagination logic
  const totalPages = Math.ceil(sortedStories.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const displayedStories = sortedStories.slice(startIdx, endIdx);

  const leftColumn = displayedStories.slice(0, Math.ceil(displayedStories.length / 2));
  const rightColumn = displayedStories.slice(Math.ceil(displayedStories.length / 2));
  return (
    <div className="py-12 p-4 mx-auto max-w-7xl" style={{ backgroundColor: bgColour }}>
      {/* Toggle Buttons */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            className={`px-4 py-2 text-sm font-bold ${
              currentMode === "recent"
                ? "bg-myblue text-white"
                : "bg-white text-myblack hover:bg-gray-100"
            } border border-myblue rounded-l-md transition-colors`}
            onClick={() => {
              setCurrentMode("recent");
              setCurrentPage(1);
            }}
          >
            Newest
          </button>
          <button
            className={`px-4 py-2 text-sm font-bold ${
              currentMode === "popular"
                ? "bg-myblue text-white"
                : "bg-white text-myblack hover:bg-gray-100"
            } border border-myblue rounded-r-md transition-colors`}
            onClick={() => {
              setCurrentMode("popular");
              setCurrentPage(1);
            }}
          >
            Most Active
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="block md:hidden space-y-6 p-4">
        {displayedStories.map((story) => (
          <StoryItem key={story.id} story={story} showTopics={true} />
        ))}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex md:space-x-6 p-4">
        <div className="md:w-1/2 space-y-6">
          {leftColumn.map((story) => (
            <StoryItem key={story.id} story={story} showTopics={true} />
          ))}
        </div>
        <div className="md:w-1/2 space-y-6">
          {rightColumn.map((story) => (
            <StoryItem key={story.id} story={story} showTopics={true} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {sortedStories.length > pageSize && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
            <button
              className="px-4 py-2 text-sm font-bold text-myblack bg-white border border-gray-300 rounded-l-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </button>
            <button
              className="px-4 py-2 text-sm font-bold text-white bg-myblue border border-myblue rounded-r-md hover:bg-myblue-dark disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default ListContentPreview;
