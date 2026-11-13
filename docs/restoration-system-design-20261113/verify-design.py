"""Verify design artifacts and read-only source evidence; no product execution."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
required = [
    "README.md", "problem-map.md", "evidence.md", "technical-design.md",
    "contracts.md", "walkthroughs.md", "validation-plan.md", "implementation-plan.md",
]
missing_docs = [name for name in required if not (HERE / name).is_file()]
broken_links = []
fence_errors = []
json_errors = []
links_checked = 0
for name in required:
    path = HERE / name
    if not path.exists():
        continue
    content = path.read_text()
    if sum(line.startswith("```") for line in content.splitlines()) % 2:
        fence_errors.append(name)
    for target in re.findall(r"\]\(([^)]+)\)", content):
        if target.startswith(("https://", "http://", "#")):
            continue
        target = re.sub(r":\d+$", "", target.split("#", 1)[0].strip("<>"))
        links_checked += 1
        if not (path.parent / target).exists():
            broken_links.append({"document": name, "target": target})
    for index, block in enumerate(re.findall(r"```json\n(.*?)\n```", content, re.S)):
        try:
            json.loads(block)
        except ValueError as error:
            json_errors.append({"document": name, "block": index, "error": str(error)})

manifest = json.loads((HERE / "source-manifest.json").read_text())
changed_sources = []
for name, expected in manifest.items():
    path = ROOT / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    if actual != expected:
        changed_sources.append(name)

def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)

contract_blocks = re.findall(r"```ts\n(.*?)\n```", (HERE / "contracts.md").read_text(), re.S)
with tempfile.TemporaryDirectory(prefix="keepboard-restoration-design-", dir="/private/tmp") as temp:
    example = Path(temp) / "contracts-example.ts"
    example.write_text("export {};\n" + "\n\n".join(contract_blocks) + "\n")
    compiler = ROOT / "node_modules/typescript/lib/typescript.js"
    node_script = """
const ts = require(process.argv[1]);
const program = ts.createProgram([process.argv[2]], {
  noEmit: true, strict: true, skipLibCheck: true, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext
});
const diagnostics = ts.getPreEmitDiagnostics(program);
console.log(JSON.stringify(diagnostics.map(d => ({
  code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\\n')
}))));
process.exitCode = diagnostics.length ? 1 : 0;
"""
    compiled = subprocess.run(
        ["node", "-e", node_script, str(compiler), str(example)],
        cwd=ROOT, text=True, capture_output=True,
    )
    contract_check = {
        "blocks": len(contract_blocks), "exitCode": compiled.returncode,
        "output": compiled.stdout.strip(), "stderr": compiled.stderr.strip(),
    }

product_diff = git("diff", "--name-only", "--", "src", "shared", "server", "gamepacks", "tools", "tests", "public", "game-photo-definitions")
report = {
    "purpose": "Design document consistency and immutable-source check only; no product tests/build/new reading.",
    "head": git("rev-parse", "HEAD").stdout.strip(),
    "requiredDocuments": len(required), "missingDocuments": missing_docs,
    "localLinksChecked": links_checked, "brokenLocalLinks": broken_links,
    "unbalancedFences": fence_errors, "invalidJSONExamples": json_errors,
    "contractTypeExamples": contract_check,
    "protectedFilesChecked": len(manifest), "changedProtectedFiles": changed_sources,
    "trackedProductDiff": product_diff.stdout.splitlines(),
    "gitStatus": git("status", "--short").stdout.splitlines(),
    "designFolderIgnored": git("check-ignore", str(HERE / "README.md")).returncode == 0,
}
report["passed"] = not (
    missing_docs or broken_links or fence_errors or json_errors or changed_sources
    or compiled.returncode or product_diff.returncode or report["trackedProductDiff"]
)
(HERE / "design-validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({key: report[key] for key in [
    "passed", "requiredDocuments", "localLinksChecked", "brokenLocalLinks",
    "contractTypeExamples", "protectedFilesChecked", "changedProtectedFiles",
    "trackedProductDiff", "designFolderIgnored",
]}, ensure_ascii=False))
