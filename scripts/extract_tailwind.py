#!/usr/bin/env python3
import os
import re
from pathlib import Path
import json
from typing import Set, List
import argparse

# Common Tailwind prefixes to help identify valid classes
TAILWIND_PREFIXES = {
    'accent-', 'animate-', 'antialiased', 'appearance-', 'aspect-',
    'backdrop-', 'basis-', 'bg-', 'block', 'border', 'bottom-',
    'box-', 'break-', 'brightness-', 'capitalize', 'caret-',
    'clear-', 'clip-', 'col-', 'container', 'content-', 'contrast-',
    'cursor-', 'dark:', 'decoration-', 'delay-', 'divide-', 'drop-',
    'duration-', 'ease-', 'end-', 'fill-', 'filter', 'fixed', 'flex',
    'float-', 'flow-', 'focus:', 'font-', 'gap-', 'gradient-', 'grid-',
    'grow', 'h-', 'hidden', 'highlight-', 'hover:', 'hue-', 'indent-',
    'inline', 'inset-', 'invert-', 'invisible', 'isolate', 'italic',
    'items-', 'justify-', 'leading-', 'left-', 'lg:', 'line-', 'list-',
    'm-', 'max-', 'md:', 'min-', 'mix-', 'motion-', 'normal-', 'object-',
    'opacity-', 'order-', 'origin-', 'outline-', 'overflow-', 'overscroll-',
    'p-', 'place-', 'placeholder-', 'pointer-events-', 'position-',
    'preset-', 'print:', 'prose-', 'relative', 'resize-', 'right-',
    'ring-', 'rotate-', 'rounded', 'row-', 'saturate-', 'scale-',
    'scroll-', 'select-', 'self-', 'sepia-', 'shadow', 'shrink',
    'skew-', 'sm:', 'snap-', 'space-', 'sr-', 'start-', 'static',
    'sticky', 'stroke-', 'table-', 'tap-', 'text-', 'top-', 'touch-',
    'transform', 'transition-', 'translate-', 'truncate', 'underline',
    'uppercase', 'visible', 'w-', 'whitespace-', 'will-change-', 'xl:',
    'xs:', 'z-', '2xl:', 'active:', 'disabled:', 'enabled:', 'first:',
    'last:', 'odd:', 'even:', 'visited:', 'checked:', 'indeterminate:',
    'default:', 'required:', 'valid:', 'invalid:', 'in-range:',
    'out-of-range:', 'placeholder-shown:', 'autofill:', 'read-only:',
    'before:', 'after:', 'marker:', 'file:', 'selection:', 'first-line:',
    'first-letter:', 'backdrop:'
}

class TailwindExtractor:
    def __init__(self, source_dir: str, output_file: str):
        self.source_dir = Path(source_dir)
        self.output_file = Path(output_file)
        self.file_patterns = ['*.astro', '*.jsx', '*.tsx', '*.js', '*.ts', 
                            '*.vue', '*.html', '*.svelte']
        
    def is_likely_tailwind_class(self, class_name: str) -> bool:
        """Check if a string looks like a Tailwind class."""
        return any(class_name.startswith(prefix) for prefix in TAILWIND_PREFIXES) or \
               any(modifier + class_name in TAILWIND_PREFIXES for modifier in ['hover:', 'focus:', 'active:'])

    def extract_from_file(self, file_path: Path) -> Set[str]:
        """Extract potential Tailwind classes from a single file."""
        classes = set()
        content = file_path.read_text(encoding='utf-8')
        
        # Pattern 1: class="..." or className="..."
        class_pattern = r'class(?:Name)?=["\']([^"\']+)["\']'
        for match in re.finditer(class_pattern, content):
            classes.update(match.group(1).split())
        
        # Pattern 2: Template literals with classes
        template_pattern = r'`([^`]+)`'
        for match in re.finditer(template_pattern, content):
            potential_classes = re.findall(r'[\w-]+', match.group(1))
            classes.update(cls for cls in potential_classes if self.is_likely_tailwind_class(cls))
        
        # Pattern 3: Tailwind @apply directives
        apply_pattern = r'@apply\s+([^;]+);'
        for match in re.finditer(apply_pattern, content):
            classes.update(match.group(1).split())
        
        # Pattern 4: Dynamic classes
        dynamic_pattern = r'\${([^}]+)}'
        for match in re.finditer(dynamic_pattern, content):
            potential_classes = re.findall(r'[\w-]+', match.group(1))
            classes.update(cls for cls in potential_classes if self.is_likely_tailwind_class(cls))
        
        return classes

    def extract_all_classes(self) -> List[str]:
        """Extract Tailwind classes from all matching files."""
        all_classes = set()
        
        for pattern in self.file_patterns:
            for file_path in self.source_dir.rglob(pattern):
                print(f"Processing: {file_path}")
                try:
                    file_classes = self.extract_from_file(file_path)
                    all_classes.update(file_classes)
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
        
        return sorted(list(all_classes))

    def save_results(self, classes: List[str]):
        """Save results as JSON."""
        # Create output directory if it doesn't exist
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save as JSON file
        with open(self.output_file, 'w') as f:
            json.dump({"safelist": classes}, f, indent=2)

def main():
    # Get the project root directory (where the script is located)
    script_dir = Path(__file__).resolve().parent.parent
    
    # Define paths relative to project root
    source_dir = script_dir / 'playground' / 'src'
    output_file = script_dir / 'playground' / 'config' / 'tailwindWhitelist.json'
    
    print(f"🔍 Scanning directory: {source_dir}")
    
    extractor = TailwindExtractor(source_dir, output_file)
    classes = extractor.extract_all_classes()
    extractor.save_results(classes)
    
    print(f"\n✅ Found {len(classes)} unique Tailwind classes")
    print(f"📝 Results saved to: {output_file}")
    print("\n✨ Done!")

if __name__ == "__main__":
    main()
