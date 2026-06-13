import sys
content = open('src/components/LandingPage.jsx', 'r', encoding='utf-8').read()
content = content.replace('  const { user } = useAuth();', '  const { user, loading } = useAuth();')
content = content.replace('  return (', '  if (loading) return null;\n\n  return (')
open('src/components/LandingPage.jsx', 'w', encoding='utf-8').write(content)
