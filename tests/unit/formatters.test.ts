import { describe, it } from "@std/testing/bdd";
import { assertEquals } from "@std/assert";
import formatters from "../../src/logging/formatters.ts";

describe("Log Formatters Unit Tests", () => {
    it("should safely format an independent unassigned Javascript object directly via JSON.stringify", () => {
        const rawObject = { foo: "bar", id: 12345 };
        const result = formatters.format(rawObject);
        assertEquals(result, '{"foo":"bar","id":12345}');
    });

    it("should format string natively unmutated", () => {
        assertEquals(formatters.format("Standard system boot!"), "Standard system boot!");
    });
});
