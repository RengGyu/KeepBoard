import Foundation
import PDFKit
import AppKit
let args=CommandLine.arguments
for path in args.dropFirst() {
 guard let pdf=PDFDocument(url:URL(fileURLWithPath:path)) else { print("UNREADABLE \(path)"); continue }
 var parts:[String]=[]
 for n in 0..<pdf.pageCount { parts.append("\n=== PDF PAGE \(n+1) ===\n"+(pdf.page(at:n)?.string ?? "")) }
 let out=URL(fileURLWithPath:path).deletingPathExtension().appendingPathExtension("txt")
 try parts.joined().write(to:out,atomically:true,encoding:.utf8)
 print("\(path): \(pdf.pageCount) pages")
}
