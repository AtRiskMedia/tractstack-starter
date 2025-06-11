/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, useMemo } from "react";
import { navigate } from "astro:transitions/client";
import { Select, Slider, Switch, Portal } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/select";
import { ulid } from "ulid";
import { cleanString } from "@/utils/common/helpers.ts";
import ResourceImageUpload from "./ResourceImageUpload";
import ResourceBulkIngest from "./ResourceBulkIngest";
import { processResourceImage } from "@/utils/images/processResourceImage";
import { getResourceSetting, getKnownResources } from "@/utils/storykeep/resourceHelpers.ts";
import type {
  ResourceNode,
  ResourceSetting,
  FullContentMap,
  KnownResource,
  ResourceContentMap,
} from "@/types";

interface ResourceEditorProps {
  resource: ResourceNode;
  create: boolean;
  contentMap: FullContentMap[];
}

interface EditableKeyProps {
  originalKey: string;
  onKeyChange: (oldKey: string, newKey: string) => void;
}

// Type guard for ResourceContentMap
function isResourceContentMap(item: FullContentMap): item is ResourceContentMap {
  return item.type === "Resource";
}

function processResourceValue(key: string, value: any, setting: ResourceSetting): any {
  if (key in setting) {
    const { type, defaultValue } = setting[key];
    switch (type) {
      case "string":
        return typeof value === "string" ? value : (defaultValue ?? "");
      case "boolean":
        return typeof value === "boolean" ? value : (defaultValue ?? false);
      case "number":
        return typeof value === "number" ? value : (defaultValue ?? 0);
      case "date": {
        const numericValue = typeof value === "string" ? Number(value) : value;
        if (
          typeof numericValue === "number" &&
          !isNaN(numericValue) &&
          !isNaN(new Date(numericValue * 1000).getTime())
        ) {
          return numericValue;
        }
        return defaultValue ?? null;
      }
      case "image":
        return typeof value === "string" ? value : (defaultValue ?? null);
      default:
        return value;
    }
  }
  return value;
}

const EditableKey = ({ originalKey, onKeyChange }: EditableKeyProps) => {
  const [editingKey, setEditingKey] = useState(originalKey);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^a-zA-Z]/g, "");
    setEditingKey(newValue);
  };

  const handleKeyBlur = () => {
    if (editingKey !== originalKey && editingKey.length > 0) {
      onKeyChange(originalKey, editingKey);
    } else if (editingKey.length === 0) {
      setEditingKey(originalKey);
    }
  };

  return (
    <input
      type="text"
      value={editingKey}
      onChange={handleKeyChange}
      onBlur={handleKeyBlur}
      pattern="[A-Za-z]+"
      className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
      aria-label={`Edit key for ${originalKey}`}
    />
  );
};

