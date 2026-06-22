import os
import re

def find_vietnamese_strings(directory):
    pattern = re.compile(r'[\u00C0-\u1EF9]+')
    out = open('vi_strings_utf8.txt', 'w', encoding='utf-8')
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        
                    for i, line in enumerate(lines):
                        if pattern.search(line):
                            out.write(f"{path}:{i+1}:{line.strip()}\n")
                except Exception as e:
                    pass
    out.close()

find_vietnamese_strings('frontend/src')
