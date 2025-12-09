import { AppState } from "../types/AppState.ts";
import config from "../config.ts";

export class RelatedLinks {
  constructor(private readonly ctx: Context<AppState>) {}

  cover(image: string) {
    const betterImage = this.ctx.request.url.searchParams.get("bi");
    if (betterImage) return betterImage;
    try {
      const url = new URL(image);
      const split = url.pathname.split("/");
      const last = split[split.length - 1];
      // Check if the last segment is a UUID
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          last.toLowerCase(),
        )
      ) {
        return image + "/public";
      }
    } catch {
      // invalid URL, ignore
    }
    return image;
  }

  oembed(params: Record<string, string>) {
    return `${config.network.oembedProtocol}://${this.ctx.request.url.host}/oembed.json?${
      new URLSearchParams(params).toString()
    }`;
  }

  redirect(passKeys: string[]) {
    const linkParams = this.ctx.request.url.searchParams.entries()
      .filter(([k, _]) => passKeys.includes(k))
      .reduce((a, [k, v]) => {
        a.set(k, v);
        return a;
      }, new URLSearchParams());
    return this.redirectBase +
      this.ctx.request.url.pathname +
      (linkParams.size > 0 ? "?" + linkParams.toString() : "");
  }

  get redirectBase() {
    const host = this.ctx.request.url.host;
    if (host.startsWith("play.")) return "https://play.aidungeon.com";
    if (host.startsWith("beta.")) return "https://beta.aidungeon.com";
    if (host.startsWith("alpha.")) return "https://alpha.aidungeon.com";
    return config.client.origin;
  }
}
