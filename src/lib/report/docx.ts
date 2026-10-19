// Dependency-free DOCX writer: WordprocessingML for the same report blocks,
// real external hyperlinks, bordered tables with repeating header rows,
// packed in a STORE (uncompressed) ZIP that Word, Pages and Google Docs open.
import type { Block, ReportDoc, Run, Tone } from './doc.ts';
import { cellRuns } from './doc.ts';

const TONE_HEX: Record<Tone, string> = { muted: '5F6670', accent: '1C3861', high: 'C21F24', medium: 'B36B00', low: '1F7A40' };

const xml = (s: string) =>
	(s ?? '')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

class Rels {
	list: string[] = [];
	link(url: string): string {
		const id = `rIdL${this.list.length + 1}`;
		this.list.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(url.trim())}" TargetMode="External"/>`);
		return id;
	}
}

function runXml(r: Run, opts: { size?: number; bold?: boolean } = {}): string {
	const props: string[] = [];
	if (r.bold || opts.bold) props.push('<w:b/>');
	if (r.italic) props.push('<w:i/>');
	if (r.link) props.push('<w:color w:val="1155CC"/><w:u w:val="single"/>');
	else if (r.tone) props.push(`<w:color w:val="${TONE_HEX[r.tone]}"/>`);
	if (opts.size) props.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
	const rpr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
	return (r.text ?? '')
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((part, i) => `<w:r>${rpr}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(part)}</w:t></w:r>`)
		.join('');
}

function runsXml(runs: Run[], rels: Rels, opts: { size?: number; bold?: boolean } = {}): string {
	return runs.map((r) => (r.link ? `<w:hyperlink r:id="${rels.link(r.link)}" w:history="1">${runXml(r, opts)}</w:hyperlink>` : runXml(r, opts))).join('');
}

