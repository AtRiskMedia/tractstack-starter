import { useRef, useCallback, useEffect, useState } from "react";
import type { CSSProperties, KeyboardEvent, ClipboardEvent } from "react";

interface ContentEditableFieldProps {
  id: string;
  value: string;
  className?: string;
  onChange: (value: string) => boolean;
  onEditingChange: (editing: boolean) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean;
  placeholder?: string;
  style?: CSSProperties;
  hyphenate?: boolean;
  mode?: "hyphenate" | "codehook" | "belief" | null;
}

const ContentEditableField = ({
  id,
  value,
  onChange,
  onEditingChange,
  onKeyDown,
  className,
  placeholder = "",
  style = {},
  mode = null,
}: ContentEditableFieldProps) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const [internalValue, setInternalValue] = useState(value);
  const isInitialMount = useRef(true);
  const [editing, setEditing] = useState(false);

  const insertTextAtCursor = useCallback((text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      handleContentChange();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Handle custom keyDown handler if provided
      if (onKeyDown) {
        const shouldContinue = onKeyDown(event);
        if (!shouldContinue) {
          event.preventDefault();
          return false;
        }
      }

      // Default Enter prevention
      if (event.key === "Enter") {
        event.preventDefault();
        return false;
      }

      if (!mode) return;

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const currentOffset = range.startOffset;

      switch (mode) {
        case "hyphenate":
          if (event.key === " ") {
            event.preventDefault();
            if (currentOffset > 0) {
              insertTextAtCursor("-");
              return false;
            }
          } else if (event.key.length === 1 && event.key >= "A" && event.key <= "Z") {
            event.preventDefault();
            insertTextAtCursor(event.key.toLowerCase());
            return false;
          }
          break;

        case "codehook":
        case "belief":
          if (event.key === " " || event.key === "-" || event.key === "_") {
            event.preventDefault();
            return false;
          }

          // First character must be A-Z, force uppercase if a-z
          if (currentOffset === 0 && event.key.length === 1) {
            if (event.key >= "A" && event.key <= "Z") {
              return true;
            }
            if (event.key >= "a" && event.key <= "z") {
              event.preventDefault();
              insertTextAtCursor(event.key.toUpperCase());
              return false;
            }
            event.preventDefault();
            return false;
          }

          // After first char, allow a-z A-Z and numbers (for codehook only)
          if (event.key >= "0" && event.key <= "9") {
            return mode === "codehook";
          }

          break;
      }
    },
    [mode, onKeyDown, insertTextAtCursor]
  );

  const setCursorPosition = useCallback((element: HTMLElement, position: number) => {
    const range = document.createRange();
    const selection = window.getSelection();
    if (element.childNodes[0]) {
      range.setStart(
        element.childNodes[0],
        Math.min(position, element.childNodes[0].textContent?.length || 0)
      );
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  const handleContentChange = useCallback(() => {
    if (contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorPositionRef.current = range.startOffset;
      }
      const newValue = contentEditableRef.current.textContent || "";
      const isValid = onChange(newValue);
      if (isValid) {
        setInternalValue(newValue);
      } else {
        // Revert to the previous valid state
        contentEditableRef.current.textContent = internalValue;
        setCursorPosition(contentEditableRef.current, cursorPositionRef.current);
      }
    }
  }, [onChange, internalValue, setCursorPosition]);

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      const sanitizedText = text
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(sanitizedText));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger the change handler
        handleContentChange();
      }
    },
    [handleContentChange]
  );

  const handleFocus = useCallback(() => {
    onEditingChange?.(true);
  }, [onEditingChange]);

  const handleBlur = useCallback(() => {
    onEditingChange?.(false);
  }, [onEditingChange]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (contentEditableRef.current) {
        contentEditableRef.current.textContent = value;
      }
    } else if (contentEditableRef.current && value !== contentEditableRef.current.textContent) {
      contentEditableRef.current.textContent = value;
      setCursorPosition(contentEditableRef.current, cursorPositionRef.current);
    }
    setInternalValue(value);
  }, [value, setCursorPosition]);

  useEffect(() => {
    const handleBlur = () => {
      setTimeout(() => {
        setEditing(false);
        onEditingChange(false);
      }, 100); // 100ms delay
      // this is needed to prevent race in the isEditing helpful info pop-ups
    };

    const element = contentEditableRef.current;
    if (element) {
      element.addEventListener("blur", handleBlur);
    }

    return () => {
      if (element) {
        element.removeEventListener("blur", handleBlur);
      }
    };
  }, [onEditingChange]);

  return (
    <div
      id={id}
      ref={contentEditableRef}
      contentEditable
      onInput={handleContentChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      style={{
        ...style,
        minHeight: "1em",
        pointerEvents: editing ? "none" : "auto",
      }}
      className={className || ``}
      data-placeholder={placeholder}
      role="textbox"
      aria-labelledby={`${id}-label`}
    />
  );
};

export default ContentEditableField;
