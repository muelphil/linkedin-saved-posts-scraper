"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectors = void 0;
/**
 * Centralized CSS selectors for LinkedIn saved posts (search/list view).
 * Derived from analysis of references/posts.html and references/posts-full.html.
 */
exports.selectors = {
    /** Each post result container — the data attribute holds the activity URN */
    postContainer: "[data-chameleon-result-urn]",
    /** The data attribute on the container that holds the URN */
    postUrnAttr: "data-chameleon-result-urn",
    /** Author profile image */
    authorImage: "img.presence-entity__image",
    /** Anchor linking to the author's profile */
    authorLink: ".entity-result__content-actor a[data-test-app-aware-link]",
    /** Author name text node (aria-hidden span inside the anchor) */
    authorName: ".entity-result__content-actor a[data-test-app-aware-link] span[aria-hidden='true']",
    /** Author headline / description */
    authorHeadline: ".entity-result__content-actor .linked-area div.t-14.t-black.t-normal",
    /** Timestamp paragraph — contains text like "4d •" */
    timestampParagraph: "p.t-black--light.t-12",
    /** The visible (aria-hidden) span inside the timestamp paragraph */
    timestampSpan: "p.t-black--light.t-12 span[aria-hidden='true']",
    /** Post content summary */
    content: "p.entity-result__content-summary",
    /** Anchor linking to the full post on LinkedIn */
    postLink: "a[href*='/feed/update/urn:li:activity:']",
    /** Embedded header/preview image for the post */
    mediaImage: "img.entity-result__embedded-object-image",
    /**
     * Video element in a post preview.
     * NEEDS CALIBRATION — reference HTML (posts-full.html) has no video posts.
     * Update this selector once a LinkedIn video post's HTML is available.
     */
    mediaVideo: "video source[src], video[src]",
};
//# sourceMappingURL=selectors.js.map