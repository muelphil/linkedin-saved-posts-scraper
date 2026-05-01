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
        relative: string;
        absolute: string;
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
