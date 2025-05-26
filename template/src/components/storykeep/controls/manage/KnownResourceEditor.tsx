/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useMemo } from "react";
import { navigate } from "astro:transitions/client";
import { Select, Portal, Switch, NumberInput } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/select";
import { cleanString } from "@/utils/common/helpers.ts";
import {
  getKnownResources,
  updateKnownResource,
  clearKnownResourcesCache,
} from "@/utils/storykeep/resourceHelpers.ts";
import type { ResourceSetting, FullContentMap, ResourceContentMap, ResourceNode } from "@/types.ts";

// Type guard for ResourceContentMap
function isResourceContentMap(item: FullContentMap): item is ResourceContentMap {
  return item.type === "Resource";
}

interface KnownResourceEditorProps {
  categorySlug: string | null;
  resourcesUsingCategory: ResourceNode[];
  create: boolean;
  contentMap: FullContentMap[];
}

interface FieldDefinition {
  type: "string" | "boolean" | "number" | "date";
  defaultValue?: any;
  belongsToCategory?: string;
  customValues?: string[];
  maxTextLength?: number;
  maxNumber?: number;
  minNumber?: number;
  isUrl?: boolean;
  optional?: boolean;
}

interface ValidationConflict {
  fieldName: string;
  message: string;
  problematicResources?: { slug: string; title: string }[];
}

