import html2canvas from 'html2canvas';

/**
 * Aggressive sanitization for oklch/lab colors which crash html2canvas.
 * This should be used in the onclone callback of html2canvas.
 */
export const sanitizeClonedStyles = (clonedDoc: Document, clonedEl: HTMLElement) => {
    try {
        // Match modern color functions with potential slash for alpha
        const COLOR_REGEX = /(?:oklch|oklab|lab|lch)\(\s*([0-9.%]+)\s+([0-9.%]+)\s+([0-9.a-zA-Z%]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/g;
        const GENERIC_UNSUPPORTED = /((oklch|oklab|lab|lch|color)\([^)]+\))/g;

        const replaceColor = (match: string, p1: string, p2: string, p3: string, p4: string) => {
            let lum = parseFloat(p1);
            if (p1.endsWith('%')) lum /= 100;
            // lab lightness is 0-100, oklch is 0-1 (mostly)
            if (match.startsWith('lab') && lum > 1) {
                lum /= 100;
            }

            let hue = parseFloat(p3) || 0;
            if (p3 === 'none') hue = 0;

            let chr = parseFloat(p2) || 0;
            let sat = Math.min(100, chr * 400); // Rough approximation

            let alpha = 1;
            if (p4) {
                alpha = parseFloat(p4);
                if (p4.endsWith('%')) alpha /= 100;
            }

            return `hsla(${hue}, ${sat}%, ${lum * 100}%, ${alpha})`;
        };

        const sanitizeStr = (str: string) => {
            if (!str) return str;
            // First try to parse with our precise regex and convert to hsla
            let res = str.replace(COLOR_REGEX, replaceColor);
            // Any leftovers that we couldn't parse, fall back to a safe color to prevent crashes
            if (res && GENERIC_UNSUPPORTED.test(res)) {
                res = res.replace(GENERIC_UNSUPPORTED, 'rgba(128, 128, 128, 0.5)');
            }
            return res;
        };

        // 1. Process all style tags in the cloned document
        const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
        styleTags.forEach(tag => {
            if (tag.textContent && tag.textContent.includes('oklch')) {
                tag.textContent = sanitizeStr(tag.textContent);
            }
        });

        // 2. Process all elements and their properties
        const allElements = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))] as HTMLElement[];

        allElements.forEach(el => {
            // Get computed styles from the window to catch resolved CSS variables
            const compStyle = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(el) : null;

            const highRisk = ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'boxShadow', 'textShadow', 'backgroundImage', 'fill', 'stroke', 'outlineColor', 'textDecorationColor'];

            highRisk.forEach(prop => {
                let val = '';
                if (compStyle) {
                    val = compStyle[prop as any];
                }
                if (!val && el.style) {
                    val = (el.style as any)[prop];
                }

                if (val && typeof val === 'string' && val.match(/(oklch|lab|lch|color)\(/)) {
                    el.style.setProperty(
                        prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
                        sanitizeStr(val),
                        'important'
                    );
                }
            });

            // Iterate inline style properties
            if (el.style) {
                for (let i = 0; i < el.style.length; i++) {
                    const prop = el.style[i];
                    const val = el.style.getPropertyValue(prop);
                    if (val && val.match(/(oklch|lab|lch|color)\(/)) {
                        el.style.setProperty(prop, sanitizeStr(val), el.style.getPropertyPriority(prop) || 'important');
                    }
                }
            }
        });
    } catch (e) {
        console.warn("onclone processing failed:", e);
    }
};

/**
 * Helper to convert blob/object URLs to base64 data URLs for reliable capture.
 */
