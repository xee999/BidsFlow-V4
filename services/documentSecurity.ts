import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Service to handle document security features like watermarking
 */
export const documentSecurity = {
    /**
     * Stamped a confidential watermark on a PDF
     * @param pdfBuffer The original PDF buffer
     * @param userName The name of the user downloading the document
     * @returns The watermarked PDF buffer
     */
    applyWatermark: async (pdfBuffer: ArrayBuffer, userName: string): Promise<Uint8Array> => {
        try {
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const dateStr = new Date().toLocaleString();
            
            const watermarkText = `CONFIDENTIAL - BidsFlow Internal Use Only`;
            const userText = `Downloaded by ${userName} on ${dateStr}`;

            for (const page of pages) {
                const { width, height } = page.getSize();
                
                // Add diagonal watermark in the center
                page.drawText(watermarkText, {
                    x: width / 10,
                    y: height / 2,
                    size: 30,
                    font: font,
                    color: rgb(0.8, 0.8, 0.8),
                    opacity: 0.3,
                    rotate: { angle: 45, type: 'degrees' as any },
                });

                // Add footer watermark
                page.drawText(userText, {
                    x: 50,
                    y: 20,
                    size: 10,
                    font: font,
                    color: rgb(0.5, 0.5, 0.5),
                    opacity: 0.6,
                });
            }

            return await pdfDoc.save();
        } catch (error) {
            console.error('Watermarking failed:', error);
            // Return original buffer if watermarking fails as a fallback, 
            // but in production we might want to throw an error
            return new Uint8Array(pdfBuffer);
        }
    }
};
