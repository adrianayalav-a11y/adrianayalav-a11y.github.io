"""Builds the HTML pages from content/*.md. Run: python3 build.py  (needs: pip install markdown)"""
import markdown, pathlib, re
ROOT = pathlib.Path(__file__).parent
NAV = [("Home","index.html"),("About","about.html"),("Projects","projects/index.html"),("Contact","contact.html")]

def page(title, body, depth):
    up = "../" * depth
    nav = "".join(f'<a href="{up}{h}">{n}</a>' for n, h in NAV)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | Adrian Ayala</title>
<link rel="stylesheet" href="{up}assets/css/style.css"></head>
<body><header><a class="brand" href="{up}index.html">Adrian Ayala</a><nav>{nav}</nav></header>
<main>{body}</main>
<footer>&copy; 2026 Adrian Ayala &middot; <a href="https://www.linkedin.com/in/adrian-ayala-32077923b">LinkedIn</a> &middot; Built with plain HTML/CSS, hosted on GitHub Pages</footer>
</body></html>"""

def wrapSections(html, rel, depth):
    """Layout only, no wording changes: split the page at each <h2> into its own <section>
    (one idea per section). The part before the first <h2> becomes the 'intro'.
    On the home page the intro becomes a hero: text on one side, the crater map on the other."""
    up = "../" * depth
    parts = re.split(r"(?=<h2>)", html)
    intro, rest = parts[0], parts[1:]
    if str(rel) == "index.html":
        # Profile photo goes beside the text only if the file exists; otherwise the hero is text-only.
        photo = ROOT/"assets/img/headshot.jpg"
        heroImage = (f'<img class="heroImage" src="{up}assets/img/headshot.jpg" alt="Adrian Ayala">'
                     if photo.exists() else "")
        heroClass = "hero" if heroImage else "hero heroTextOnly"
        intro = f'<section class="{heroClass}"><div class="heroText">{intro}</div>{heroImage}</section>'
    else:
        intro = f'<section class="intro">{intro}</section>'
    return intro + "".join(f'<section class="block">{part}</section>' for part in rest)

for md in sorted((ROOT/"content").rglob("*.md")):
    rel = md.relative_to(ROOT/"content").with_suffix(".html")
    out = ROOT/rel; out.parent.mkdir(parents=True, exist_ok=True)
    text = md.read_text()
    # python-markdown needs a blank line before a list, and "  " to keep stacked bold lines apart
    lines, fixed = text.split("\n"), []
    for i, line in enumerate(lines):
        prev = fixed[-1] if fixed else ""
        isList = re.match(r"(- |\d+\. )", line)
        if isList and prev.strip() and not re.match(r"(- |\d+\. |  )", prev):
            fixed.append("")
        if line.startswith("**") and prev.startswith("**"):
            fixed[-1] = prev + "  "
        fixed.append(line)
    text = "\n".join(fixed)
    title = re.search(r"^# (.+)$", text, re.M).group(1)
    html = markdown.markdown(text, extensions=["tables"])
    # Resume button shows only if assets/resume.pdf exists when you run the build
    if not (ROOT/"assets/resume.pdf").exists():
        html = re.sub(r'<p><a class="button" href="[./]*assets/resume.pdf">Download resume</a></p>\s*', "", html)
    html = wrapSections(html, rel, len(rel.parts)-1)
    out.write_text(page(title, html, len(rel.parts)-1))
    print("built", rel)
