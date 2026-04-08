import { describe, it } from "@std/testing/bdd";
import { superoak } from "superoak";
import { app, createDiscordRequest } from "./setup.ts";

describe("OEmbed Integration", () => {
    it("should return 400 Bad Request if missing the type parameter", async () => {
        const request = await superoak(app);
        await createDiscordRequest(request.get("/oembed.json?title=Test+Title"))
            .expect(400);
    });
});
