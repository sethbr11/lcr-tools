/**
 * Empty stand-in for jsPDF's optional html2canvas, DOMPurify, and canvg dependencies.
 * They are only loaded by jsPDF's HTML/SVG rendering, which LCR Tools does not use, and bundling
 * them would add innerHTML assignments that Firefox AMO review flags. See wxt.config.ts.
 */
export default null;
