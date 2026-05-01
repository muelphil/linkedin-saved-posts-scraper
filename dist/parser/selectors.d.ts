/**
 * Centralized CSS selectors for LinkedIn saved posts (search/list view).
 * Derived from analysis of references/posts.html and references/posts-full.html.
 */
export declare const selectors: {
    /** Each post result container — the data attribute holds the activity URN */
    readonly postContainer: "[data-chameleon-result-urn]";
    /** The data attribute on the container that holds the URN */
    readonly postUrnAttr: "data-chameleon-result-urn";
    /** Author profile image */
    readonly authorImage: "img.presence-entity__image";
    /** Anchor linking to the author's profile */
    readonly authorLink: ".entity-result__content-actor a[data-test-app-aware-link]";
    /** Author name text node (aria-hidden span inside the anchor) */
    readonly authorName: ".entity-result__content-actor a[data-test-app-aware-link] span[aria-hidden='true']";
    /** Author headline / description */
    readonly authorHeadline: ".entity-result__content-actor .linked-area div.t-14.t-black.t-normal";
    /** Timestamp paragraph — contains text like "4d •" */
    readonly timestampParagraph: "p.t-black--light.t-12";
    /** The visible (aria-hidden) span inside the timestamp paragraph */
    readonly timestampSpan: "p.t-black--light.t-12 span[aria-hidden='true']";
    /** Post content summary */
    readonly content: "p.entity-result__content-summary";
    /** Anchor linking to the full post on LinkedIn */
    readonly postLink: "a[href*='/feed/update/urn:li:activity:']";
    /** Embedded header/preview image for the post */
    readonly mediaImage: "img.entity-result__embedded-object-image";
    /**
     * Video element in a post preview.
     * NEEDS CALIBRATION — reference HTML (posts-full.html) has no video posts.
     * Update this selector once a LinkedIn video post's HTML is available.
     */
    readonly mediaVideo: "video source[src], video[src]";
};
