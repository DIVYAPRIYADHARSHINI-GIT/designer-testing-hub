// macOS-only PDF check via JXA + PDFKit (built in, no installs):
//   osascript -l JavaScript tests/tools/pdfcheck.js file.pdf outdir
// Prints page count, title, every link annotation with the text under it,
// and renders each page to PNG for a visual layout check.
ObjC.import('PDFKit');
ObjC.import('AppKit');
function run(argv) {
  const path = argv[0], out = argv[1];
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(path));
  if (!doc || doc.isNil()) return 'ERROR cannot open ' + path;
  $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(out, true, $(), $());
  const base = path.split('/').pop().replace(/\.pdf$/, '');
  const lines = [];
  const attrs = doc.documentAttributes;
  lines.push('pages=' + doc.pageCount + ' title=' + ObjC.unwrap(attrs.objectForKey('Title')) + ' author=' + ObjC.unwrap(attrs.objectForKey('Author')));
  let links = 0;
  for (let i = 0; i < doc.pageCount; i++) {
    const page = doc.pageAtIndex(i);
    const anns = page.annotations;
    for (let j = 0; j < anns.count; j++) {
      const a = anns.objectAtIndex(j);
      if (ObjC.unwrap(a.type) !== 'Link') continue;
      links++;
      const act = a.action;
      let url = '?';
      if (act && !act.isNil() && act.respondsToSelector('URL')) url = ObjC.unwrap(act.URL.absoluteString);
      const sel = page.selectionForRect(a.bounds);
      const txt = sel && !sel.isNil() ? ObjC.unwrap(sel.string) : '';
      lines.push('link p' + (i + 1) + ' [' + String(txt).replace(/\s+/g, ' ').trim() + '] -> ' + url);
    }
    if (out) {
      const r = page.boundsForBox($.kPDFDisplayBoxMediaBox);
      const s = 1.5, w = r.size.width * s, h = r.size.height * s;
      const img = page.thumbnailOfSizeForBox($.NSMakeSize(w, h), $.kPDFDisplayBoxMediaBox);
      const rep = $.NSBitmapImageRep.imageRepWithData(img.TIFFRepresentation);
      const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
      png.writeToFileAtomically(out + '/' + base + '-p' + (i + 1) + '.png', true);
    }
  }
  lines.push('links=' + links);
  return lines.join('\n');
}
