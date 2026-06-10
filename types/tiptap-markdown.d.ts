declare module "tiptap-markdown" {
  import type { Extension } from "@tiptap/core";

  export interface MarkdownOptions {
    html?: boolean;
    tightLists?: boolean;
    tightListClass?: string;
    bulletListMarker?: string;
    linkify?: boolean;
    breaks?: boolean;
    transformPastedText?: boolean;
    transformCopiedText?: boolean;
  }

  export const Markdown: Extension<MarkdownOptions, unknown>;
}
