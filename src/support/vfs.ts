import { Context } from "@oak/oak";
import { serveDir } from "@std/http/file-server";
import { fromFileUrl } from "@std/path";
import { Loader } from "npm:nunjucks";

export async function serveStatic(ctx: Context<any>, vfsPath: string, rewritePath?: string, fallbackIndex?: string) {
    const fsRoot = fromFileUrl(new URL(vfsPath, import.meta.url));
    const url = new URL(ctx.request.url.href);
    if (rewritePath !== undefined) {
        url.pathname = rewritePath;
    }
    const req = new Request(url.href, ctx.request.source);

    let res = await serveDir(req, {
        fsRoot,
        showIndex: true,
    });

    if (res.status === 404 && fallbackIndex) {
        // Discard the 404 body
        await res.body?.cancel();
        
        const fallbackUrl = new URL(fallbackIndex, url.href);
        const fallbackReq = new Request(fallbackUrl.href, ctx.request.source);
        res = await serveDir(fallbackReq, {
            fsRoot,
            showIndex: true,
        });
    }

    ctx.response.status = res.status;
    ctx.response.headers = res.headers;
    ctx.response.body = res.body;
}

export function nunjucksVfsLoader(path: string) {
    return {
        getSource(name: string) {
            try {
                const templatePath = new URL(`${path}/${name}`, import.meta.url);
                return {
                    src: Deno.readTextFileSync(templatePath),
                    path: templatePath.href,
                    noCache: false
                };
            } catch (_e) {
                return null as any;
            }
        }
    } as Loader
}
