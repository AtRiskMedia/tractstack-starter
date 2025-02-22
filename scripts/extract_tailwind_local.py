#!/usr/bin/env python3

import os
import re
from pathlib import Path
from typing import Set, List
import json
from collections import Counter

class TailwindScanner:
    def __init__(self, extensions: List[str] = None):
        self.extensions = extensions or ['.js', '.jsx', '.tsx', '.ts', '.astro', '.html', '.vue', '.svelte']
        self.patterns = [
            r'className=["\']([^"\']*)["\']',
            r'class=["\']([^"\']*)["\']',
            r'"([^"]*)"', r'\'([^\']*)\'',
            r'`([^`]*)`',
            r'classList\.add\(["\']([^"\']*)["\']',
            r'classList\.toggle\(["\']([^"\']*)["\']',
            r'twMerge\(["\']([^"\']*)["\']',
            r'clsx\({[^}]*["\']([^"\']*)["\']',
            r'cn\({[^}]*["\']([^"\']*)["\']',
            r'class:list=\{?\[?["\']([^"\']*)["\']'
        ]

    def extract_classes_from_line(self, line: str) -> Set[str]:
        classes = set()
        for pattern in self.patterns:
            matches = re.finditer(pattern, line)
            for match in matches:
                class_string = match.group(1)
                if '${' in class_string:
                    continue
                line_classes = [c.strip() for c in class_string.split() if c.strip()]
                classes.update(line_classes)
        template_matches = re.finditer(r'`([^`]*)`', line)
        for match in template_matches:
            template_content = match.group(1)
            if '${' not in template_content:
                classes.update(template_content.split())
        return classes

    def scan_file(self, filepath: str) -> Set[str]:
        classes = set()
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                for line in file:
                    line_classes = self.extract_classes_from_line(line)
                    classes.update(line_classes)
        except Exception as e:
            print(f"Error processing {filepath}: {str(e)}")
        return classes

    def scan_directory(self, directory: str, exclude_dirs: List[str] = None) -> dict:
        exclude_dirs = exclude_dirs or ['node_modules', 'dist', 'build', '.git']
        all_classes = set()
        file_classes = {}
        class_frequency = Counter()

        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if Path(file).suffix in self.extensions:
                    filepath = os.path.join(root, file)
                    file_classes[filepath] = self.scan_file(filepath)
                    all_classes.update(file_classes[filepath])
                    class_frequency.update(file_classes[filepath])

        return {
            'all_classes': list(all_classes),
            'file_classes': {k: list(v) for k, v in file_classes.items()},
            'class_frequency': dict(class_frequency)
        }

    def save_results(self, results: dict, output_file: str):
        safelist = sorted(results['all_classes'])
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({"safelist": safelist}, f, indent=2)

def main():
    # Set paths relative to the script's location (./scripts/)
    script_dir = Path(__file__).parent  # ./scripts/
    source_dir = script_dir / '..' / 'playground' / 'src'  # ../playground/src/
    output_file = script_dir / '..' / 'playground' / 'config' / 'tailwindWhitelist.json'  # ../playground/config/

    # Create scanner
    scanner = TailwindScanner()

    # Configure directories to exclude
    exclude_dirs = ['node_modules', 'dist', 'build', '.git']

    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Run the scan
    results = scanner.scan_directory(str(source_dir), exclude_dirs)

    # Save results
    scanner.save_results(results, str(output_file))

    # Print summary
    print(f"Found {len(results['all_classes'])} unique Tailwind classes")
    print(f"Scanned {len(results['file_classes'])} files")
    print(f"Results saved to {output_file}")

    # Print top 10 most frequently used classes
    print("\nTop 10 most used classes:")
    for class_name, count in sorted(results['class_frequency'].items(),
                                   key=lambda x: x[1],
                                   reverse=True)[:10]:
        print(f"{class_name}: {count} times")

if __name__ == '__main__':
    main()