export default function ResourceEditor({ resource, create, contentMap }: ResourceEditorProps) {
  const [localResource, setLocalResource] = useState<ResourceNode>({
    ...resource,
    ...(create ? { id: ulid() } : {}),
    actionLisp: resource.actionLisp || "",
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resourceSetting, setResourceSetting] = useState<ResourceSetting | undefined>(undefined);
  const [knownResources, setKnownResources] = useState<KnownResource>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [dateTimeState, setDateTimeState] = useState<{ [key: string]: string }>({});
  const [pendingImageFiles, setPendingImageFiles] = useState<{
    [key: string]: { file: File; tempUrl: string } | null;
  }>({});
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [resolvedImages, setResolvedImages] = useState<{
    [fieldName: string]: {
      fileId: string;
      src: string;
      srcSet?: string;
      altDescription: string;
    } | null;
  }>({});
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => {
    const loadKnownResources = async () => {
      const resources = await getKnownResources();
      setKnownResources(resources);
    };
    loadKnownResources();
  }, []);

  useEffect(() => {
    const loadResourceSettings = async () => {
      const settings = await getResourceSetting(localResource?.category || "");
      setResourceSetting(settings);
    };
    loadResourceSettings();
  }, [localResource?.category]);

  useEffect(() => {
    if (resourceSetting && localResource.optionsPayload) {
      const initialState: typeof dateTimeState = {};
      Object.entries(localResource.optionsPayload).forEach(([key, value]) => {
        const setting = resourceSetting[key];
        if (setting?.type === "date") {
          const numericValue = typeof value === "string" ? Number(value) : value;
          if (
            typeof numericValue === "number" &&
            !isNaN(numericValue) &&
            !isNaN(new Date(numericValue * 1000).getTime())
          ) {
            const date = new Date(numericValue * 1000);
            const localDateString = date
              .toLocaleString("sv-SE", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(" ", "T");
            initialState[key] = localDateString;
          }
        }
      });
      setDateTimeState(initialState);
    }
  }, [resourceSetting, localResource.optionsPayload]);

  useEffect(() => {
    if (resourceSetting && localResource.category) {
      setLocalResource((prev) => {
        const newOptionsPayload = { ...prev.optionsPayload };
        Object.keys(resourceSetting).forEach((key) => {
          if (!(key in newOptionsPayload)) {
            newOptionsPayload[key] = resourceSetting[key].defaultValue;
          }
        });
        return { ...prev, optionsPayload: newOptionsPayload };
      });
    }
  }, [resourceSetting, localResource.category]);

  useEffect(() => {
    const loadResourceImages = async () => {
      if (!create && localResource.id) {
        try {
          const response = await fetch(
            `/api/turso/getResourceFiles?resourceId=${localResource.id}`
          );
          const result = await response.json();
          if (result.success && result.data) {
            const resolved: typeof resolvedImages = {};
            Object.entries(localResource.optionsPayload).forEach(([fieldName, value]) => {
              if (resourceSetting && resourceSetting[fieldName]?.type === "image" && value) {
                const file = result.data.find((f: any) => f.id === value);
                if (file) {
                  resolved[fieldName] = {
                    fileId: file.id,
                    src: file.url,
                    srcSet: file.src_set,
                    altDescription: file.alt_description,
                  };
                }
              }
            });

            setResolvedImages(resolved);
          }
        } catch (error) {
          console.error("Error loading resource images:", error);
        }
      }
    };
    loadResourceImages();
  }, [create, localResource.id, localResource.optionsPayload, resourceSetting]);

  // Cleanup temporary URLs
  useEffect(() => {
    return () => {
      Object.values(pendingImageFiles).forEach((pending) => {
        if (pending && pending.tempUrl) {
          URL.revokeObjectURL(pending.tempUrl);
        }
      });
    };
  }, [pendingImageFiles]);

  const handleBulkSave = useCallback(async (resources: ResourceNode[]) => {
    try {
      // Save each resource
      for (let i = 0; i < resources.length; i++) {
        const response = await fetch("/api/turso/upsertResourceNode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resources[i]),
        });

        if (!response.ok) {
          throw new Error(`Failed to save resource ${i + 1}: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `Failed to save resource ${i + 1}`);
        }
      }

      // Success - navigate to resources list
      navigate("/storykeep/content/resources");
    } catch (error) {
      console.error("Error in bulk save:", error);
      throw error;
    }
  }, []);

  const handleChange = useCallback((field: keyof ResourceNode, value: any) => {
    setLocalResource((prev) => {
      const processedValue = field === "slug" || field === "category" ? cleanString(value) : value;
      return { ...prev, [field]: processedValue };
    });
    setUnsavedChanges(true);
  }, []);

  const handleKeyChange = useCallback((oldKey: string, newKey: string) => {
    setLocalResource((prev) => {
      const newOptionsPayload = { ...prev.optionsPayload };
      const value = newOptionsPayload[oldKey];
      delete newOptionsPayload[oldKey];
      newOptionsPayload[newKey] = value;
      return { ...prev, optionsPayload: newOptionsPayload };
    });
    setDateTimeState((prev) => {
      const newState = { ...prev };
      const stateValue = newState[oldKey];
      delete newState[oldKey];
      if (stateValue) newState[newKey] = stateValue;
      return newState;
    });
    setPendingImageFiles((prev) => {
      const newPending = { ...prev };
      const pendingValue = newPending[oldKey];
      delete newPending[oldKey];
      if (pendingValue !== undefined) newPending[newKey] = pendingValue;
      return newPending;
    });
    setUnsavedChanges(true);
  }, []);

  const handleOptionsPayloadChange = useCallback(
    (key: string, value: any) => {
      setLocalResource((prev) => {
        const processedValue = resourceSetting
          ? processResourceValue(key, value, resourceSetting)
          : value;
        return {
          ...prev,
          optionsPayload: {
            ...prev.optionsPayload,
            [key]: processedValue,
          },
        };
      });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
      setUnsavedChanges(true);
    },
    [resourceSetting]
  );

  const handleDateTimeChange = useCallback(
    (key: string, value: string) => {
      setDateTimeState((prev) => ({
        ...prev,
        [key]: value,
      }));

      if (value) {
        const localDate = new Date(value);
        if (!isNaN(localDate.getTime())) {
          const utcTimestamp = Math.floor(localDate.getTime() / 1000);
          handleOptionsPayloadChange(key, utcTimestamp);
        } else {
          handleOptionsPayloadChange(key, null);
        }
      } else {
        handleOptionsPayloadChange(key, null);
      }
    },
    [handleOptionsPayloadChange]
  );

  const handleImageChange = useCallback((key: string, file: File | null) => {
    setPendingImageFiles((prev) => {
      // Cleanup old URL if exists
      if (prev[key] && prev[key] !== null) {
        URL.revokeObjectURL(prev[key]!.tempUrl);
      }

      if (file) {
        const tempUrl = URL.createObjectURL(file);
        return {
          ...prev,
          [key]: { file, tempUrl },
        };
      } else {
        return {
          ...prev,
          [key]: null,
        };
      }
    });
    setUnsavedChanges(true);
  }, []);

  const handleImageRemove = useCallback(
    (key: string) => {
      // Mark for removal
      handleOptionsPayloadChange(key, null);
      setPendingImageFiles((prev) => {
        if (prev[key] && prev[key] !== null) {
          URL.revokeObjectURL(prev[key]!.tempUrl);
        }
        return {
          ...prev,
          [key]: null,
        };
      });
      setResolvedImages((prev) => {
        const newResolved = { ...prev };
        delete newResolved[key];
        return newResolved;
      });
    },
    [handleOptionsPayloadChange]
  );

  const handleAddOptionPayloadField = useCallback(() => {
    const newKey = `newField${Object.keys(localResource?.optionsPayload || {}).length}`;
    handleOptionsPayloadChange(newKey, "");
  }, [localResource?.optionsPayload, handleOptionsPayloadChange]);

  const handleRemoveOptionPayloadField = useCallback((key: string) => {
    setLocalResource((prev) => {
      const newOptionsPayload = { ...prev.optionsPayload };
      delete newOptionsPayload[key];
      return { ...prev, optionsPayload: newOptionsPayload };
    });
    setDateTimeState((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    setPendingImageFiles((prev) => {
      const newPending = { ...prev };
      if (newPending[key] && newPending[key] !== null) {
        URL.revokeObjectURL(newPending[key]!.tempUrl);
      }
      delete newPending[key];
      return newPending;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
    setUnsavedChanges(true);
  }, []);

  const validateFields = useCallback(() => {
    if (!resourceSetting) return true;
    const newErrors: { [key: string]: string } = {};

    if (!localResource.title || localResource.title.trim() === "") {
      newErrors.title = "Title is required";
    }
    if (!localResource.slug || localResource.slug.trim() === "") {
      newErrors.slug = "Slug is required";
    }
    //if (!localResource.oneliner || localResource.oneliner.trim() === "") {
    //  newErrors.oneliner = "Oneliner is required";
    //}

    Object.entries(resourceSetting).forEach(([key, setting]) => {
      const value = localResource.optionsPayload[key];
      const pending = pendingImageFiles[key];
      const effectiveValue = pending !== undefined ? (pending ? pending.file : null) : value;

      if (!setting.optional && (effectiveValue === undefined || effectiveValue === null)) {
        newErrors[key] = "This field is required";
      }
      if (setting.type === "image" && value && typeof value !== "string") {
        newErrors[key] = "Invalid image reference";
      }
      if (
        setting.type === "string" &&
        setting.maxTextLength &&
        typeof value === "string" &&
        value.length > setting.maxTextLength
      ) {
        newErrors[key] = `Max length is ${setting.maxTextLength}`;
      }
      if (setting.type === "number" && typeof value === "number") {
        if (setting.minNumber !== undefined && value < setting.minNumber) {
          newErrors[key] = `Minimum value is ${setting.minNumber}`;
        }
        if (setting.maxNumber !== undefined && value > setting.maxNumber) {
          newErrors[key] = `Maximum value is ${setting.maxNumber}`;
        }
      }
      if (setting.type === "string" && setting.isUrl && typeof value === "string" && value) {
        try {
          new URL(value);
        } catch {
          newErrors[key] = "Invalid URL";
        }
      }
      if (
        setting.type === "string" &&
        setting.belongsToCategory &&
        typeof value === "string" &&
        value
      ) {
        const validSlugs = contentMap
          .filter(isResourceContentMap)
          .filter((item) => item.categorySlug === setting.belongsToCategory)
          .map((item) => item.slug);
        if (!validSlugs.includes(value)) {
          newErrors[key] = "Invalid resource slug";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [resourceSetting, localResource.optionsPayload, contentMap, pendingImageFiles]);

  const handleSave = useCallback(async () => {
    if (!unsavedChanges || isSaving) return;
    const isValid = validateFields();
    if (!isValid) return;

    try {
      setIsSaving(true);

      // First save the resource to get an ID if creating
      let resourceId = localResource.id;
      if (create) {
        const response = await fetch("/api/turso/upsertResourceNode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localResource),
        });

        if (!response.ok) {
          throw new Error(`Failed to create resource: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to create resource");
        }
        resourceId = localResource.id; // We already set it with ulid()
      }

      // Process pending images
      const updatedOptionsPayload = { ...localResource.optionsPayload };

      for (const [key, pending] of Object.entries(pendingImageFiles)) {
        if (pending === null) {
          // Remove image
          updatedOptionsPayload[key] = null;
        } else if (pending) {
          // Upload new image
          setProcessingImages((prev) => new Set(prev).add(key));
          try {
            const result = await processResourceImage(
              pending.file,
              resourceId,
              localResource.title
            );
            if (result.success) {
              updatedOptionsPayload[key] = result.fileId;
            } else {
              throw new Error(`Failed to upload image for ${key}`);
            }
          } finally {
            setProcessingImages((prev) => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
          }
        }
      }

      // Save the resource with updated options
      const resourceToSave = { ...localResource, optionsPayload: updatedOptionsPayload };
      const response = await fetch("/api/turso/upsertResourceNode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourceToSave),
      });

      if (!response.ok) {
        throw new Error(`Failed to save resource changes: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save resource changes");
      }

      // Cleanup temp URLs
      Object.values(pendingImageFiles).forEach((pending) => {
        if (pending && pending.tempUrl) {
          URL.revokeObjectURL(pending.tempUrl);
        }
      });
      setPendingImageFiles({});
      setUnsavedChanges(false);

      if (create) {
        navigate(`/storykeep/content/resources/${localResource.slug}`);
      } else {
        // Reload the page to ensure data accuracy
        window.location.reload();
      }
    } catch (error) {
      console.error("Error saving resource:", error);
      setErrors({ save: error instanceof Error ? error.message : "Failed to save resource" });
    } finally {
      setIsSaving(false);
    }
  }, [localResource, create, unsavedChanges, isSaving, validateFields, pendingImageFiles]);

  const handleCancel = useCallback(() => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        navigate(`/storykeep`);
      }
    } else {
      navigate(`/storykeep`);
    }
  }, [unsavedChanges]);

  const categoryCollection = useMemo(
    () => createListCollection({ items: Object.keys(knownResources) }),
    [knownResources]
  );

  const renderOptionField = useMemo(
    () => (key: string, value: any) => {
      const setting = resourceSetting && resourceSetting[key];
      const type = setting ? setting.type : typeof value;
      const isRequired = setting ? !setting.optional : false;
      const errorId = errors[key] ? `error-${key}` : undefined;
      const isProcessing = processingImages.has(key);

      if (type === "image") {
        const pending = pendingImageFiles[key];
        const imageToShow =
          pending !== undefined
            ? pending
              ? pending.tempUrl
              : null
            : resolvedImages[key]
              ? resolvedImages[key]!.src
              : null;

        return (
          <div className="space-y-2">
            <label htmlFor={key} className="hidden text-sm font-bold text-gray-800">
              {key}
            </label>
            <ResourceImageUpload
              imageToShow={imageToShow}
              imageSrcSet={resolvedImages[key]?.srcSet}
              onFileSelect={(file) => handleImageChange(key, file)}
              onRemove={() => handleImageRemove(key)}
              isProcessing={isProcessing}
            />
            {errors[key] && (
              <span id={errorId} className="text-red-600 text-sm" role="alert">
                {errors[key]}
              </span>
            )}
          </div>
        );
      }

      switch (type) {
        case "boolean":
          return (
            <Switch.Root
              checked={value}
              onCheckedChange={(details) => handleOptionsPayloadChange(key, details.checked)}
              aria-required={isRequired}
              aria-invalid={!!errors[key]}
              aria-describedby={errorId}
            >
              <Switch.Label className="hidden">{key}</Switch.Label>
              <Switch.Control
                className={`${
                  value ? "bg-cyan-700" : "bg-gray-300"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2`}
              >
                <Switch.Thumb
                  className={`${
                    value ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch.Control>
              <Switch.HiddenInput />
            </Switch.Root>
          );
        case "date": {
          const dateTime = dateTimeState[key] || "";
          return (
            <div className="space-y-2">
              <label htmlFor={key} className="hidden text-sm font-bold text-gray-800">
                {key}
              </label>
              <input
                type="datetime-local"
                id={key}
                value={dateTime}
                onChange={(e) => handleDateTimeChange(key, e.target.value)}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                aria-required={isRequired}
                aria-invalid={!!errors[key]}
                aria-describedby={errorId}
              />
              {errors[key] && (
                <span id={errorId} className="text-red-600 text-sm" role="alert">
                  {errors[key]}
                </span>
              )}
            </div>
          );
        }
        case "number": {
          const numericValue =
            typeof value === "number" ? value : Number(setting?.defaultValue) || 0;
          return (
            <div className="space-y-2">
              <label htmlFor={key} className="hidden text-sm font-bold text-gray-800">
                {key}
              </label>
              <input
                type="number"
                id={key}
                value={numericValue}
                onChange={(e) => handleOptionsPayloadChange(key, Number(e.target.value))}
                min={setting?.minNumber}
                max={setting?.maxNumber}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                aria-required={isRequired}
                aria-invalid={!!errors[key]}
                aria-describedby={errorId}
              />
              {setting?.minNumber !== undefined && setting?.maxNumber !== undefined && (
                <Slider.Root
                  min={setting.minNumber}
                  max={setting.maxNumber}
                  value={[numericValue]}
                  onValueChange={(details) => handleOptionsPayloadChange(key, details.value[0])}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0}>
                      <Slider.HiddenInput />
                    </Slider.Thumb>
                  </Slider.Control>
                </Slider.Root>
              )}
              {errors[key] && (
                <span id={errorId} className="text-red-600 text-sm" role="alert">
                  {errors[key]}
                </span>
              )}
            </div>
          );
        }
        case "string":
          if (setting?.belongsToCategory) {
            const options = contentMap
              .filter(isResourceContentMap)
              .filter((item) => item.categorySlug === setting.belongsToCategory)
              .map((item) => ({ slug: item.slug, title: item.title }));
            const collection = createListCollection({ items: options.map((opt) => opt.slug) });
            const selectId = `select-${key}`;
            return (
              <div className="space-y-2 w-full">
                <label htmlFor={selectId} className="hidden text-sm font-bold text-gray-800">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <Select.Root
                  id={selectId}
                  value={[value ?? ""]}
                  onValueChange={(details) => handleOptionsPayloadChange(key, details.value[0])}
                  collection={collection}
                  aria-required={isRequired}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errorId}
                  className="w-full"
                >
                  <Select.Control className="w-full max-w-96">
                    <Select.Trigger className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm">
                      <Select.ValueText placeholder={`Select ${key}`}>
                        {options.find((opt) => opt.slug === value)?.title || `Select ${key}`}
                      </Select.ValueText>
                    </Select.Trigger>
                    {(!resourceSetting || !(key in resourceSetting)) && (
                      <Select.ClearTrigger className="text-gray-500 hover:text-gray-700">
                        Clear
                      </Select.ClearTrigger>
                    )}
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
                          {options.map((option) => (
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
                                    display: value === option.slug ? "block" : "none",
                                    color: "#155E75",
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
                {errors[key] && (
                  <span id={errorId} className="text-red-600 text-sm" role="alert">
                    {errors[key]}
                  </span>
                )}
              </div>
            );
          }
        default:
          return (
            <div className="space-y-2">
              <label htmlFor={key} className="hidden text-sm font-bold text-gray-800">
                {key}
              </label>
              <input
                type="text"
                id={key}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) => handleOptionsPayloadChange(key, e.target.value)}
                maxLength={setting?.maxTextLength}
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                aria-required={isRequired}
                aria-invalid={!!errors[key]}
                aria-describedby={errorId}
              />
              {errors[key] && (
                <span id={errorId} className="text-red-600 text-sm" role="alert">
                  {errors[key]}
                </span>
              )}
            </div>
          );
      }
    },
    [
      resourceSetting,
      handleOptionsPayloadChange,
      errors,
      dateTimeState,
      handleDateTimeChange,
      contentMap,
      pendingImageFiles,
      handleImageChange,
      handleImageRemove,
      processingImages,
      localResource.optionsPayload,
      resolvedImages,
    ]
  );

  return (
    <div className="p-0.5 shadow-md mx-auto max-w-screen-xl">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          {create ? "Create Resource" : "Edit Resource"}
        </h3>

        <div className="space-y-6 max-w-screen-xl mx-auto">
          {isBulkMode ? (
            <ResourceBulkIngest
              category={localResource.category || ""}
              resourceSetting={resourceSetting}
              onSave={handleBulkSave}
              onCancel={() => setIsBulkMode(false)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {["title", "slug"].map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-bold text-gray-800">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      type="text"
                      id={field}
                      disabled={!create}
                      value={localResource[field as keyof ResourceNode] || ""}
                      onChange={(e) => handleChange(field as keyof ResourceNode, e.target.value)}
                      className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="category" className="block text-sm font-bold text-gray-800">
                    Category
                  </label>
                  {create ? (
                    <Select.Root
                      id="category"
                      value={[localResource.category || ""]}
                      onValueChange={(details) => handleChange("category", details.value[0])}
                      collection={categoryCollection}
                      className="w-full"
                    >
                      <Select.Control className="w-full max-w-96">
                        <Select.Trigger className="w-full p-2 rounded-md border border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm">
                          <Select.ValueText placeholder="Select category" />
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
                              {Object.keys(knownResources).map((option) => (
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
                                        display:
                                          localResource.category === option ? "block" : "none",
                                        color: "#155E75",
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
                    <input
                      type="text"
                      id="category"
                      value={localResource.category || ""}
                      disabled
                      className="mt-1 block w-full p-2 rounded-md border-gray-300 bg-gray-100 sm:text-sm"
                      aria-disabled="true"
                    />
                  )}
                </div>
                {["oneliner"].map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="block text-sm font-bold text-gray-800">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      type="text"
                      id={field}
                      value={localResource[field as keyof ResourceNode] || ""}
                      onChange={(e) => handleChange(field as keyof ResourceNode, e.target.value)}
                      className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-cyan-700 focus:ring-cyan-700 sm:text-sm"
                    />
                  </div>
                ))}

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-800">Options Payload</h4>
                  {Object.entries(localResource?.optionsPayload || {}).map(([key, value]) => (
                    <div key={key} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center space-x-2">
                        {resourceSetting && key in resourceSetting ? (
                          <span className="w-1/3 text-base text-gray-800">{key}</span>
                        ) : (
                          <EditableKey originalKey={key} onKeyChange={handleKeyChange} />
                        )}
                        {renderOptionField(key, value)}
                        {(!resourceSetting || !(key in resourceSetting)) && (
                          <button
                            onClick={() => handleRemoveOptionPayloadField(key)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label={`Remove ${key} field`}
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddOptionPayloadField}
                    className="flex items-center text-cyan-700 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Add new field"
                  >
                    <svg
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Field
                  </button>
                </div>
              </div>
            </>
          )}

          {errors.save && (
            <div className="p-4 bg-red-50 text-red-800 rounded-md">{errors.save}</div>
          )}
          {create && (
            <div className="mb-4">
              <button
                onClick={() => setIsBulkMode(!isBulkMode)}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {isBulkMode ? "Single Entry Mode" : "Bulk Ingest"}
              </button>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {unsavedChanges ? "Cancel" : "Close"}
            </button>
            {unsavedChanges && (
              <button
                onClick={handleSave}
                disabled={
                  isSaving ||
                  Object.keys(errors).length > 0 ||
                  !localResource.title ||
                  !localResource.slug
                }
                className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
