import Foundation
import PDFKit
let a=CommandLine.arguments
let pdf=PDFDocument(url: URL(fileURLWithPath:a[1]))!
var out=""
for i in 0..<pdf.pageCount {out += "\n=== PDF PAGE \(i+1) ===\n"+(pdf.page(at:i)?.string ?? "")}
try out.write(toFile:a[2],atomically:true,encoding:.utf8)
print("\(pdf.pageCount) pages")
