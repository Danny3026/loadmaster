import os
for root, dirs, files in os.walk('frontend/src'):
  for f in files:
    if f.endswith(('.tsx', '.ts')):
      p = os.path.join(root, f)
      with open(p, 'r', encoding='utf-8') as file: c = file.read()
      c = c.replace('\\n', '')
      with open(p, 'w', encoding='utf-8') as file: file.write(c)
