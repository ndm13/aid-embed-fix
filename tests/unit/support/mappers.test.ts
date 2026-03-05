import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { contentMapper } from "@/src/support/mappers.ts";
import { mockAdventure } from "../../mocks/data.ts";

describe("Mappers", () => {
    it("should map adventure visibility", () => {
        let adventure = mockAdventure({ unlisted: false, published: true });
        let mapped = contentMapper.adventure(adventure);
        assertEquals(mapped.visibility, "Published");

        adventure = mockAdventure({ unlisted: true, published: false });
        mapped = contentMapper.adventure(adventure);
        assertEquals(mapped.visibility, "Unlisted");
    });
});
