import packageMetadata from "../package.json" with { type: "json" };

export const CLI_NAME = "bbg";
export const MIN_NODE_MAJOR = 18;
export const CLI_VERSION = packageMetadata.version;
