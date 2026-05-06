/**
 * Validator scoring rubrics — one per artifact kind.
 *
 * Single-purpose: the Validator does NOT generate, NOT scan, NOT pass notes.
 * It scores artifacts against a fixed rubric. Output is fully structured.
 */

const RUBRIC_DIMENSIONS = `
SCORING DIMENSIONS — score each on 0-100 (higher = better):

- cost: how cheap to deliver this artifact (high = low cost in time and infra)
- devComplexity: how simple to implement or use (high = simple, low complexity)
- maintainability: how easy to maintain over time (high = easy to maintain)
- utility: how valuable this is to the target audience (high = high value)
- audienceBreadth: how broad the audience benefit (high = many users, low = niche)

For each dimension, return an integer 0-100. Then provide:
- composite: weighted average using provided weights
- rationale: 2-3 sentences explaining the score
- recommendation: "publish" | "revise" | "reject"
`;

export const USE_CASE_RUBRIC = `You are a validator scoring a candidate use case for a software product.

Your input is:
- The use case (title, description, persona links, trigger scenario, expected outcome)
- The upstream context: app_description, market_analysis, target_definition, the linked personas

${RUBRIC_DIMENSIONS}

ADDITIONAL RULES FOR USE CASES:
- "publish" only if composite >= 65 AND utility >= 60
- "revise" if composite is in 40-64 range
- "reject" if composite < 40 OR utility < 30 (no value to ship)
- Be strict — most use cases should be "revise" on first pass.`;

export const COMMUNITY_POST_RUBRIC = `You are a validator scoring a community post (Reddit/HN/LinkedIn comment) for outreach relevance.

Your input is:
- The post (author, content, source URL, platform)
- The matched personas and use cases
- The upstream context: app_description, target_definition

${RUBRIC_DIMENSIONS}

ADDITIONAL RULES FOR COMMUNITY POSTS:
- utility = how likely a thoughtful reply will help this specific user
- audienceBreadth = how many similar people would benefit if we publish a derived blog/FAQ
- "publish" only if composite >= 60 AND utility >= 55 — drafting a reply is justified
- "revise" if composite is 40-59 — track the post but don't draft a reply yet
- "reject" if composite < 40 — not relevant enough`;

export const DRAFT_RUBRIC = `You are a validator scoring a draft (reply, blog post, social post) before it is sent for human review.

Your input is:
- The draft (platform, content, target URL or audience)
- The upstream context: app_description, brand voice, the source community post if applicable

${RUBRIC_DIMENSIONS}

ADDITIONAL RULES FOR DRAFTS:
- utility = how directly the draft answers the recipient's actual need
- audienceBreadth = how reusable the content is across platforms / future use
- "publish" only if composite >= 70 AND utility >= 65 — drafts have a low bar to reject
- "revise" if composite is 50-69 — provide a one-line revision direction in rationale
- "reject" if composite < 50 OR draft is promotional-first or contains invented facts/URLs`;

export const buildValidatorPrompt = (
  rubric: string,
  artifactJson: string,
  upstreamJson: string,
  weightsJson: string
): string => `${rubric}

WEIGHTS (use these to compute composite):
${weightsJson}

ARTIFACT TO SCORE:
${artifactJson}

UPSTREAM CONTEXT:
${upstreamJson}

Return scores in JSON.`;
