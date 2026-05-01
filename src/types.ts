export type Post = {
  postId: string;
  postUrl: string;
  author: {
    name: string;
    url: string;
    image?: string;
    description?: string;
  };
  timestamp: {
    relative: string;   // e.g. "6d", "2w", "3mo"
    absolute: string;   // ISO date string computed from relative
  };
  content: string;
  media?: {
    type: "image" | "video";
    url: string;
    localPath?: string;
  };
  enrichment?: {
    title: string;
    summary: string;
  };
};
