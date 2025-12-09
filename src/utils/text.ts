export function trimDescription(text: string) {
    const limit = 1000;
    if (text.length < limit) return text;
    const paragraphs = text.split('\n');
    let result = '';
    let p = 0;
    for (; p < paragraphs.length && paragraphs[p].length + result.length < limit; p++)
        result += result === '' ? paragraphs[p] : '\n' + paragraphs[p];
    if (p < paragraphs.length) {
        const sentences = paragraphs[p].split('. ');
        for (let s = 0; s < sentences.length && sentences[s].length + result.length < limit; s++) {
            result += result === '' ? sentences[s] : '. ' + sentences[s];
        }
        result += '...';
    }
    return result;
}

export function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}