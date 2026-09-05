import pathlib
import re

roots = [pathlib.Path('backend'), pathlib.Path('frontend/src')]
file_exts = {'.js', '.jsx'}


def describe(name: str) -> str:
    if not name:
        return 'runs the requested workflow.'
    if name[0].isupper():
        if name == 'App':
            return 'renders the main application shell.'
        if name in {'Header', 'Footer'}:
            return f'renders the {name.lower()} UI.'
        return f'implements the {name} workflow.'

    words = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', name).split()
    if not words:
        return 'runs the requested workflow.'

    first = words[0].lower()
    rest = ' '.join(words[1:]).lower()
    if first in {'get', 'fetch', 'load', 'read', 'find', 'list', 'show', 'view'}:
        target = rest or 'the requested data'
        return f'retrieves {target}.'
    if first in {'create', 'add', 'insert', 'register', 'make', 'submit'}:
        target = rest or 'a new item'
        return f'creates {target}.'
    if first in {'update', 'edit', 'modify', 'set', 'save'}:
        target = rest or 'the requested item'
        return f'updates {target}.'
    if first in {'remove', 'delete', 'clear', 'drop', 'cancel'}:
        target = rest or 'the requested item'
        return f'removes {target}.'
    if first in {'normalize', 'parse', 'format', 'sanitize', 'map', 'convert', 'resolve'}:
        target = rest or 'input values'
        return f'normalizes {target}.'
    if first in {'handle', 'process', 'run', 'execute', 'do'}:
        target = rest or 'the request flow'
        return f'handles {target}.'
    if first in {'calculate', 'compute'}:
        target = rest or 'the requested value'
        return f'calculates {target}.'
    if first in {'is', 'can', 'should', 'check', 'validate'}:
        target = rest or 'the requested condition'
        return f'checks whether {target}.'
    if first in {'open', 'close', 'go', 'scroll', 'toggle', 'switch'}:
        target = rest or 'the requested view'
        return f'opens or closes {target}.'
    if first in {'render', 'build'}:
        target = rest or 'the UI'
        return f'renders {target}.'
    if first in {'start', 'stop', 'launch'}:
        target = rest or 'the service'
        return f'starts {target}.'
    return f'implements the {name} workflow.'


for root in roots:
    if not root.exists():
        continue
    for path in sorted(root.rglob('*')):
        if path.is_file() and path.suffix.lower() in file_exts:
            text = path.read_text(encoding='utf-8')
            lines = text.splitlines()
            new_lines = []
            for line in lines:
                match = None
                if re.match(r'^\s*(const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)', line):
                    m = re.match(r'^(?P<indent>\s*)(?P<kind>const|let|var)\s+(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)', line)
                    if m:
                        match = m
                elif re.match(r'^\s*function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\(', line):
                    m = re.match(r'^(?P<indent>\s*)function\s+(?P<name>[A-Za-z_$][A-Za-z0-9_$]*)\s*\(', line)
                    if m:
                        match = m

                if match:
                    prev_line = new_lines[-1] if new_lines else ''
                    if not prev_line.strip().startswith('//') and not prev_line.strip().startswith('/*') and not prev_line.strip().startswith('*'):
                        new_lines.append(f"{match.group('indent')}// Process: {match.group('name')} - {describe(match.group('name'))}")
                new_lines.append(line)

            path.write_text('\n'.join(new_lines) + ('\n' if text.endswith('\n') else ''), encoding='utf-8')

print('Added process comments to backend and frontend source files.')