const para = (inner: string, ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${inner}</w:p>`;
const spacing = (before: number, after: number) => `<w:spacing w:before="${before}" w:after="${after}"/>`;

const PAGE_W = 11906; // A4 in twips
const MARGIN = 1134; // 2 cm
const CONTENT_W = PAGE_W - 2 * MARGIN;

function tableXml(b: Extract<Block, { t: 'table' }>, rels: Rels): string {
	const total = b.widths.reduce((s, x) => s + x, 0) || 1;
	const cols = b.widths.map((x) => Math.round((x / total) * CONTENT_W));
	const border = (k: string) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="C9CED6"/>`;
	const cell = (inner: string, w: number, head: boolean) =>
		`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF0F4"/>' : ''}</w:tcPr>${inner}</w:tc>`;
	const head = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${b.headers
		.map((h, i) => cell(para(runsXml([{ text: h, bold: true }], rels, { size: 19 }), spacing(40, 40)), cols[i], true))
		.join('')}</w:tr>`;
	const rows = b.rows
		.map(
			(row) =>
				`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cols
					.map((w, i) => cell(para(runsXml(cellRuns(row[i] ?? ''), rels, { size: 19 }), spacing(40, 40)), w, false))
					.join('')}</w:tr>`
		)
		.join('');
	return `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols
		.map((w) => `<w:gridCol w:w="${w}"/>`)
		.join('')}</w:tblGrid>${head}${rows}</w:tbl>${para('', spacing(0, 120))}`;
}

function blockXml(b: Block, rels: Rels): string {
	switch (b.t) {
		case 'title':
			return (
				para(runsXml([{ text: b.text, bold: true }], rels, { size: 44 }), spacing(0, 60)) +
				(b.subtitle ? para(runsXml([{ text: b.subtitle, tone: 'muted' }], rels, { size: 20 }), spacing(0, 120)) : '') +
				para('', `<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="1" w:color="1C3861"/></w:pBdr>${spacing(0, 240)}`)
			);
		case 'meta':
			return b.rows
				.map((r) =>
					para(
						runsXml([{ text: `${r.label}: `, bold: true }], rels, { size: 21 }) + runsXml(r.value.length ? r.value : [{ text: '-', tone: 'muted' }], rels, { size: 21 }),
						spacing(0, 60)
					)
				)
				.join('') + para('', spacing(0, 60));
		case 'heading':
			return para(
				runsXml([{ text: b.text, bold: true, tone: 'accent' }], rels, { size: 28 }),
				`<w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="C9CED6"/></w:pBdr>${spacing(280, 120)}`
			);
		case 'item':
			return para(runsXml(b.runs, rels, { size: 23, bold: true }), `<w:keepNext/>${spacing(160, 40)}`);
		case 'para':
			return para(runsXml(b.runs, rels, { size: 20 }), `${spacing(0, 60)}${b.indent ? '<w:ind w:left="280"/>' : ''}`);
		case 'note':
			return para(runsXml([{ text: b.text, italic: true, tone: 'muted' }], rels, { size: 19 }), spacing(0, 80));
		case 'gap':
			return para('', spacing(0, 80));
		case 'pagebreak':
			return para('<w:r><w:br w:type="page"/></w:r>');
		case 'table':
			return tableXml(b, rels);
	}
}

// ---- tiny STORE zip ----
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: Array<{ name: string; data: string }>, now = new Date()): Uint8Array {
	const enc = new TextEncoder();
	const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
	const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	for (const f of files) {
		const name = enc.encode(f.name);
		const data = enc.encode(f.data);
		const crc = crc32(data);
		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, 20, true);
		lv.setUint16(6, 0x0800, true);
		lv.setUint16(8, 0, true);
		lv.setUint16(10, time, true);
		lv.setUint16(12, date, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, data.length, true);
		lv.setUint32(22, data.length, true);
		lv.setUint16(26, name.length, true);
		lv.setUint16(28, 0, true);
		local.set(name, 30);
		const cd = new Uint8Array(46 + name.length);
		const cv = new DataView(cd.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(4, 20, true);
		cv.setUint16(6, 20, true);
		cv.setUint16(8, 0x0800, true);
		cv.setUint16(10, 0, true);
		cv.setUint16(12, time, true);
		cv.setUint16(14, date, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, data.length, true);
		cv.setUint32(24, data.length, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, offset, true);
		cd.set(name, 46);
		chunks.push(local, data);
		central.push(cd);
		offset += local.length + data.length;
	}
	const cdSize = central.reduce((s, c) => s + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, files.length, true);
	ev.setUint16(10, files.length, true);
	ev.setUint32(12, cdSize, true);
	ev.setUint32(16, offset, true);
	const all = [...chunks, ...central, end];
	const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
	let p = 0;
	for (const c of all) {
		out.set(c, p);
		p += c.length;
	}
	return out;
}

export function renderDocx(doc: ReportDoc, now = new Date()): Uint8Array {
	const rels = new Rels();
	const body = doc.blocks.map((b) => blockXml(b, rels)).join('');
	const footer = `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="C9CED6"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${CONTENT_W}"/></w:tabs></w:pPr><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${xml(doc.footer)}</w:t></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:tab/><w:t xml:space="preserve">Page </w:t></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="5F6670"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
	const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="${PAGE_W}" w:h="16838"/><w:pgMar w:top="1134" w:right="${MARGIN}" w:bottom="1134" w:left="${MARGIN}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
	const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:color w:val="1A1C24"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
	const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${rels.list.join('')}</Relationships>`;
	const iso = now.toISOString().replace(/\.\d+Z$/, 'Z');
	const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(doc.title)}</dc:title><dc:creator>${xml(doc.author)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
	return zipStore(
		[
			{
				name: '[Content_Types].xml',
				data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`
			},
			{
				name: '_rels/.rels',
				data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`
			},
			{ name: 'word/document.xml', data: document },
			{ name: 'word/styles.xml', data: styles },
			{ name: 'word/footer1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${footer}` },
			{ name: 'word/_rels/document.xml.rels', data: docRels },
			{ name: 'docProps/core.xml', data: core }
		],
		now
	);
}
