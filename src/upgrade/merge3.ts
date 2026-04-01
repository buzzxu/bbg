import { merge } from "node-diff3";

export interface MergeLabels {
  ours?: string;
  theirs?: string;
}

export interface MergeResult {
  /** The merged content as a string */
  merged: string;
  /** Whether the merge produced any conflicts */
  hasConflicts: boolean;
  /** Number of conflict regions (0 if no conflicts) */
  conflictCount: number;
}

/**
 * Options for the node-diff3 `merge` function.
 * The published types omit the `label` field that the implementation supports,
 * so we define the full shape here.
 */
interface MergeOptions {
  excludeFalseConflicts?: boolean;
  label?: {
    a?: string;
    b?: string;
  };
}

/**
 * Performs a three-way merge between a base version and two changed versions.
 *
 * @param base   - The common ancestor (old generated snapshot)
 * @param ours   - The user's current version
 * @param theirs - The new template-rendered version
 * @param labels - Optional labels for conflict markers
 * @returns MergeResult with merged content and conflict info
 */
export function threeWayMerge(
  base: string,
  ours: string,
  theirs: string,
  labels?: MergeLabels,
): MergeResult {
  const baseLines = base.split(/\r?\n/);
  const oursLines = ours.split(/\r?\n/);
  const theirsLines = theirs.split(/\r?\n/);

  const options: MergeOptions = {
    label: {
      a: labels?.ours ?? "user",
      b: labels?.theirs ?? "template",
    },
    excludeFalseConflicts: true,
  };

  const result = merge(oursLines, baseLines, theirsLines, options as Parameters<typeof merge>[3]);

  const merged = result.result.join("\n");
  const conflictCount = result.conflict
    ? result.result.filter((line) => line.startsWith("<<<<<<<")).length
    : 0;

  return {
    merged,
    hasConflicts: result.conflict ?? false,
    conflictCount,
  };
}
