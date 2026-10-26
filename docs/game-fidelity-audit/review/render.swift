import Foundation
import PDFKit
import AppKit
// Original PDFs stay read-only; contact pages are audit evidence, not game art.
let tasks = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
for task in tasks {
 let source=task["pdf"] as! String, prefix=task["prefix"] as! String
 guard let doc=PDFDocument(url:URL(fileURLWithPath:source)) else { print("UNREADABLE \(source)");continue }
 var text=""
 for i in 0..<doc.pageCount {text += "\n=== PDF PAGE \(i+1) ===\n" + (doc.page(at:i)?.string ?? "")}
 try text.write(toFile:prefix+".txt",atomically:true,encoding:.utf8)
 let pages=(task["pages"] as! [Int]).filter{$0>0 && $0<=doc.pageCount}
 let cellW=800,cellH=1100,w=1600,h=((pages.count+1)/2)*cellH
 guard let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:w,pixelsHigh:h,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0),let ctx=NSGraphicsContext(bitmapImageRep:bitmap) else {exit(2)}
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=ctx
 ctx.cgContext.setFillColor(NSColor.white.cgColor);ctx.cgContext.fill(CGRect(x:0,y:0,width:w,height:h))
 for (index,n) in pages.enumerated(){
  let page=doc.page(at:n-1)!,rect=page.bounds(for:.mediaBox),scale=min(CGFloat(cellW-20)/rect.width,CGFloat(cellH-40)/rect.height)
  let x=(index%2)*cellW,y=h-(index/2+1)*cellH
  ("PDF page \(n)" as NSString).draw(at:NSPoint(x:x+10,y:y+cellH-23),withAttributes:[.font:NSFont.systemFont(ofSize:16),.foregroundColor:NSColor.black])
  ctx.cgContext.saveGState();ctx.cgContext.translateBy(x:CGFloat(x+10),y:CGFloat(y+10));ctx.cgContext.scaleBy(x:scale,y:scale);page.draw(with:.mediaBox,to:ctx.cgContext);ctx.cgContext.restoreGState()
 }
 NSGraphicsContext.restoreGraphicsState()
 try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:prefix+".png"))
 print("\(source): \(doc.pageCount) pages; contact \(pages)")
}