export const blobToDataUrl = (url: string): Promise<string> =>
    new Promise((resolve) => {
        try {
            if (url.startsWith('data:')) { resolve(url); return; }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 400;
                c.height = img.naturalHeight || 300;
                c.getContext('2d')!.drawImage(img, 0, 0);
                resolve(c.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = () => resolve(url);
            img.src = url;
        } catch { resolve(url); }
    });

/**
 * Robustly exports a DOM container to a precise A4 PDF, safely bypassing `html2canvas` 
 * rendering bugs related to `object-fit:cover` and CSS `oklch` color spaces.
 */
export const generatePDF = async (container: HTMLElement, title: string) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const pages = container.querySelectorAll('[data-page-index]');
    if (pages.length === 0) throw new Error("No pages found to export.");

    // 1. Pre-convert all blob URLs to base64
    const allImgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    const srcSet = new Set(allImgs.map(i => i.src).filter(Boolean));
    const srcMap: Record<string, string> = {};
    await Promise.all(Array.from(srcSet).map(async src => {
        srcMap[src] = await blobToDataUrl(src);
    }));

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Temporarily make the container visible but off-visible-viewport.
    // opacity:0 + zIndex:-100 prevents CSS layout from properly computing
    // element sizes — getBoundingClientRect() and offsetWidth return 0 in that state.
    const savedStyle = container.getAttribute('style') || '';
    container.style.cssText = `position: fixed; top: 0; left: -9999px; width: 1200px; opacity: 1; z-index: 9999; pointer-events: none;`;
    // Allow one paint cycle for layout to settle
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 400));


    for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;

        // 2. Pre-process DOM element images to canvases for reliable capture
        const images = page.querySelectorAll('img');
        const imageBackups: { img: HTMLImageElement; placeholder: HTMLCanvasElement }[] = [];

        await Promise.all(Array.from(images).map(async img => {
            try {
                // Ensure image is fully decoded before reading dimensions
                if (!img.complete) {
                    await img.decode().catch(() => { }); // non-throwing
                }

                // getBoundingClientRect is reliable even for opacity-0 fixed containers.
                // img.width / img.clientWidth can return 0 for CSS-sized images.
                const rect = img.getBoundingClientRect();
                let w = rect.width || img.clientWidth;
                let h = rect.height || img.clientHeight;

                // Last resort: inherit from the nearest page container
                if (!w || !h) {
                    const pageEl = img.closest('[data-page-index]') as HTMLElement | null;
                    w = pageEl?.offsetWidth || 300;
                    h = pageEl?.offsetHeight || 430;
                }

                const c = document.createElement('canvas');
                // Super-sampled for crisp retina quality in PDF
                const SCALE = 4;
                c.width = Math.round(w * SCALE);
                c.height = Math.round(h * SCALE);
                c.style.width = `${w}px`;
                c.style.height = `${h}px`;

                const ctx = c.getContext('2d');

                if (ctx && img.naturalWidth && img.naturalHeight) {
                    ctx.scale(SCALE, SCALE);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, w, h);

                    // object-fit: cover — center-crop the natural image to fill w×h
                    const iRatio = img.naturalWidth / img.naturalHeight;
                    const cRatio = w / h;
                    let sx: number, sy: number, sw: number, sh: number;
                    if (iRatio > cRatio) {
                        // Image is wider → crop sides
                        sh = img.naturalHeight;
                        sw = img.naturalHeight * cRatio;
                        sx = (img.naturalWidth - sw) / 2;
                        sy = 0;
                    } else {
                        // Image is taller → crop top/bottom
                        sw = img.naturalWidth;
                        sh = img.naturalWidth / cRatio;
                        sx = 0;
                        sy = (img.naturalHeight - sh) / 2;
                    }
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
                } else if (ctx && img.naturalWidth) {
                    ctx.scale(SCALE, SCALE);
                    ctx.drawImage(img, 0, 0, w, h);
                }

                // Preserve layout positioning from original img
                c.style.position = window.getComputedStyle(img).position;
                c.style.top = window.getComputedStyle(img).top;
                c.style.left = window.getComputedStyle(img).left;
                c.style.right = window.getComputedStyle(img).right;
                c.style.bottom = window.getComputedStyle(img).bottom;
                c.style.display = window.getComputedStyle(img).display;

                if (img.parentNode) {
                    img.parentNode.replaceChild(c, img);
                    imageBackups.push({ img, placeholder: c });
                }
            } catch { /* keep going */ }
        }));


        const videos = page.querySelectorAll('video');
        const videoBackups: { video: HTMLVideoElement; placeholder: HTMLCanvasElement }[] = [];

        videos.forEach(video => {
            try {
                const c = document.createElement('canvas');
                c.width = video.videoWidth || video.clientWidth || 400;
                c.height = video.videoHeight || video.clientHeight || 300;
                const ctx = c.getContext('2d');
                if (ctx) ctx.drawImage(video, 0, 0, c.width, c.height);
                c.style.cssText = window.getComputedStyle(video).cssText;
                c.style.width = '100%';
                c.style.height = '100%';
                c.style.objectFit = 'cover';
                if (video.parentNode) {
                    video.parentNode.replaceChild(c, video);
                    videoBackups.push({ video, placeholder: c });
                }
            } catch { /* skip */ }
        });

        await new Promise(r => setTimeout(r, 600)); // Layout settle
        sanitizeClonedStyles(document, page); // Pre-sanitize live DOM

        const canvas = await html2canvas(page, {
            scale: 4,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc, clonedEl) => {
                const clonedImgs = Array.from(clonedEl.querySelectorAll('img')) as HTMLImageElement[];
                clonedImgs.forEach(ci => {
                    const b64 = srcMap[ci.src];
                    if (b64) ci.src = b64;
                });
                sanitizeClonedStyles(clonedDoc, clonedEl);
            }
        });

        // 3. Perfect A4 math scaling without stretching
        const imgAspectRatio = canvas.width / canvas.height;
        const pageAspectRatio = pdfWidth / pdfHeight;

        let finalW = pdfWidth;
        let finalH = pdfHeight;
        let finalX = 0;
        let finalY = 0;

        if (imgAspectRatio > pageAspectRatio) {
            // Image is wider than A4 → Scale to width, center vertically
            finalH = pdfWidth / imgAspectRatio;
            finalY = (pdfHeight - finalH) / 2;
        } else {
            // Image is taller than A4 → Scale to height, center horizontally
            finalW = pdfHeight * imgAspectRatio;
            finalX = (pdfWidth - finalW) / 2;
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', finalX, finalY, finalW, finalH);

        // 4. Teardown
        imageBackups.forEach(({ img, placeholder }) => {
            if (placeholder.parentNode) placeholder.parentNode.replaceChild(img, placeholder);
        });
        videoBackups.forEach(({ video, placeholder }) => {
            if (placeholder.parentNode) placeholder.parentNode.replaceChild(video, placeholder);
        });
    }

    pdf.save(`${title.replace(/\s+/g, '-')}.pdf`);

    // Restore container to its original hidden style (React controls it after this)
    container.setAttribute('style', savedStyle);
};

