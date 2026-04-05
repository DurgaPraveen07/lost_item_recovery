import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# The authPortal div begins with its comment
start_marker = "    <!-- Professional Dual-Login Portal -->"
end_marker = "    <div class=\"background-container\"></div>"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx != -1 and end_idx != -1:
    portal_html = text[start_idx:end_idx]
    
    # excise the portal
    text = text[:start_idx] + text[end_idx:]
    
    # find </nav>
    nav_end = text.find('    </nav>')
    if nav_end != -1:
        insert_point = nav_end + len('    </nav>')
        
        # insert right after </nav>
        text = text[:insert_point] + '\n\n' + portal_html + text[insert_point:]
        
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Moved successfully")
    else:
        print("nav end not found")
else:
    print("portal bounds not found")
