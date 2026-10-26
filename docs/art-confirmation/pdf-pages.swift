import Foundation
import PDFKit
import AppKit
import Vision
let args=CommandLine.arguments
guard args.count == 3, let pdf=PDFDocument(url:URL(fileURLWithPath:args[1])) else {fatalError("file and comma-separated PDF page numbers required")}
let folder=URL(fileURLWithPath:args[1]).deletingLastPathComponent().appendingPathComponent("pages")
try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
let stem=URL(fileURLWithPath:args[1]).deletingPathExtension().lastPathComponent
for index in args[2].split(separator:",").compactMap({Int($0)}) {
 guard let page=pdf.page(at:index-1) else {continue}
 let image=page.thumbnail(of:NSSize(width:1500,height:1900),for:.mediaBox)
 guard let tiff=image.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) else {continue}
 let path=folder.appendingPathComponent(stem+"-p"+String(index))
 try png.write(to:path.appendingPathExtension("png"))
 let req=VNRecognizeTextRequest();req.recognitionLevel = .accurate;req.recognitionLanguages=["en-US"]
 do { try VNImageRequestHandler(data:png,options:[:]).perform([req]) }
 catch { print("OCR unavailable; rendered page remains available: \(error)") }
 let text=(req.results ?? []).compactMap{$0.topCandidates(1).first?.string}.joined(separator:"\n")
 try text.write(to:path.appendingPathExtension("txt"),atomically:true,encoding:.utf8)
 print(stem+" PDF page "+String(index)+": "+String(text.count)+" OCR characters")
}
