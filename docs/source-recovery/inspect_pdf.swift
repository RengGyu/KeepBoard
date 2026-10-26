// Uses the macOS PDFKit already on this machine; installs nothing.
// swift -module-cache-path <research cache> inspect_pdf.swift PDF OUTPUT_PREFIX [one-based pages...]
import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    fputs("Cannot decode PDF\n", stderr); exit(1)
}
let prefix = args[2]
var text = ""
for i in 0..<doc.pageCount {
    text += "\n\n=== PDF page \(i+1) ===\n" + (doc.page(at: i)?.string ?? "")
}
try text.write(toFile: prefix + ".txt", atomically: true, encoding: .utf8)
let attrs = doc.documentAttributes ?? [:]
let metadata = ["page_count": doc.pageCount, "attributes": attrs.reduce(into: [String: String]()) { $0[String(describing: $1.key)] = String(describing: $1.value) }] as [String: Any]
try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: prefix + ".metadata.json"))
for raw in args.dropFirst(3) {
    guard let n = Int(raw), n > 0, let page = doc.page(at: n-1) else { exit(2) }
    let rect = page.bounds(for: .mediaBox)
    let scale = min(2.0, 1600.0 / rect.width)
    let w = Int(ceil(rect.width * scale)), h = Int(ceil(rect.height * scale))
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
        let context = NSGraphicsContext(bitmapImageRep: bitmap) else { exit(3) }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.setFillColor(NSColor.white.cgColor)
    context.cgContext.fill(CGRect(x: 0, y: 0, width: w, height: h))
    context.cgContext.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context.cgContext)
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: prefix + "-p\(n).png"))
}
print("PDF decoded: \(doc.pageCount) pages; text, metadata and requested renders written.")
