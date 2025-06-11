/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from "react";
import { ulid } from "ulid";
import type { ResourceNode, ResourceSetting } from "@/types";

interface ResourceBulkIngestProps {
  category: string;
  resourceSetting: ResourceSetting | undefined;
  onSave: (resources: ResourceNode[]) => Promise<void>;
  onCancel: () => void;
}

interface ParsedResource {
  title: string;
  slug: string;
  oneliner: string;
  category?: string;
  [key: string]: any;
}

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

export default function ResourceBulkIngest({
  category,
  resourceSetting,
  onSave,
  onCancel,
}: ResourceBulkIngestProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const parseResults = useMemo(() => {
    if (!jsonInput.trim()) {
      return {
        status: "no data found" as const,
        nodes: [],
        errors: [],
        validNodes: [],
      };
    }

    try {
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        return {
          status: "invalid data found" as const,
          nodes: [],
          errors: [{ index: -1, field: "root", message: "Input must be an array of objects" }],
          validNodes: [],
        };
      }

      const nodes: ParsedResource[] = parsed;
      const errors: ValidationError[] = [];
      const validNodes: ResourceNode[] = [];

      // Check for duplicate slugs within the batch
      const slugs = new Set<string>();

      nodes.forEach((node, index) => {
        // Validate required fields
        if (!node.title || typeof node.title !== "string") {
          errors.push({ index, field: "title", message: "Title is required and must be a string" });
        }

        if (!node.slug || typeof node.slug !== "string") {
          errors.push({ index, field: "slug", message: "Slug is required and must be a string" });
        } else {
          if (!/^[a-z0-9-]+$/.test(node.slug)) {
            errors.push({
              index,
              field: "slug",
              message: "Slug must be lowercase alphanumeric characters and hyphens only",
            });
          }
          if (slugs.has(node.slug)) {
            errors.push({ index, field: "slug", message: "Duplicate slug found in batch" });
          }
          slugs.add(node.slug);
        }

        // Oneliner is optional but validate if present
        if (node.oneliner !== undefined && typeof node.oneliner !== "string") {
          errors.push({ index, field: "oneliner", message: "Oneliner must be a string" });
        }

        // Extract optionsPayload fields
        const { title, slug, oneliner, category: nodeCategory, ...optionsPayload } = node;

        // Validate optionsPayload against resourceSetting if available
        if (resourceSetting) {
          Object.entries(resourceSetting).forEach(([fieldName, fieldDef]) => {
            const value = optionsPayload[fieldName];

            // Check required fields
            if (!fieldDef.optional && (value === undefined || value === null || value === "")) {
              errors.push({ index, field: fieldName, message: `${fieldName} is required` });
              return;
            }

            // Skip validation if field is not present and optional
            if (value === undefined || value === null) return;

            // Validate by type
            switch (fieldDef.type) {
              case "multi":
                if (!Array.isArray(value)) {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be an array of strings`,
                  });
                } else {
                  if (!fieldDef.optional && value.length === 0) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must have at least one value`,
                    });
                  }
                  value.forEach((str: any, i: number) => {
                    if (typeof str !== "string") {
                      errors.push({
                        index,
                        field: fieldName,
                        message: `${fieldName}[${i}] must be a string`,
                      });
                    } else if (fieldDef.maxTextLength && str.length > fieldDef.maxTextLength) {
                      errors.push({
                        index,
                        field: fieldName,
                        message: `${fieldName}[${i}] exceeds max length of ${fieldDef.maxTextLength}`,
                      });
                    }
                  });
                  optionsPayload[fieldName] = value.filter((str: string) => str !== "");
                }
                break;
              case "string":
                if (typeof value !== "string") {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a string`,
                  });
                } else {
                  if (fieldDef.maxTextLength && value.length > fieldDef.maxTextLength) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} exceeds max length of ${fieldDef.maxTextLength}`,
                    });
                  }
                  if (fieldDef.isUrl && value) {
                    try {
                      new URL(value);
                    } catch {
                      errors.push({
                        index,
                        field: fieldName,
                        message: `${fieldName} must be a valid URL`,
                      });
                    }
                  }
                }
                break;
              case "number":
                if (typeof value !== "number") {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a number`,
                  });
                } else {
                  if (fieldDef.minNumber !== undefined && value < fieldDef.minNumber) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be at least ${fieldDef.minNumber}`,
                    });
                  }
                  if (fieldDef.maxNumber !== undefined && value > fieldDef.maxNumber) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be at most ${fieldDef.maxNumber}`,
                    });
                  }
                }
                break;
              case "boolean":
                if (typeof value !== "boolean") {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a boolean`,
                  });
                }
                break;
              case "date":
                // Accept either number (timestamp) or ISO string
                if (typeof value === "string") {
                  const date = new Date(value);
                  if (isNaN(date.getTime())) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be a valid date`,
                    });
                  }
                } else if (typeof value === "number") {
                  const date = new Date(value * 1000);
                  if (isNaN(date.getTime())) {
                    errors.push({
                      index,
                      field: fieldName,
                      message: `${fieldName} must be a valid timestamp`,
                    });
                  }
                } else {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a date string or timestamp`,
                  });
                }
                break;
              case "image":
                if (typeof value !== "string") {
                  errors.push({
                    index,
                    field: fieldName,
                    message: `${fieldName} must be a string (file ID)`,
                  });
                }
                break;
            }
          });

          // Check for unknown fields
          Object.keys(optionsPayload).forEach((key) => {
            if (!(key in resourceSetting)) {
              errors.push({ index, field: key, message: `Unknown field: ${key}` });
            }
          });
        }

        // If no errors for this node, create a valid ResourceNode
        const nodeErrors = errors.filter((e) => e.index === index);
        if (nodeErrors.length === 0) {
          // Process dates to timestamps if needed
          const processedOptionsPayload = { ...optionsPayload };
          if (resourceSetting) {
            Object.entries(processedOptionsPayload).forEach(([key, value]) => {
              if (resourceSetting[key]?.type === "date" && typeof value === "string") {
                processedOptionsPayload[key] = Math.floor(new Date(value).getTime() / 1000);
              }
            });
          }

          validNodes.push({
            id: ulid(),
            parentId: null,
            nodeType: "Resource",
            title: title.trim(),
            slug: node.slug,
            oneliner: oneliner?.trim() || "",
            optionsPayload: processedOptionsPayload,
            category: nodeCategory || category,
          });
        }
      });

      return {
        status: errors.length > 0 ? ("invalid data found" as const) : ("valid" as const),
        nodes,
        errors,
        validNodes,
      };
    } catch (error) {
      return {
        status: "invalid data found" as const,
        nodes: [],
        errors: [{ index: -1, field: "json", message: "Invalid JSON format" }],
        validNodes: [],
      };
    }
  }, [jsonInput, category, resourceSetting]);

  const handleSave = useCallback(async () => {
    if (parseResults.validNodes.length === 0 || isSaving) return;

    setIsSaving(true);
    setSaveProgress({ current: 0, total: parseResults.validNodes.length });

    try {
      await onSave(parseResults.validNodes);
    } catch (error) {
      console.error("Error saving resources:", error);
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  }, [parseResults.validNodes, isSaving, onSave]);

  const exampleJson = useMemo(() => {
    const example: any = {
      title: "Example Resource",
      slug: "example-resource",
      oneliner: "A brief description",
    };

    if (resourceSetting) {
      Object.entries(resourceSetting).forEach(([key, def]) => {
        switch (def.type) {
          case "multi":
            example[key] = def.defaultValue || ["example1", "example2"];
            break;
          case "string":
            example[key] = def.defaultValue || "example text";
            break;
          case "number":
            example[key] = def.defaultValue || 0;
            break;
          case "boolean":
            example[key] = def.defaultValue !== undefined ? def.defaultValue : true;
            break;
          case "date":
            example[key] = new Date().toISOString();
            break;
          case "image":
            example[key] = "file-id-here";
            break;
        }
      });
    }

    return JSON.stringify([example], null, 2);
  }, [resourceSetting]);

  return (
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Bulk Import Resources</h3>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Category:</strong> {category}
          </p>
          <p className="text-sm text-blue-800">
            Paste a JSON array of resources. Each object should have title, slug, and oneliner
            fields. Additional fields will be stored in optionsPayload.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="json-input" className="block text-sm font-bold text-gray-800 mb-2">
            JSON Data
          </label>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={10}
            className="w-full p-2 font-mono text-sm border rounded-md"
            placeholder={exampleJson}
          />
        </div>

        {/* Status Display */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-800">{parseResults.nodes.length} nodes found</span>
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${
                parseResults.status === "valid"
                  ? "bg-green-100 text-green-800"
                  : parseResults.status === "invalid data found"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              Status: {parseResults.status}
            </span>
          </div>

          {parseResults.status === "valid" && (
            <p className="text-sm text-green-700">
              All {parseResults.validNodes.length} resources are valid and ready to import.
            </p>
          )}

          {parseResults.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-700 mb-1">Errors found:</p>
              <ul className="list-disc list-inside text-sm text-red-600 max-h-40 overflow-y-auto">
                {parseResults.errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>
                    {error.index >= 0 && `Item ${error.index + 1}: `}
                    {error.field} - {error.message}
                  </li>
                ))}
                {parseResults.errors.length > 10 && (
                  <li>...and {parseResults.errors.length - 10} more errors</li>
                )}
              </ul>
              {parseResults.validNodes.length > 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  {parseResults.validNodes.length} valid resources can still be imported.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {saveProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Saving resources...</span>
              <span>
                {saveProgress.current} / {saveProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={parseResults.validNodes.length === 0 || isSaving}
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            {isSaving
              ? `Saving... (${saveProgress?.current || 0}/${saveProgress?.total || 0})`
              : `Import ${parseResults.validNodes.length} Resources`}
          </button>
        </div>
      </div>
    </div>
  );
}
