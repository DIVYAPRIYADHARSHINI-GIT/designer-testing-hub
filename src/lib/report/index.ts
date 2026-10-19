import { buildReport, type ReportRequest } from './build.ts';
import { renderDocx } from './docx.ts';
import { renderPdf } from './pdf.ts';

export { buildReport, reportFileName, reporterOf } from './build.ts';
export type { ReportFormat, ReportKind, ReportRequest } from './build.ts';

export const MIME = {
	pdf: 'application/pdf',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
} as const;

/** Builds the report and renders it as PDF or DOCX bytes. */
export function generateReport(req: ReportRequest): { bytes: Uint8Array; fileName: string; mime: string } {
	const doc = buildReport(req);
	const bytes = req.format === 'docx' ? renderDocx(doc) : renderPdf(doc);
	return { bytes, fileName: `${doc.fileBase}.${req.format}`, mime: MIME[req.format] };
}
