import sys
content = open('authentication/views.py', 'r', encoding='utf-8').read()
content = content.replace('http://localhost:5173', 'https://cold-digger.vercel.app')
open('authentication/views.py', 'w', encoding='utf-8').write(content)
