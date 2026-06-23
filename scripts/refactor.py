import os
import re
import shutil

src_dir = os.path.abspath('src')
modules_dir = os.path.join(src_dir, 'modules')
database_dir = os.path.join(src_dir, 'database')

# Create directories
os.makedirs(modules_dir, exist_ok=True)
os.makedirs(database_dir, exist_ok=True)

modules_list = [
    'ai-chat', 'auth', 'bookings', 'check-in', 'chemical-limits',
    'chemicals', 'combos', 'comments', 'community', 'courses',
    'equipment', 'investments', 'maintenance', 'notifications',
    'publications', 'ratings', 'reports', 'rooms', 'search',
    'settings', 'skill-badges', 'tasks', 'uploads', 'users', 'waitlists'
]

# Track old paths to new paths mapping
path_mapping = {}

# Old paths
old_prisma = os.path.join(src_dir, 'prisma').replace('\\', '/')
old_modules = {m: os.path.join(src_dir, m).replace('\\', '/') for m in modules_list}

# We move directories first, then process files. 
# BUT wait! We should compute paths based on the OLD structure.
# Let's map old absolute file paths (without extension) to new absolute file paths.

# Moving logic
if os.path.exists(os.path.join(src_dir, 'prisma')):
    shutil.move(os.path.join(src_dir, 'prisma'), os.path.join(database_dir, 'prisma'))

for m in modules_list:
    src_m = os.path.join(src_dir, m)
    if os.path.exists(src_m):
        shutil.move(src_m, os.path.join(modules_dir, m))

def get_new_absolute_path(old_abs_path):
    # old_abs_path is something like C:/.../src/users/users.module
    # we need to replace /src/users/ with /src/modules/users/
    
    # check prisma
    if '/src/prisma/' in old_abs_path or old_abs_path.endswith('/src/prisma'):
        return old_abs_path.replace('/src/prisma', '/src/database/prisma')
    
    # check modules
    for m in modules_list:
        if f'/src/{m}/' in old_abs_path or old_abs_path.endswith(f'/src/{m}'):
            return old_abs_path.replace(f'/src/{m}', f'/src/modules/{m}')
            
    return old_abs_path

def resolve_import(current_file_old_abs, import_path):
    if not import_path.startswith('.'):
        return import_path
    
    # Resolve relative to current_file_old_abs
    current_dir_old_abs = os.path.dirname(current_file_old_abs)
    target_old_abs = os.path.normpath(os.path.join(current_dir_old_abs, import_path)).replace('\\', '/')
    
    # Map target_old_abs to target_new_abs
    target_new_abs = get_new_absolute_path(target_old_abs)
    
    # current_file_new_abs
    current_file_new_abs = get_new_absolute_path(current_file_old_abs)
    current_dir_new_abs = os.path.dirname(current_file_new_abs)
    
    # Compute new relative path
    new_rel_path = os.path.relpath(target_new_abs, current_dir_new_abs).replace('\\', '/')
    if not new_rel_path.startswith('.'):
        new_rel_path = './' + new_rel_path
        
    return new_rel_path

import_regex = re.compile(r"((?:import|export)\s+.*?from\s+['\"])(.*?)(['\"])")

def process_ts_files(directory):
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith('.ts'):
                file_path = os.path.join(root, f)
                file_path_forward = file_path.replace('\\', '/')
                
                # To know its old path, we reverse the get_new_absolute_path logic.
                # Actually, the file is ALREADY moved. We can compute its OLD absolute path.
                old_abs_path = file_path_forward
                if '/src/database/prisma/' in old_abs_path:
                    old_abs_path = old_abs_path.replace('/src/database/prisma/', '/src/prisma/')
                else:
                    for m in modules_list:
                        if f'/src/modules/{m}/' in old_abs_path:
                            old_abs_path = old_abs_path.replace(f'/src/modules/{m}/', f'/src/{m}/')
                            break
                
                with open(file_path, 'r', encoding='utf-8') as f_in:
                    content = f_in.read()
                
                def repl(match):
                    prefix = match.group(1)
                    imp = match.group(2)
                    suffix = match.group(3)
                    new_imp = resolve_import(old_abs_path, imp)
                    return prefix + new_imp + suffix
                
                new_content = import_regex.sub(repl, content)
                
                # Also handle direct imports like import '../something'
                direct_import_regex = re.compile(r"(\bimport\s+['\"])(.*?)(['\"])")
                def repl_direct(match):
                    prefix = match.group(1)
                    imp = match.group(2)
                    suffix = match.group(3)
                    new_imp = resolve_import(old_abs_path, imp)
                    return prefix + new_imp + suffix
                    
                new_content = direct_import_regex.sub(repl_direct, new_content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f_out:
                        f_out.write(new_content)

process_ts_files(src_dir)
print("Refactoring completed.")