export default function KnownResourceEditor({
  categorySlug,
  resourcesUsingCategory,
  create,
  contentMap,
}: KnownResourceEditorProps) {
  const [localCategorySlug, setLocalCategorySlug] = useState(categorySlug || "");
  const [localResourceSetting, setLocalResourceSetting] = useState<ResourceSetting>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationConflicts, setValidationConflicts] = useState<ValidationConflict[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [newFields, setNewFields] = useState<string[]>([]);
  const [editingFieldNames, setEditingFieldNames] = useState<{ [key: string]: string }>({});
  const [customValuesState, setCustomValuesState] = useState<{ [key: string]: string[] }>({});

  const hasResourcesUsingCategory = resourcesUsingCategory.length > 0;

  // Fetch ResourceSetting and derive categories
  useEffect(() => {
    getKnownResources()
      .then((knownResources) => {
        if (!create && categorySlug) {
          setLocalResourceSetting(knownResources[categorySlug] || {});
        }
        const knownCats = Object.keys(knownResources);
        const contentCats = contentMap
          .filter(isResourceContentMap)
          .filter((item) => item.categorySlug)
          .map((item) => item.categorySlug!)
          .filter((cat, index, self) => self.indexOf(cat) === index);
        setAvailableCategories([...new Set([...knownCats, ...contentCats])].sort());
      })
      .catch((error) => {
        console.error("Error fetching known resources:", error);
        setErrors((prev) => ({ ...prev, fetch: "Failed to load category settings" }));
      });
  }, [create, categorySlug, contentMap]);

  // Validate category slug
  const validateCategorySlug = useCallback(
    (slug: string): string | null => {
      if (!slug) return "Category slug is required";
      if (!/^[a-z]+$/.test(slug)) return "Category slug must be lowercase letters only";
      if (availableCategories.includes(slug) && create) return "Category slug already exists";
      return null;
    },
    [availableCategories, create]
  );

  // Validate field name
  const validateFieldName = useCallback((name: string): string | null => {
    if (!name) return "Field name is required";
    if (!/^[a-zA-Z0-9]+$/.test(name)) return "Field name must contain only letters and numbers";
    return null;
  }, []);

  // Check if field name is valid (for enabling other fields)
  const isFieldNameValid = useCallback(
    (fieldName: string): boolean => {
      const displayName = editingFieldNames[fieldName] || fieldName;
      return !validateFieldName(displayName);
    },
    [editingFieldNames, validateFieldName]
  );

  // Validate URL format
  const isValidUrl = (value: string): boolean => {
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return urlPattern.test(value);
  };

  // Check validation conflicts
  const checkValidationConflicts = useCallback(() => {
    const conflicts: ValidationConflict[] = [];

    Object.entries(localResourceSetting).forEach(([fieldName, fieldDef]) => {
      // Validate existing resources
      if (hasResourcesUsingCategory) {
        if (!fieldDef.optional) {
          const missingResources = resourcesUsingCategory.filter(
            (resource) => !(fieldName in (resource.optionsPayload || {}))
          );
          if (missingResources.length > 0) {
            conflicts.push({
              fieldName,
              message: `Field "${fieldName}" is required but missing in some resources`,
              problematicResources: missingResources.map((res) => ({
                slug: res.slug,
                title: res.title,
              })),
            });
          }
        }

        if (fieldDef.type === "string") {
          if (fieldDef.maxTextLength) {
            const exceedingResources = resourcesUsingCategory.filter((resource) => {
              const value = resource.optionsPayload?.[fieldName];
              return typeof value === "string" && value.length > fieldDef.maxTextLength!;
            });
            if (exceedingResources.length > 0) {
              conflicts.push({
                fieldName,
                message: `Field "${fieldName}" exceeds max length ${fieldDef.maxTextLength} in some resources`,
                problematicResources: exceedingResources.map((res) => ({
                  slug: res.slug,
                  title: res.title,
                })),
              });
            }
          }
          if (fieldDef.isUrl) {
            const invalidUrlResources = resourcesUsingCategory.filter((resource) => {
              const value = resource.optionsPayload?.[fieldName];
              return typeof value === "string" && value && !isValidUrl(value);
            });
            if (invalidUrlResources.length > 0) {
              conflicts.push({
                fieldName,
                message: `Field "${fieldName}" has invalid URL values in some resources`,
                problematicResources: invalidUrlResources.map((res) => ({
                  slug: res.slug,
                  title: res.title,
                })),
              });
            }
          }
          if (fieldDef.belongsToCategory) {
            const validSlugs = contentMap
              .filter(isResourceContentMap)
              .filter((item) => item.categorySlug === fieldDef.belongsToCategory)
              .map((item) => item.slug);
            const invalidResources = resourcesUsingCategory.filter((resource) => {
              const value = resource.optionsPayload?.[fieldName];
              return typeof value === "string" && value && !validSlugs.includes(value);
            });
            if (invalidResources.length > 0) {
              conflicts.push({
                fieldName,
                message: `Field "${fieldName}" has invalid resource values for category ${fieldDef.belongsToCategory} in some resources`,
                problematicResources: invalidResources.map((res) => ({
                  slug: res.slug,
                  title: res.title,
                })),
              });
            }
          }
        }

        if (fieldDef.type === "number") {
          const violatingResources = resourcesUsingCategory.filter((resource) => {
            const value = resource.optionsPayload?.[fieldName];
            if (typeof value !== "number") return false;
            if (fieldDef.minNumber !== undefined && value < fieldDef.minNumber) return true;
            if (fieldDef.maxNumber !== undefined && value > fieldDef.maxNumber) return true;
            return false;
          });
          if (violatingResources.length > 0) {
            conflicts.push({
              fieldName,
              message: `Field "${fieldName}" has values outside range in some resources`,
              problematicResources: violatingResources.map((res) => ({
                slug: res.slug,
                title: res.title,
              })),
            });
          }
        }

        if (fieldDef.type === "boolean") {
          const invalidTypeResources = resourcesUsingCategory.filter((resource) => {
            const value = resource.optionsPayload?.[fieldName];
            return value !== undefined && typeof value !== "boolean";
          });
          if (invalidTypeResources.length > 0) {
            conflicts.push({
              fieldName,
              message: `Field "${fieldName}" has non-boolean values in some resources`,
              problematicResources: invalidTypeResources.map((res) => ({
                slug: res.slug,
                title: res.title,
              })),
            });
          }
        }

        if (fieldDef.type === "date") {
          const defaultValue = fieldDef.defaultValue;
          if (
            defaultValue != null &&
            defaultValue !== "" &&
            (typeof defaultValue === "string" || typeof defaultValue === "number")
          ) {
            const numericDefault = Number(defaultValue);
            if (isNaN(numericDefault) || isNaN(new Date(numericDefault * 1000).getTime())) {
              conflicts.push({
                fieldName,
                message: `Default value for "${fieldName}" is not a valid date`,
              });
            }
          }
        }
      }

      // Validate defaultValue (only if defined)
      if (fieldDef.defaultValue !== undefined) {
        if (fieldDef.type === "string") {
          if (
            fieldDef.maxTextLength &&
            typeof fieldDef.defaultValue === "string" &&
            fieldDef.defaultValue.length > fieldDef.maxTextLength
          ) {
            conflicts.push({
              fieldName,
              message: `Default value for "${fieldName}" exceeds max length ${fieldDef.maxTextLength}`,
            });
          }
          if (
            fieldDef.isUrl &&
            typeof fieldDef.defaultValue === "string" &&
            fieldDef.defaultValue &&
            !isValidUrl(fieldDef.defaultValue)
          ) {
            conflicts.push({
              fieldName,
              message: `Default value for "${fieldName}" is not a valid URL`,
            });
          }
          if (fieldDef.belongsToCategory) {
            const validSlugs = contentMap
              .filter(isResourceContentMap)
              .filter((item) => item.categorySlug === fieldDef.belongsToCategory)
              .map((item) => item.slug);
            if (
              typeof fieldDef.defaultValue === "string" &&
              fieldDef.defaultValue &&
              !validSlugs.includes(fieldDef.defaultValue)
            ) {
              conflicts.push({
                fieldName,
                message: `Default value for "${fieldName}" is not a valid resource in category ${fieldDef.belongsToCategory}`,
              });
            }
          }
        }

        if (fieldDef.type === "number") {
          const value = Number(fieldDef.defaultValue);
          if (fieldDef.minNumber !== undefined && value < fieldDef.minNumber) {
            conflicts.push({
              fieldName,
              message: `Default value for "${fieldName}" is below min ${fieldDef.minNumber}`,
            });
          }
          if (fieldDef.maxNumber !== undefined && value > fieldDef.maxNumber) {
            conflicts.push({
              fieldName,
              message: `Default value for "${fieldName}" exceeds max ${fieldDef.maxNumber}`,
            });
          }
        }
      }
    });

    setValidationConflicts(conflicts);
  }, [localResourceSetting, resourcesUsingCategory, hasResourcesUsingCategory, contentMap]);

  useEffect(() => {
    checkValidationConflicts();
  }, [checkValidationConflicts]);

  // Handlers
  const handleCategorySlugChange = useCallback(
    (value: string) => {
      const cleaned = cleanString(value).toLowerCase();
      setLocalCategorySlug(cleaned);
      const error = validateCategorySlug(cleaned);
      setErrors((prev) => ({ ...prev, categorySlug: error || "" }));
      setUnsavedChanges(true);
    },
    [validateCategorySlug]
  );

  const handleFieldNameChange = useCallback(
    (fieldName: string, value: string) => {
      setEditingFieldNames((prev) => ({ ...prev, [fieldName]: value }));
      const cleaned = cleanString(value);
      const error = validateFieldName(cleaned);
      setErrors((prev) => ({ ...prev, [`field_${fieldName}`]: error || "" }));
    },
    [validateFieldName]
  );

  const commitFieldNameChange = useCallback(
    (oldName: string) => {
      const newName = editingFieldNames[oldName] || oldName;
      const cleaned = cleanString(newName);
      const error = validateFieldName(cleaned);
      if (error) {
        setErrors((prev) => ({ ...prev, [`field_${oldName}`]: error }));
        return;
      }
      if (cleaned !== oldName && hasResourcesUsingCategory && !newFields.includes(oldName)) return;
      const newSetting = { ...localResourceSetting };
      const fieldDef = newSetting[oldName];
      delete newSetting[oldName];
      newSetting[cleaned] = fieldDef;
      setLocalResourceSetting(newSetting);
      setNewFields((prev) => prev.map((name) => (name === oldName ? cleaned : name)));
      setEditingFieldNames((prev) => {
        const newEditing = { ...prev };
        delete newEditing[oldName];
        return newEditing;
      });
      setUnsavedChanges(true);
    },
    [
      localResourceSetting,
      hasResourcesUsingCategory,
      newFields,
      editingFieldNames,
      validateFieldName,
    ]
  );

  const handleFieldDefinitionChange = useCallback(
    (fieldName: string, key: keyof FieldDefinition, value: any) => {
      if (key === "type" && hasResourcesUsingCategory && !newFields.includes(fieldName)) return;
      setLocalResourceSetting((prev) => {
        const newFieldDef = { ...prev[fieldName], [key]: value };
        if (key === "type" && newFields.includes(fieldName)) {
          newFieldDef.defaultValue = undefined;
        }
        return {
          ...prev,
          [fieldName]: newFieldDef,
        };
      });
      setUnsavedChanges(true);
    },
    [hasResourcesUsingCategory, newFields]
  );

  const handleAddField = useCallback(() => {
    const newFieldName = "";
    setLocalResourceSetting((prev) => ({
      ...prev,
      [newFieldName]: { type: "string", optional: true },
    }));
    setNewFields((prev) => [...prev, newFieldName]);
    setEditingFieldNames((prev) => ({ ...prev, [newFieldName]: "" }));
    setCustomValuesState((prev) => ({ ...prev, [newFieldName]: [] }));
    setUnsavedChanges(true);
  }, []);

  const handleRemoveField = useCallback(
    (fieldName: string) => {
      if (hasResourcesUsingCategory && !newFields.includes(fieldName)) return;
      const newSetting = { ...localResourceSetting };
      delete newSetting[fieldName];
      setLocalResourceSetting(newSetting);
      setNewFields((prev) => prev.filter((name) => name !== fieldName));
      setEditingFieldNames((prev) => {
        const newEditing = { ...prev };
        delete newEditing[fieldName];
        return newEditing;
      });
      setCustomValuesState((prev) => {
        const newState = { ...prev };
        delete newState[fieldName];
        return newState;
      });
      setUnsavedChanges(true);
    },
    [localResourceSetting, hasResourcesUsingCategory, newFields]
  );

  const handleAddCustomValue = useCallback((fieldName: string, value: string) => {
    if (!value.trim()) return;
    setCustomValuesState((prev) => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), value.trim()],
    }));
    setLocalResourceSetting((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        customValues: [...(prev[fieldName].customValues || []), value.trim()],
      },
    }));
    setUnsavedChanges(true);
  }, []);

  const handleRemoveCustomValue = useCallback((fieldName: string, index: number) => {
    setCustomValuesState((prev) => {
      const newValues = [...(prev[fieldName] || [])];
      newValues.splice(index, 1);
      return { ...prev, [fieldName]: newValues };
    });
    setLocalResourceSetting((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        customValues: (prev[fieldName].customValues || []).filter((_, i) => i !== index),
      },
    }));
    setUnsavedChanges(true);
  }, []);

  const validateBeforeSave = useCallback(() => {
    const newErrors: { [key: string]: string } = {};

    if (create) {
      const slugError = validateCategorySlug(localCategorySlug);
      if (slugError) newErrors.categorySlug = slugError;
    }

    Object.keys(localResourceSetting).forEach((fieldName) => {
      const displayName = editingFieldNames[fieldName] || fieldName;
      const error = validateFieldName(displayName);
      if (error) newErrors[`field_${fieldName}`] = error;

      const fieldDef = localResourceSetting[fieldName];
      if (fieldDef.defaultValue !== undefined) {
        if (fieldDef.type === "string") {
          if (
            fieldDef.maxTextLength &&
            typeof fieldDef.defaultValue === "string" &&
            fieldDef.defaultValue.length > fieldDef.maxTextLength
          ) {
            newErrors[`default_${fieldName}`] =
              `Default value exceeds max length ${fieldDef.maxTextLength}`;
          }
          if (
            fieldDef.isUrl &&
            typeof fieldDef.defaultValue === "string" &&
            fieldDef.defaultValue &&
            !isValidUrl(fieldDef.defaultValue)
          ) {
            newErrors[`default_${fieldName}`] = `Default value is not a valid URL`;
          }
          if (fieldDef.belongsToCategory) {
            const validSlugs = contentMap
              .filter(isResourceContentMap)
              .filter((item) => item.categorySlug === fieldDef.belongsToCategory)
              .map((item) => item.slug);
            if (
              typeof fieldDef.defaultValue === "string" &&
              fieldDef.defaultValue &&
              !validSlugs.includes(fieldDef.defaultValue)
            ) {
              newErrors[`default_${fieldName}`] =
                `Default value is not a valid resource in category ${fieldDef.belongsToCategory}`;
            }
          }
        }
        if (fieldDef.type === "number") {
          const value = Number(fieldDef.defaultValue);
          if (fieldDef.minNumber !== undefined && value < fieldDef.minNumber) {
            newErrors[`default_${fieldName}`] = `Default value is below min ${fieldDef.minNumber}`;
          }
          if (fieldDef.maxNumber !== undefined && value > fieldDef.maxNumber) {
            newErrors[`default_${fieldName}`] = `Default value exceeds max ${fieldDef.maxNumber}`;
          }
        }
        if (fieldDef.type === "date" && isNaN(new Date(fieldDef.defaultValue).getTime())) {
          newErrors[`default_${fieldName}`] = `Default value is not a valid date`;
        }
      }
    });

    const fieldNames = Object.keys(localResourceSetting).map(
      (name) => editingFieldNames[name] || name
    );
    if (new Set(fieldNames).size !== fieldNames.length) {
      newErrors.duplicateFields = "Field names must be unique";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    create,
    localCategorySlug,
    localResourceSetting,
    validateCategorySlug,
    editingFieldNames,
    contentMap,
  ]);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving || !validateBeforeSave() || validationConflicts.length > 0)
      return;

    Object.keys(editingFieldNames).forEach((fieldName) => commitFieldNameChange(fieldName));

    setIsSaving(true);
    try {
      const slugToUse = create ? localCategorySlug : categorySlug!;
      const success = await updateKnownResource(slugToUse, localResourceSetting);
      if (success) {
        clearKnownResourcesCache();
        setUnsavedChanges(false);
        setNewFields([]);
        setEditingFieldNames({});
        setCustomValuesState({});
        navigate("/storykeep/content/resources");
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving resource category:", error);
      setErrors((prev) => ({ ...prev, save: "Failed to save resource category" }));
    } finally {
      setIsSaving(false);
    }
  }, [
    unsavedChanges,
    isSaving,
    validateBeforeSave,
    validationConflicts,
    create,
    localCategorySlug,
    categorySlug,
    localResourceSetting,
    editingFieldNames,
    commitFieldNameChange,
  ]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges && !window.confirm("Unsaved changes will be lost. Continue?")) return;
    navigate("/storykeep/content/resources");
  }, [unsavedChanges]);

  const handleResourceLinkClick = useCallback(
    (slug: string, e: React.MouseEvent) => {
      if (unsavedChanges && !window.confirm("Unsaved changes will be lost. Continue?")) {
        e.preventDefault();
        return;
      }
      navigate(`/storykeep/controls/content/resources/${slug}`);
    },
    [unsavedChanges]
  );

  const typeOptions = ["string", "boolean", "number", "date"];
  const typeCollection = useMemo(() => createListCollection({ items: typeOptions }), []);

  const belongsToCategoryCollection = useMemo(
    () => createListCollection({ items: ["", ...availableCategories] }),
    [availableCategories]
  );

  return (
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          {create ? "Create Resource Category" : `Edit Resource Category: ${categorySlug}`}
        </h3>

        {hasResourcesUsingCategory && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This category is used by {resourcesUsingCategory.length}{" "}
              resource{resourcesUsingCategory.length !== 1 ? "s" : ""}. Field names and types are
              locked, but you can edit validation parameters and default values.
            </p>
          </div>
        )}

        {validationConflicts.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 font-bold mb-2">Validation Conflicts:</p>
            <ul className="list-disc list-inside text-sm text-red-800">
              {validationConflicts.map((conflict, index) => (
                <li key={index}>
                  {conflict.message}
                  {conflict.problematicResources && conflict.problematicResources.length > 0 && (
                    <ul className="list-circle list-inside ml-4 mt-1">
                      {conflict.problematicResources.map((resource) => (
                        <li key={resource.slug}>
                          <a
                            href={`/storykeep/content/resources/${resource.slug}`}
                            onClick={(e) => handleResourceLinkClick(resource.slug, e)}
                            className="text-cyan-700 hover:underline"
                          >
                            {resource.title} ({resource.slug})
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm text-red-800 mt-2">Resolve all conflicts to save.</p>
          </div>
        )}

        {errors.fetch && <p className="text-sm text-red-600 mb-4">{errors.fetch}</p>}
        {errors.duplicateFields && (
          <p className="text-sm text-red-600 mb-1">{errors.duplicateFields}</p>
        )}

        {/* Save/Cancel Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {unsavedChanges ? "Cancel" : "Close"}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !unsavedChanges || validationConflicts.length > 0}
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="space-y-6">
          {/* Category Slug */}
          <div>
            <label htmlFor="categorySlug" className="block text-sm font-bold text-gray-800">
              Category Slug
            </label>
            <input
              type="text"
              id="categorySlug"
              value={localCategorySlug}
              onChange={(e) => handleCategorySlugChange(e.target.value)}
              disabled={!create}
              className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
            />
            {errors.categorySlug && (
              <p className="mt-1 text-sm text-red-600">{errors.categorySlug}</p>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-800">Fields</h4>
            {Object.entries(localResourceSetting).map(([fieldName, fieldDef]) => {
              const isNewField = newFields.includes(fieldName);
              const isFieldLocked = hasResourcesUsingCategory && !isNewField;
              const selectId = `select-fieldType-${fieldName}`;
              const errorId = errors[`field_${fieldName}`] ? `error-field_${fieldName}` : undefined;
              const defaultErrorId = errors[`default_${fieldName}`]
                ? `error-default_${fieldName}`
                : undefined;

              // For defaultValue with belongsToCategory
              let matchingResources: { slug: string; title: string }[] = [];
              let defaultValueCollection;
              if (fieldDef.type === "string" && fieldDef.belongsToCategory) {
                matchingResources = contentMap
                  .filter(isResourceContentMap)
                  .filter((item) => item.categorySlug === fieldDef.belongsToCategory)
                  .map((item) => ({ slug: item.slug, title: item.title }));
                defaultValueCollection = createListCollection({
                  items: matchingResources.map((res) => res.slug),
                });
              }

              return (
                <div key={fieldName} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Field Name */}
                    <div>
                      <label
                        htmlFor={`fieldName_${fieldName}`}
                        className="block text-sm font-bold text-gray-800"
                      >
                        Field Name
                      </label>
                      <input
                        type="text"
                        id={`fieldName_${fieldName}`}
                        value={editingFieldNames[fieldName] ?? fieldName}
                        onChange={(e) => handleFieldNameChange(fieldName, e.target.value)}
                        onBlur={() => commitFieldNameChange(fieldName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitFieldNameChange(fieldName);
                        }}
                        disabled={isFieldLocked}
                        className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
                        aria-required={true}
                        aria-invalid={!!errors[`field_${fieldName}`]}
                        aria-describedby={errorId}
                      />
                      {errors[`field_${fieldName}`] && (
                        <span id={errorId} className="mt-1 text-sm text-red-600" role="alert">
                          {errors[`field_${fieldName}`]}
                        </span>
                      )}
                    </div>

                    {/* Show other parameters only if field name is valid or field is not new */}
                    {(isFieldNameValid(fieldName) || !isNewField) && (
                      <>
                        {/* Field Type */}
                        <div>
                          <label
                            htmlFor={selectId}
                            className="block text-sm font-bold text-gray-800"
                          >
                            Field Type
                          </label>
                          <Select.Root
                            id={selectId}
                            collection={typeCollection}
                            value={[fieldDef.type]}
                            onValueChange={(details) =>
                              handleFieldDefinitionChange(fieldName, "type", details.value[0])
                            }
                            disabled={isFieldLocked}
                            className="w-full"
                          >
                            <Select.Control className="w-full">
                              <Select.Trigger className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100">
                                <Select.ValueText placeholder="Select type" />
                              </Select.Trigger>
                              <Select.ClearTrigger className="ml-2 px-2 py-1 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-700">
                                Clear
                              </Select.ClearTrigger>
                            </Select.Control>
                            <Portal>
                              <Select.Positioner>
                                <Select.Content
                                  className="bg-white border border-gray-300 rounded-md shadow-lg z-50"
                                  style={{
                                    width: "var(--trigger-width)",
                                    minWidth: "200px",
                                    maxWidth: "400px",
                                  }}
                                >
                                  <Select.ItemGroup>
                                    {typeOptions.map((option) => (
                                      <Select.Item
                                        key={option}
                                        item={option}
                                        className="p-2 hover:bg-cyan-100 cursor-pointer"
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <Select.ItemText className="text-gray-800 truncate">
                                            {option}
                                          </Select.ItemText>
                                          <Select.ItemIndicator
                                            className="ml-2"
                                            style={{
                                              display: fieldDef.type === option ? "block" : "none",
                                              color: "#155E75", // cyan-700
                                              fontWeight: "bold",
                                            }}
                                          >
                                            ✓
                                          </Select.ItemIndicator>
                                        </div>
                                      </Select.Item>
                                    ))}
                                  </Select.ItemGroup>
                                </Select.Content>
                              </Select.Positioner>
                            </Portal>
                            <Select.HiddenSelect />
                          </Select.Root>
                        </div>

                        {/* Default Value */}
                        {(fieldDef.type === "string" ||
                          fieldDef.type === "number" ||
                          fieldDef.type === "boolean") && (
                          <div>
                            <label
                              htmlFor={
                                fieldDef.type === "string" && fieldDef.belongsToCategory
                                  ? `select-defaultValue-${fieldName}`
                                  : `defaultValue_${fieldName}`
                              }
                              className="block text-sm font-bold text-gray-800"
                            >
                              Default Value
                            </label>
                            {fieldDef.type === "boolean" ? (
                              <Switch.Root
                                checked={fieldDef.defaultValue ?? false}
                                onCheckedChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "defaultValue",
                                    details.checked
                                  )
                                }
                                disabled={!isFieldNameValid(fieldName)}
                                aria-required={false}
                                aria-invalid={!!errors[`default_${fieldName}`]}
                                aria-describedby={defaultErrorId}
                              >
                                <Switch.Control
                                  className={`${
                                    (fieldDef.defaultValue ?? false) ? "bg-cyan-700" : "bg-gray-300"
                                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
                                >
                                  <Switch.Thumb
                                    className={`${
                                      (fieldDef.defaultValue ?? false)
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                  />
                                </Switch.Control>
                                <Switch.HiddenInput />
                              </Switch.Root>
                            ) : fieldDef.type === "number" ? (
                              <NumberInput.Root
                                value={fieldDef.defaultValue ?? ""}
                                onValueChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "defaultValue",
                                    details.value ? Number(details.value) : undefined
                                  )
                                }
                                className="mt-1"
                                disabled={!isFieldNameValid(fieldName)}
                              >
                                <NumberInput.Input
                                  id={`defaultValue_${fieldName}`}
                                  className={`w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100 ${
                                    errors[`default_${fieldName}`] ? "border-red-600" : ""
                                  }`}
                                  aria-invalid={!!errors[`default_${fieldName}`]}
                                  aria-describedby={defaultErrorId}
                                />
                              </NumberInput.Root>
                            ) : fieldDef.belongsToCategory ? (
                              <div className="space-y-2 w-full">
                                <p className="text-sm text-gray-600">
                                  Looking up from category: {fieldDef.belongsToCategory}
                                </p>
                                {defaultValueCollection ? (
                                  <Select.Root
                                    id={`select-defaultValue-${fieldName}`}
                                    value={[fieldDef.defaultValue ?? ""]}
                                    onValueChange={(details) =>
                                      handleFieldDefinitionChange(
                                        fieldName,
                                        "defaultValue",
                                        details.value[0] || undefined
                                      )
                                    }
                                    collection={defaultValueCollection}
                                    disabled={!isFieldNameValid(fieldName)}
                                    className="w-full"
                                  >
                                    <Select.Control className="w-full">
                                      <Select.Trigger
                                        className={`w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100 ${
                                          errors[`default_${fieldName}`] ? "border-red-600" : ""
                                        }`}
                                      >
                                        <Select.ValueText placeholder="Select a resource">
                                          {matchingResources.find(
                                            (opt) => opt.slug === fieldDef.defaultValue
                                          )?.title || "Select a resource"}
                                        </Select.ValueText>
                                      </Select.Trigger>
                                      <Select.ClearTrigger className="ml-2 px-2 py-1 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-700">
                                        Clear
                                      </Select.ClearTrigger>
                                    </Select.Control>
                                    <Portal>
                                      <Select.Positioner>
                                        <Select.Content
                                          className="bg-white border border-gray-300 rounded-md shadow-lg z-50"
                                          style={{
                                            width: "var(--trigger-width)",
                                            minWidth: "300px",
                                            maxWidth: "500px",
                                          }}
                                        >
                                          <Select.ItemGroup>
                                            {matchingResources.map((option) => (
                                              <Select.Item
                                                key={option.slug}
                                                item={option.slug}
                                                className="p-2 hover:bg-cyan-100 cursor-pointer"
                                              >
                                                <div className="flex items-center justify-between w-full">
                                                  <Select.ItemText className="text-gray-800 truncate">
                                                    {option.title}
                                                  </Select.ItemText>
                                                  <Select.ItemIndicator
                                                    className="ml-2"
                                                    style={{
                                                      display:
                                                        fieldDef.defaultValue === option.slug
                                                          ? "block"
                                                          : "none",
                                                      color: "#155E75", // cyan-700
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    ✓
                                                  </Select.ItemIndicator>
                                                </div>
                                              </Select.Item>
                                            ))}
                                          </Select.ItemGroup>
                                        </Select.Content>
                                      </Select.Positioner>
                                    </Portal>
                                    <Select.HiddenSelect />
                                  </Select.Root>
                                ) : (
                                  <p className="text-sm text-gray-600">
                                    No resources available for category:{" "}
                                    {fieldDef.belongsToCategory}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                id={`defaultValue_${fieldName}`}
                                value={fieldDef.defaultValue ?? ""}
                                onChange={(e) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "defaultValue",
                                    e.target.value
                                  )
                                }
                                disabled={!isFieldNameValid(fieldName)}
                                className={`mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100 ${
                                  errors[`default_${fieldName}`] ? "border-red-600" : ""
                                }`}
                                aria-invalid={!!errors[`default_${fieldName}`]}
                                aria-describedby={defaultErrorId}
                              />
                            )}
                            {errors[`default_${fieldName}`] && (
                              <span
                                id={defaultErrorId}
                                className="mt-1 text-sm text-red-600"
                                role="alert"
                              >
                                {errors[`default_${fieldName}`]}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Optional */}
                        {(isNewField || fieldDef.optional !== undefined) && (
                          <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                              Optional
                              <Switch.Root
                                checked={fieldDef.optional ?? false}
                                onCheckedChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "optional",
                                    details.checked
                                  )
                                }
                                disabled={isFieldLocked}
                                aria-required={false}
                                aria-invalid={false}
                              >
                                <Switch.Control
                                  id={`optional_${fieldName}`}
                                  className={`${
                                    (fieldDef.optional ?? false) ? "bg-cyan-700" : "bg-gray-300"
                                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
                                >
                                  <Switch.Thumb
                                    className={`${
                                      (fieldDef.optional ?? false)
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                  />
                                </Switch.Control>
                                <Switch.HiddenInput />
                              </Switch.Root>
                            </label>
                          </div>
                        )}

                        {/* Validation Parameters */}
                        {fieldDef.type === "string" && (
                          <>
                            <div>
                              <label
                                htmlFor={`maxTextLength_${fieldName}`}
                                className="block text-sm font-bold text-gray-800"
                              >
                                Max Text Length
                              </label>
                              <NumberInput.Root
                                value={
                                  fieldDef.maxTextLength != null
                                    ? String(fieldDef.maxTextLength)
                                    : ""
                                }
                                onValueChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "maxTextLength",
                                    details.value ? Number(details.value) : undefined
                                  )
                                }
                                className="mt-1"
                                disabled={!isFieldNameValid(fieldName)}
                              >
                                <NumberInput.Input
                                  id={`maxTextLength_${fieldName}`}
                                  className="w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
                                />
                              </NumberInput.Root>
                            </div>
                            {(isNewField || fieldDef.isUrl !== undefined) && (
                              <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                  Is URL
                                  <Switch.Root
                                    checked={fieldDef.isUrl ?? false}
                                    onCheckedChange={(details) =>
                                      handleFieldDefinitionChange(
                                        fieldName,
                                        "isUrl",
                                        details.checked
                                      )
                                    }
                                    disabled={isFieldLocked || !isFieldNameValid(fieldName)}
                                    aria-required={false}
                                    aria-invalid={false}
                                  >
                                    <Switch.Control
                                      id={`isUrl_${fieldName}`}
                                      className={`${
                                        fieldDef.isUrl ? "bg-cyan-700" : "bg-gray-300"
                                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
                                    >
                                      <Switch.Thumb
                                        className={`${
                                          fieldDef.isUrl ? "translate-x-6" : "translate-x-1"
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                      />
                                    </Switch.Control>
                                    <Switch.HiddenInput />
                                  </Switch.Root>
                                </label>
                              </div>
                            )}
                            {availableCategories.length > 0 &&
                              (isNewField || fieldDef.belongsToCategory) && (
                                <div>
                                  <label
                                    htmlFor={`select-belongsToCategory-${fieldName}`}
                                    className="block text-sm font-bold text-gray-800"
                                  >
                                    Belongs to Category
                                  </label>
                                  <Select.Root
                                    id={`select-belongsToCategory-${fieldName}`}
                                    collection={belongsToCategoryCollection}
                                    value={[fieldDef.belongsToCategory ?? ""]}
                                    onValueChange={(details) =>
                                      handleFieldDefinitionChange(
                                        fieldName,
                                        "belongsToCategory",
                                        details.value[0] || undefined
                                      )
                                    }
                                    disabled={
                                      !!fieldDef.belongsToCategory || !isFieldNameValid(fieldName)
                                    }
                                    className="w-full"
                                  >
                                    <Select.Control className="w-full">
                                      <Select.Trigger className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100">
                                        <Select.ValueText placeholder="Select category">
                                          {fieldDef.belongsToCategory || "None"}
                                        </Select.ValueText>
                                      </Select.Trigger>
                                      <Select.ClearTrigger className="ml-2 px-2 py-1 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-700">
                                        Clear
                                      </Select.ClearTrigger>
                                    </Select.Control>
                                    <Portal>
                                      <Select.Positioner>
                                        <Select.Content
                                          className="bg-white border border-gray-300 rounded-md shadow-lg z-50"
                                          style={{
                                            width: "var(--trigger-width)",
                                            minWidth: "200px",
                                            maxWidth: "400px",
                                          }}
                                        >
                                          <Select.ItemGroup>
                                            {["", ...availableCategories].map((option) => (
                                              <Select.Item
                                                key={option || "none"}
                                                item={option}
                                                className="p-2 hover:bg-cyan-100 cursor-pointer"
                                              >
                                                <div className="flex items-center justify-between w-full">
                                                  <Select.ItemText className="text-gray-800 truncate">
                                                    {option || "None"}
                                                  </Select.ItemText>
                                                  <Select.ItemIndicator
                                                    className="ml-2"
                                                    style={{
                                                      display:
                                                        fieldDef.belongsToCategory === option
                                                          ? "block"
                                                          : "none",
                                                      color: "#155E75", // cyan-700
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    ✓
                                                  </Select.ItemIndicator>
                                                </div>
                                              </Select.Item>
                                            ))}
                                          </Select.ItemGroup>
                                        </Select.Content>
                                      </Select.Positioner>
                                    </Portal>
                                    <Select.HiddenSelect />
                                  </Select.Root>
                                </div>
                              )}
                            {(isNewField || fieldDef.customValues) && (
                              <div>
                                <label
                                  htmlFor={`customValues_${fieldName}`}
                                  className="block text-sm font-bold text-gray-800"
                                >
                                  Custom Values
                                </label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {(
                                    customValuesState[fieldName] ||
                                    fieldDef.customValues ||
                                    []
                                  ).map((value: string, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 bg-gray-200 rounded-md text-sm"
                                    >
                                      {value}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomValue(fieldName, index)}
                                        disabled={isFieldLocked || !isFieldNameValid(fieldName)}
                                        className="ml-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                        aria-label={`Remove custom value ${value}`}
                                      >
                                        [x]
                                      </button>
                                    </span>
                                  ))}
                                  {isNewField && (
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        id={`customValues_${fieldName}`}
                                        placeholder="Add value"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            handleAddCustomValue(fieldName, e.currentTarget.value);
                                            e.currentTarget.value = "";
                                          }
                                        }}
                                        disabled={isFieldLocked || !isFieldNameValid(fieldName)}
                                        className="p-1 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const input = document.getElementById(
                                            `customValues_${fieldName}`
                                          ) as HTMLInputElement;
                                          if (input.value) {
                                            handleAddCustomValue(fieldName, input.value);
                                            input.value = "";
                                          }
                                        }}
                                        disabled={isFieldLocked || !isFieldNameValid(fieldName)}
                                        className="ml-1 px-2 py-1 bg-cyan-700 text-white rounded-md text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        aria-label="Add custom value"
                                      >
                                        [+]
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {fieldDef.type === "number" && (
                          <>
                            <div>
                              <label
                                htmlFor={`minNumber_${fieldName}`}
                                className="block text-sm font-bold text-gray-800"
                              >
                                Min Number
                              </label>
                              <NumberInput.Root
                                value={fieldDef.minNumber != null ? String(fieldDef.minNumber) : ""}
                                onValueChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "minNumber",
                                    details.value ? Number(details.value) : undefined
                                  )
                                }
                                className="mt-1"
                                disabled={!isFieldNameValid(fieldName)}
                              >
                                <NumberInput.Input
                                  id={`minNumber_${fieldName}`}
                                  className="w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
                                />
                              </NumberInput.Root>
                            </div>
                            <div>
                              <label
                                htmlFor={`maxNumber_${fieldName}`}
                                className="block text-sm font-bold text-gray-800"
                              >
                                Max Number
                              </label>
                              <NumberInput.Root
                                value={fieldDef.maxNumber != null ? String(fieldDef.maxNumber) : ""}
                                onValueChange={(details) =>
                                  handleFieldDefinitionChange(
                                    fieldName,
                                    "maxNumber",
                                    details.value ? Number(details.value) : undefined
                                  )
                                }
                                className="mt-1"
                                disabled={!isFieldNameValid(fieldName)}
                              >
                                <NumberInput.Input
                                  id={`maxNumber_${fieldName}`}
                                  className="w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm disabled:bg-gray-100"
                                />
                              </NumberInput.Root>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(fieldName)}
                    disabled={isFieldLocked}
                    className="mt-4 inline-flex items-center px-3 py-2 border-none text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    aria-label={`Remove field ${fieldName}`}
                  >
                    Remove Field
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddField}
              className="inline-flex items-center px-3 py-2 border-none text-sm font-medium rounded-lg shadow-sm text-white bg-cyan-700 hover:bg-cyan-800"
              aria-label="Add new field"
            >
              Add Field
            </button>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {unsavedChanges ? "Cancel" : "Close"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !unsavedChanges || validationConflicts.length > 0}
              className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
