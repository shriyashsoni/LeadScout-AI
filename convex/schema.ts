import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leads: defineTable({
    name: v.string(),
    email: v.union(v.string(), v.null()),
    domain: v.string(),
    source: v.string(), // google | reddit | twitter | apollo
    sourceUrl: v.string(),
    company: v.union(v.string(), v.null()),
    companySize: v.union(v.string(), v.null()),
    location: v.union(v.string(), v.null()),
    linkedin: v.union(v.string(), v.null()),
    twitter: v.union(v.string(), v.null()),
    reddit: v.union(v.string(), v.null()),
    intentScore: v.number(), // 1-10
    intentLabel: v.string(), // hot | warm | cold
    outreachDraft: v.string(),
    rawSnippet: v.string(),
    createdAt: v.number(),
  }),
});
