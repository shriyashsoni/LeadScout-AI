import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLeads = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").order("desc").collect();
  },
});

export const insertLead = mutation({
  args: {
    name: v.string(),
    email: v.union(v.string(), v.null()),
    domain: v.string(),
    source: v.string(),
    sourceUrl: v.string(),
    company: v.union(v.string(), v.null()),
    companySize: v.union(v.string(), v.null()),
    location: v.union(v.string(), v.null()),
    linkedin: v.union(v.string(), v.null()),
    twitter: v.union(v.string(), v.null()),
    reddit: v.union(v.string(), v.null()),
    intentScore: v.number(),
    intentLabel: v.string(),
    outreachDraft: v.string(),
    rawSnippet: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for duplicates (same email or same sourceUrl)
    const existing = await ctx.db
      .query("leads")
      .filter((q) => 
        q.or(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("sourceUrl"), args.sourceUrl)
        )
      )
      .first();

    if (existing && args.email !== null) {
      return existing._id;
    }

    return await ctx.db.insert("leads", args);
  },
});

export const clearLeads = mutation({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    for (const lead of leads) {
      await ctx.db.delete(lead._id);
    }
  },
});
