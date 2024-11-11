import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

export const YouTubeWrapper = ({ embedCode, title }: { embedCode: string; title: string }) => {
  return <LiteYouTubeEmbed id={embedCode} title={title} />;
};
