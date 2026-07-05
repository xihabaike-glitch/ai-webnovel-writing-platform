import { platformProfiles, type PlatformId } from "../platforms/platformProfiles.ts";
import type {
  ProjectStartExperienceHandoff,
  ProjectStartExperienceHandoffStatus,
} from "./projectStartTactics.ts";
import { projectTemplates, type ProjectTemplate } from "./projectTemplates.ts";

const handoffStatuses = new Set<ProjectStartExperienceHandoffStatus>([
  "reuse",
  "small_sample",
  "blocked",
  "template",
]);

const platformIds = new Set<PlatformId>(platformProfiles.map((platform) => platform.id));
const templateIds = new Set<ProjectTemplate["id"]>(projectTemplates.map((template) => template.id));

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = stringValue(value);
  return text || null;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function platformIdValue(value: unknown) {
  const text = stringValue(value);
  return platformIds.has(text as PlatformId) ? text as PlatformId : null;
}

function templateIdValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = stringValue(value);
  return templateIds.has(text as ProjectTemplate["id"]) ? text as ProjectTemplate["id"] : null;
}

function statusValue(value: unknown) {
  const text = stringValue(value);
  return handoffStatuses.has(text as ProjectStartExperienceHandoffStatus)
    ? text as ProjectStartExperienceHandoffStatus
    : null;
}

export function parseProjectStartExperienceHandoffDispatchRequest(value: unknown): ProjectStartExperienceHandoff | null {
  if (!value || typeof value !== "object") return null;
  const body = value as { handoff?: unknown };
  if (!body.handoff || typeof body.handoff !== "object") return null;
  const handoff = body.handoff as Record<string, unknown>;
  const status = statusValue(handoff.status);
  const selectedPlatformId = platformIdValue(handoff.selectedPlatformId);
  const recommendedPlatformId = handoff.recommendedPlatformId === null || handoff.recommendedPlatformId === undefined
    ? null
    : platformIdValue(handoff.recommendedPlatformId);
  const recommendedTemplateId = templateIdValue(handoff.recommendedTemplateId);
  const firstDayActions = stringList(handoff.firstDayActions);
  const avoidRules = stringList(handoff.avoidRules);
  const evidence = stringList(handoff.evidence);
  const label = stringValue(handoff.label);
  const title = stringValue(handoff.title);
  const detail = stringValue(handoff.detail);
  const selectedPlatformName = stringValue(handoff.selectedPlatformName);

  if (!status || !selectedPlatformId || !label || !title || !detail || !selectedPlatformName) return null;
  if (firstDayActions.length === 0 || avoidRules.length === 0) return null;
  if (handoff.recommendedPlatformId && !recommendedPlatformId) return null;
  if (handoff.recommendedTemplateId && !recommendedTemplateId) return null;

  return {
    status,
    label,
    title,
    detail,
    selectedPlatformId,
    selectedPlatformName,
    recommendedPlatformId,
    recommendedPlatformName: nullableStringValue(handoff.recommendedPlatformName),
    recommendedTemplateId,
    shouldSwitchTemplate: handoff.shouldSwitchTemplate === true,
    firstDayActions,
    avoidRules,
    evidence,
  };
}
