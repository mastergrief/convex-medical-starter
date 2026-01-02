# Claude Code Statusline Guide

## Clean, Accurate Information Only

The statusline displays **only what's actually available** from the Claude Code API.

## Reading the Statusline

```
[Opus] ⎇ main S1 M20 ?111 +1178/-0 ⏱ 16m42s 🧠9 ❤️ ⚡ 19:18
  ^      ^      ^   ^   ^      ^        ^      ^  ^  ^    ^
  |      |      |   |   |      |        |      |  |  |    |
Model   Git  Staged Mod Untr Lines  Duration Mem Health Eff Time
```

## Component Breakdown

### Model `[Opus]`
- **Magenta/Bold** = Opus (most capable)
- **Cyan** = Sonnet (balanced)
- **Green** = Haiku (efficient)

### Git Status `⎇ main S1 M20 ?111`
- **Branch**: Color indicates branch type
  - Green: main/master
  - Blue: feature/*
  - Yellow: fix/*, hotfix/*
  - Cyan: other
- **S#** = Staged files
- **M#** = Modified files
- **?#** = Untracked files
- **clean** = No changes

### Lines Changed `+1178/-0`
- **Green +** = Lines added
- **Red -** = Lines removed

### Duration `⏱ 16m42s`
- Tracks session length
- **Green**: < 30 seconds
- **Yellow**: < 2 minutes
- **Red**: > 2 minutes

### Memory Count `🧠9`
- Number of Serena memories in project
- Stored in `.serena/memories/`

### Project Health `❤️`
Based on code quality metrics:
- **❤️ Green** = Healthy (>80% score)
- **💛 Yellow** = Moderate (>60%)
- **🩹 Yellow** = Needs attention (>40%)
- **💔 Red** = Critical (<40%)

Checks for:
- Placeholder components ("ComingSoon")
- TODO/FIXME count
- TypeScript errors

### API Efficiency `⚡`
Ratio of API time to total time:
- **⚡ Green** = Efficient (<10% API time)
- **⚡ Yellow** = Moderate (<30%)
- **🐌 Red** = Inefficient (>30%)

### Current Time `19:18`
- Shows current time for session tracking
- Helpful for long sessions

## What's NOT Available

The Claude Code API does **not** provide:
- **Token counts** (input/output/total)
- **Context usage** (would be just guessing)
- **Remaining context space**
- **Token consumption rate**

For cost tracking, use the `ccusage` command instead.

## Terminal Compatibility

If you see garbled characters:

```bash
# Enable ASCII-only mode
export CLAUDE_STATUSLINE_ASCII=true
```

## Customization

Edit `.claude/statusline.py` to:
- Change colors
- Add/remove components
- Adjust thresholds
- Add custom metrics

The statusline updates every 300ms with real data from the Claude Code session.

---

**Philosophy**: Show only what's real and accurate. No estimates, no guesses, just facts.