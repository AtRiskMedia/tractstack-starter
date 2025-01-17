#!/usr/bin/env python3
from pathlib import Path
import json
import re

def find_classes(content):
    """Find anything that looks like a Tailwind class."""
    classes = set()
    
    patterns = [
        r'className=["\']([^"\']+)["\']',
        r'className={["\']([^"\']+)["\']',
        r'className={`([^`]+)`}',
        r'class=["\']([^"\']+)["\']',
        r'(?:const|let|var)\s+\w+\s*=\s*["\']([^"\']+)["\']',
        r'(?:const|let|var)\s+\w+\s*=\s*`([^`]+)`',
        r'@apply\s+([^;]+);'
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            parts = re.split(r'\s+|\$\{[^}]+\}', match.group(1))
            for part in parts:
                part = part.strip('"\';,`{}>')
                if part:
                    classes.add(part)
    
    return classes

def is_valid_tailwind_class(cls):
    """Check if a string looks like a valid Tailwind class."""
    # Valid breakpoint prefixes that can contain capitals
    VALID_PREFIXES = ['sm:', 'md:', 'lg:', 'xl:', '2xl:', 'xs:']
    
    # If it starts with a valid prefix, check the rest of the string
    for prefix in VALID_PREFIXES:
        if cls.startswith(prefix):
            return not bool(re.search(r'[A-Z]', cls[len(prefix):]))
    
    # Special cases for specific Tailwind patterns that might contain brackets
    if cls.startswith(('after:', 'before:', 'hover:', 'focus:', 'active:', 'group-hover:', 'peer-hover:')):
        return not bool(re.search(r'[A-Z]', cls))
        
    # Check for any capitals in the string
    #return not bool(re.search(r'[A-Z]', cls))

def clean_classes(classes):
    """Clean up the class list."""
    clean = set()
    
    for cls in classes:
        # Skip strings containing capital letters
        if any(c.isupper() for c in cls):
            continue
            
        # Skip obvious non-classes
        if any(x in cls for x in ['<', '>', 'http', 'src=', '.js', '.ts', '.css']):
            continue
            
        # Skip if it looks like a file path
        if '/' in cls and not any(x in cls for x in ['-', '/']):
            continue
            
        # Skip if it's clearly a React/HTML attribute
        if cls.startswith(('className=', 'class=', 'key=', 'id=', 'src=', 'href=')):
            continue
            
        # Skip empty or very short strings
        if len(cls) < 2:
            continue
            
        clean.add(cls)
    
    return clean

def main():
    script_dir = Path(__file__).resolve().parent.parent
    source_dir = script_dir / 'playground' / 'src'
    output_file = script_dir / 'playground' / 'config' / 'tailwindWhitelist.json'
    
    print(f"🔍 Scanning directory: {source_dir}")
    
    all_classes = set()
    file_patterns = ['*.tsx', '*.jsx', '*.ts', '*.js', '*.astro', '*.vue', '*.html']
    
    for pattern in file_patterns:
        for file_path in source_dir.rglob(pattern):
            print(f"Processing: {file_path}")
            try:
                content = file_path.read_text()
                classes = find_classes(content)
                all_classes.update(classes)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")
    
    # Clean up classes
    clean_classes_set = clean_classes(all_classes)
    
    # Sort classes for readability
    sorted_classes = sorted(list(clean_classes_set))
    
    # Save results
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump({"safelist": sorted_classes}, f, indent=2)
    
    print(f"\n✅ Found {len(sorted_classes)} unique Tailwind classes")
    print(f"📝 Results saved to: {output_file}")
    print("\n✨ Done!")

if __name__ == "__main__":
    main()
