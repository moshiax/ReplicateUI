chrome.action.onClicked.addListener((tab) => {

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: downloadCompleteHTML
  });
});


async function downloadCompleteHTML() {

  async function fetchResource(url, isBinary = false) {
    try {
      const response = await fetch(url);
      if (isBinary) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        return await response.text();
      }
    } catch (error) {
      console.warn('Failed to fetch resource:', url);
      return '';
    }
  }

  async function inlineCSS(linkElement) {
    const href = linkElement.href;
    const cssContent = await fetchResource(href);

    const resolvedCSS = cssContent.replace(/url\((?!['"]?(?:data|https?|ftp):)['"]?([^'")]+)['"]?\)/g, (match, relativeUrl) => {
      const absoluteUrl = new URL(relativeUrl, href).href;
      return `url(${absoluteUrl})`;
    });

    const styleElement = document.createElement('style');
    styleElement.textContent = resolvedCSS;
    return styleElement;
  }

  async function inlineImages(element) {
    const images = element.querySelectorAll('img');
    for (let img of images) {
      if (img.src.startsWith('http')) {
        const dataUri = await fetchResource(img.src, true);
        img.src = dataUri; 
      }
    }
  }

  const html = document.documentElement.outerHTML;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const linkElements = [...doc.querySelectorAll('link[rel="stylesheet"]')];
  for (let link of linkElements) {
    const inlineStyleElement = await inlineCSS(link);
    link.replaceWith(inlineStyleElement);
  }

  await inlineImages(doc);

  const finalHTML = doc.documentElement.outerHTML;

  const downloadHTML = (content, fileName) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: "text/html" });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  downloadHTML(finalHTML, "index.html");
}
