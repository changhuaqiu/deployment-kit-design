---
name: "systematic-debugging"
description: "Use when encountering ANY bug, test failure, or unexpected behavior. Enforces root-cause investigation BEFORE proposing fixes."
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Read stack traces completely
   - Note line numbers, file paths, error codes
2. **Reproduce Consistently**
   - Can you trigger it reliably?
3. **Check Recent Changes**
   - Git diff, recent commits
4. **Gather Evidence in Multi-Component Systems**
   - BEFORE proposing fixes, add diagnostic instrumentation (logs, echo statements)
   - Run once to gather evidence showing WHERE it breaks
5. **Trace Data Flow**
   - Where does bad value originate? What called this with bad value?

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples** (similar working code in codebase)
2. **Identify Differences** (between working and broken)
3. **Understand Dependencies** (config, environment, assumptions)

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - "I think X is the root cause because Y"
2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case** (MUST have before fixing)
2. **Implement Single Fix** (Address root cause, no bundled refactoring)
3. **Verify Fix** (Test passes now? No other tests broken?)

**If Fix Doesn't Work:**
- STOP
- Count: How many fixes have you tried?
- If < 3: Return to Phase 1
- **If ≥ 3: STOP and question the architecture**
- Discuss with your human partner before attempting more fixes. This is a wrong architecture, not a failed hypothesis.

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**

**ALL of these mean: STOP. Return to Phase 1.**

## Quick Reference

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
