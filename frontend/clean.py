import os

def clean_dir(d):
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.json', '.css', '.html')):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                if content.endswith('\\n'):
                    content = content[:-2]
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(content)

clean_dir('.')
